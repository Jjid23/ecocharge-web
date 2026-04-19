import { motion, AnimatePresence } from "motion/react";
import { Recycle, Zap, QrCode, BatteryCharging, Leaf, ShieldCheck, LogIn, LogOut, User as UserIcon, Coins, History, ArrowRight, Loader2, Search, ArrowLeft, MoreHorizontal, Settings, Camera, Lightbulb, Sparkles, Smartphone, CheckCircle, Info, RefreshCw, HelpCircle, ShieldAlert } from "lucide-react";
import { useState, useEffect, useRef, type ReactNode } from "react";
import { auth, db } from "./lib/firebase";
import { analyzeBottle, type BottleAnalysis } from "./services/geminiService";
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  signInAnonymously,
  User as FirebaseUser 
} from "firebase/auth";
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  increment, 
  serverTimestamp, 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  Timestamp
} from "firebase/firestore";

interface UserProfile {
  userId: string;
  displayName: string;
  email: string;
  credits: number;
  bottlesRecycled: number;
  lastActive: string;
}

interface Transaction {
  transactionId: string;
  userId: string;
  bottlesCount: number;
  creditsEarned: number;
  timestamp: Timestamp;
}

type KioskStep = 'LANDING' | 'LINK_APP' | 'CONNECTING' | 'WELCOME' | 'ACTIVE_SESSION' | 'SCANNING' | 'TROUBLESHOOT';

function handleFirestoreError(error: any, operation: string, path: string | null = null) {
  if (error?.code === 'permission-denied') {
    const errorInfo = {
      error: "Missing or insufficient permissions",
      operationType: operation,
      path: path,
      authInfo: {
        userId: auth.currentUser?.uid || 'anonymous',
        email: auth.currentUser?.email || 'N/A',
        emailVerified: auth.currentUser?.emailVerified || false,
        isAnonymous: auth.currentUser?.isAnonymous || false,
        providerInfo: auth.currentUser?.providerData.map(p => ({
          providerId: p.providerId,
          displayName: p.displayName || '',
          email: p.email || ''
        })) || []
      }
    };
    throw new Error(JSON.stringify(errorInfo));
  }
  throw error;
}

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [recycling, setRecycling] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [step, setStep] = useState<KioskStep>('LANDING');
  const [mode, setMode] = useState<'CHARGE' | 'CREDIT'>('CHARGE');
  const [scanningProgress, setScanningProgress] = useState(0);
  const [analysis, setAnalysis] = useState<BottleAnalysis | null>(null);
  const analysisRef = useRef<BottleAnalysis | null>(null);

  const updateAnalysis = (newAnalysis: BottleAnalysis | null) => {
    setAnalysis(newAnalysis);
    analysisRef.current = newAnalysis;
  };
  const [lastScannedBrand, setLastScannedBrand] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'IDLE' | 'SYNCING' | 'SUCCESS'>('IDLE');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          await syncUser(u);
        } catch (e) {
          console.error("Sync failed", e);
        }
      } else {
        setProfile(null);
        setTransactions([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user && step === 'ACTIVE_SESSION') {
      const q = query(
        collection(db, "transactions"),
        where("userId", "==", user.uid),
        orderBy("timestamp", "desc"),
        limit(5)
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const txs = snapshot.docs.map(doc => ({
          transactionId: doc.id,
          ...(doc.data() as any)
        })) as Transaction[];
        setTransactions(txs);
      });
      return () => unsubscribe();
    }
  }, [user, step]);

  useEffect(() => {
    if (user) {
      const unsubscribe = onSnapshot(doc(db, "users", user.uid), (doc) => {
        if (doc.exists()) {
          setProfile(doc.data() as UserProfile);
        }
      });
      return () => unsubscribe();
    }
  }, [user]);

  // Handle Scanning Simulation & Camera & AI
  useEffect(() => {
    let stream: MediaStream | null = null;
    let analysisTimeout: NodeJS.Timeout | null = null;
    
    if (step === 'SCANNING') {
      updateAnalysis(null);
      setScanningProgress(0);
      
      const startCamera = async () => {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 640 } } 
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(e => console.log("Auto-play blocked, waiting for interaction", e));
            
            // Start analysis polling immediately
            if (analysisTimeout) clearTimeout(analysisTimeout);
            analysisTimeout = setTimeout(performAIAnalysis, 1000);
          }
        } catch (err) {
          console.error("Ideal camera constraints failed, trying fallback...", err);
          try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              videoRef.current.play().catch(e => console.log("Fallback auto-play blocked", e));
              if (analysisTimeout) clearTimeout(analysisTimeout);
              analysisTimeout = setTimeout(performAIAnalysis, 1000);
            }
          } catch (fallbackErr) {
            console.error("Camera access denied or unavailable", fallbackErr);
            setErrorDetails("OPTICS_FAILURE: Camera access was denied. Please check your browser privacy settings and ensure permissions are granted.");
          }
        }
      };

      const performAIAnalysis = async () => {
        if (!videoRef.current || !canvasRef.current || videoRef.current.videoWidth === 0 || videoRef.current.readyState < 2) {
          // Retry more aggressively if hardware isn't quite ready
          analysisTimeout = setTimeout(performAIAnalysis, 300);
          return;
        }
        
        const canvas = canvasRef.current;
        const video = videoRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;
        
        // Optimize: Draw at a consistent analysis size (512x512 is plenty for Vision AI)
        const analysisSize = 512;
        canvas.width = analysisSize;
        canvas.height = analysisSize;
        
        ctx.drawImage(video, 0, 0, analysisSize, analysisSize);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7); // Slightly lower quality for faster upload
        const base64Chunks = dataUrl.split(',');
        if (base64Chunks.length < 2) return;
        
        const base64 = base64Chunks[1];
        const result = await analyzeBottle(base64);
        
        // If the sensor is still "warming up", retry in 400ms (faster loop)
        if (result.reason.includes("warming up")) {
          analysisTimeout = setTimeout(performAIAnalysis, 400);
          return;
        }

        updateAnalysis(result);
      };

      startCamera();

      const interval = setInterval(() => {
        setScanningProgress(prev => {
          // Use ref to avoid stale closure issues in the interval
          const currentAnalysis = analysisRef.current;
          
          // If we hit 95% and don't have a valid analysis yet, hang there for the sensor
          if (prev >= 95 && (!currentAnalysis || currentAnalysis.reason.includes("warming up"))) {
            return 95;
          }

          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(() => {
              processScanningResult(); // Enforce AI verification before rewards
              setScanningProgress(0);
            }, 1000);
            return 100;
          }
          return prev + 1;
        });
      }, 50);
      
      return () => {
        clearInterval(interval);
        if (analysisTimeout) clearTimeout(analysisTimeout);
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
      };
    }
  }, [step]);

  const syncUser = async (u: FirebaseUser) => {
    const userRef = doc(db, "users", u.uid);
    try {
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) {
        const newProfile: UserProfile = {
          userId: u.uid,
          displayName: u.displayName || "Guest",
          email: u.email || "",
          credits: 0,
          bottlesRecycled: 0,
          lastActive: new Date().toISOString()
        };
        await setDoc(userRef, newProfile);
        setProfile(newProfile);
      } else {
        setProfile(userDoc.data() as UserProfile);
      }
    } catch (e) {
      handleFirestoreError(e, 'syncUser', `users/${u.uid}`);
    }
  };

  const processScanningResult = async () => {
    if (!analysis || analysis.type === 'REJECTED' || analysis.type === 'UNKNOWN') {
      const displayReason = analysis?.reason === 'No bottle detected' ? 'No bottle detected' : (analysis?.reason || 'No bottle detected');
      const tip = analysis?.tip ? `\nTip: ${analysis.tip}` : '';
      setErrorDetails(`NOTICE: ${displayReason}.${tip}\nPlease ensure the bottle is clearly visible in the scanner area.`);
      setStep('ACTIVE_SESSION');
      setRecycling(false);
      return;
    }

    const bottles = 1;
    const credits = mode === 'CHARGE' ? 12 : 10; // Bonus for Charge mode (incentive)
    const isDemo = profile?.userId.startsWith('demo_');

    try {
      if (isDemo || !user) {
        const txId = "local_" + Math.random().toString(36).substring(7);
        const demoTx: Transaction = {
          transactionId: txId,
          userId: profile?.userId || "anonymous",
          bottlesCount: bottles,
          creditsEarned: credits,
          timestamp: Timestamp.now()
        };
        setTransactions(prev => [demoTx, ...prev]);
        setProfile(prev => prev ? {
          ...prev,
          credits: prev.credits + credits,
          bottlesRecycled: prev.bottlesRecycled + bottles
        } : null);
      } else {
        const transactionsRef = collection(db, "transactions");
        const newTxRef = doc(transactionsRef);
        await setDoc(newTxRef, {
          transactionId: newTxRef.id,
          userId: user.uid,
          kioskId: "EC-042",
          bottlesCount: bottles,
          creditsEarned: credits,
          timestamp: serverTimestamp()
        });
        await updateDoc(doc(db, "users", user.uid), {
          credits: increment(credits),
          bottlesRecycled: increment(bottles),
          lastActive: new Date().toISOString()
        });
      }
      if (analysis.brand) setLastScannedBrand(analysis.brand);
      
      // Update Mobile App State via Firestore Notification
      if (user) {
        setSyncStatus('SYNCING');
        try {
          const notificationRef = collection(db, "users", user.uid, "notifications");
          await addDoc(notificationRef, {
            type: 'RECYCLE_CONFIRMATION',
            title: 'Recycling Confirmed!',
            message: `You earned ${credits} credits from a ${analysis.type} bottle.`,
            brand: analysis.brand || 'Unknown',
            credits: credits,
            timestamp: serverTimestamp(),
            read: false,
            kioskId: 'EC-042'
          });
          setSyncStatus('SUCCESS');
          setTimeout(() => setSyncStatus('IDLE'), 3000);
        } catch (e) {
          console.error("Failed to notify mobile app", e);
        }
      }
      
      setStep('ACTIVE_SESSION');
    } catch (error: any) {
      console.error("Scanning process failed", error);
      setErrorDetails("SYSTEM_ERROR: Verification failed at completion. Please notify staff.");
    } finally {
      setRecycling(false);
      setAnalysis(null);
    }
  };

  const simulateRecycle = () => {
    if (recycling) return;
    setStep('SCANNING');
    setRecycling(true);
    setErrorDetails(null);
  };

  const handleStart = () => {
    if (user || profile?.userId.startsWith('demo_')) setStep('ACTIVE_SESSION');
    else setStep('LINK_APP');
  };

  const handleBack = () => {
    if (step === 'LINK_APP') setStep('LANDING');
    else if (step === 'CONNECTING') setStep('LINK_APP');
    else if (step === 'WELCOME') setStep('CONNECTING');
    else if (step === 'ACTIVE_SESSION') {
      if (user) signOut(auth);
      setProfile(null);
      setStep('LANDING');
    }
  };

  const handleLinkSuccess = () => {
    setStep('CONNECTING');
    setTimeout(() => {
      setStep('WELCOME');
    }, 2000);
  };

  const login = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      setErrorDetails(null);
    } catch (error: any) {
      console.error("Login failed:", error);
      if (error?.code === 'auth/admin-restricted-operation') {
        setErrorDetails("Google Login is restricted. Please check your Firebase Console configuration.");
      }
    }
  };

  const loginAnonymously = async () => {
    try {
      await signInAnonymously(auth);
      setStep('WELCOME');
    } catch (error: any) {
      if (error?.code === 'auth/admin-restricted-operation') {
         console.warn("DIAGNOSTIC: Firebase Anonymous Auth is disabled. Engaging Local Persistence (Demo Mode). To fix, enable 'Anonymous' in your Firebase Console > Auth > Sign-in method.");
      } else {
         console.error("Guest login failed:", error);
      }
      
      // Intentional Fallback: Allow user to proceed with local state
      const mockUid = "demo_" + Math.random().toString(36).substring(7);
      const mockProfile: UserProfile = {
        userId: mockUid,
        displayName: "Guest Voyager",
        email: "guest@ecocharge.internal",
        credits: 0,
        bottlesRecycled: 0,
        lastActive: new Date().toISOString()
      };
      setProfile(mockProfile);
      setStep('WELCOME');
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-brand-background">
        <Loader2 className="w-12 h-12 text-brand-green animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-brand-background text-white flex flex-col font-sans overflow-hidden select-none">
      {/* Kiosk Header */}
      <header className="px-10 py-8 flex justify-between items-center bg-brand-background/90 backdrop-blur-sm border-b border-brand-card/50">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 flex items-center justify-center">
            <Recycle className="text-brand-green w-10 h-10" />
          </div>
          <div>
            <h1 className="font-display font-bold text-2xl tracking-tight text-white leading-none">EcoCharge</h1>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600/60 mt-2">Kiosk Station</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {profile && (
            <div className="flex flex-col items-end mr-2">
               <div className="flex items-center gap-1.5 text-brand-green">
                 <Coins className="w-4 h-4" />
                 <span className="font-mono font-bold text-lg leading-none">{profile.credits}</span>
               </div>
               <span className="text-[8px] font-bold uppercase tracking-widest text-white/30">Sync active</span>
            </div>
          )}
          {profile && (
            <div className="w-10 h-10 bg-brand-green/20 rounded-full border border-brand-green/40 flex items-center justify-center font-bold text-brand-green">
              {profile?.displayName?.[0] || 'A'}
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center px-10 relative">
        <AnimatePresence mode="wait">
          {step === 'TROUBLESHOOT' && (
            <motion.div
              key="troubleshoot"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-white rounded-[2.5rem] p-10 text-brand-background space-y-8 shadow-2xl overflow-y-auto max-h-[80vh]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-red-100 rounded-2xl">
                    <Settings className="w-6 h-6 text-red-600" />
                  </div>
                  <h2 className="text-3xl font-display font-bold">Troubleshooting</h2>
                </div>
                <button 
                  onClick={() => setStep('LANDING')}
                  className="p-3 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <ArrowLeft className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <div className="space-y-6 text-left">
                <TroubleshootSection 
                  title="Optical Sensor (Camera) Issues"
                  items={[
                    { title: "Clean the lens", desc: "Use a soft microfiber cloth to wipe the sensor area. Dust can block identification." },
                    { title: "Check Lighting", desc: "Ensure the bottle is directed towards the kiosk's internal lights for a clear scan." },
                    { title: "Positioning", desc: "Hold the bottle 10-15cm away from the sensor. Do not obstruct the label with your hand." }
                  ]}
                />

                <TroubleshootSection 
                  title="Identification Failures"
                  items={[
                    { title: "Accepted Types", desc: "This kiosk only accepts PET and HDPE plastic. Glass, metal, or paper will be rejected." },
                    { title: "Label Clarity", desc: "Ensure the recycling symbol or barcode is visible to the AI sensor." },
                    { title: "Empty Bottles", desc: "Partially full bottles cannot be weighted and scanned correctly. Please empty contents first." }
                  ]}
                />

                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-start gap-4">
                  <div className="p-2 bg-brand-green/20 rounded-xl">
                    <RefreshCw className="w-5 h-5 text-brand-green" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-sm">System Reset</p>
                    <p className="text-xs text-slate-500">If the sensor remains unresponsive, return to the start screen to recalibrate the hardware.</p>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => {
                  setErrorDetails(null);
                  setStep('LANDING');
                }}
                className="w-full py-4 bg-brand-background text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-brand-card transition-colors"
              >
                Return to Start
              </button>
            </motion.div>
          )}

          {step === 'LANDING' && (
            <motion.div
              key="landing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl flex flex-col items-center text-center space-y-12"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-brand-green/20 blur-[60px] rounded-full scale-150" />
                <div className="w-48 h-48 sm:w-64 sm:h-64 rounded-full bg-gradient-to-b from-brand-emerald to-brand-background border-4 border-white/5 flex items-center justify-center relative glow-green overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_70%)] from-brand-green/10" />
                  <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Recycle001.svg/1200px-Recycle001.svg.png" alt="Recycle Logo" referrerPolicy="no-referrer" className="w-40 h-40 object-contain filter drop-shadow-2xl brightness-110 active:scale-110 transition-transform" />
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="text-6xl sm:text-7xl font-display font-bold text-white tracking-tight leading-none uppercase">
                  Recycle.<br />
                  <span className="text-brand-green">Charge.</span>
                </h2>
                <p className="text-white/40 text-lg max-w-md mx-auto font-medium">
                  Drop your plastic bottles. Earn credits. Charge your phone — completely free.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 w-full">
                {[
                  { icon: <Recycle className="w-5 h-5 text-red-100" />, label: "PET - HDPE", sublabel: "Accepted", color: "bg-brand-card", delay: 0.3 },
                  { icon: <Zap className="w-5 h-5 text-yellow-400" />, label: "4 Chargers", sublabel: "Ports", color: "bg-brand-card", delay: 0.4 },
                  { icon: <Leaf className="w-5 h-5 text-brand-green" />, label: "Go Green", sublabel: "Impact", color: "bg-brand-card", delay: 0.5 }
                ].map((card, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: card.delay }}
                  >
                    <LandingCard {...card} />
                  </motion.div>
                ))}
              </div>

              <motion.button 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                onClick={handleStart}
                className="w-full py-6 bg-brand-green text-white rounded-[2rem] font-bold text-3xl flex items-center justify-center gap-4 glow-green-strong hover:bg-emerald-500 transition-all active:scale-95"
              >
                Touch to Start
                <ArrowRight className="w-8 h-8" />
              </motion.button>

              <div className="space-y-6 w-full">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/20">Scan · Deposit · Charge</p>
              </div>
            </motion.div>
          )}

          {step === 'LINK_APP' && (
            <motion.div
              key="link"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-md flex flex-col items-center text-center space-y-10"
            >
              <div className="w-20 h-20 rounded-full bg-brand-emerald border border-brand-green/40 flex items-center justify-center glow-green">
                <Leaf className="w-10 h-10 text-brand-green" />
              </div>

              <div className="space-y-2">
                <h2 className="text-4xl font-display font-bold">Link your App</h2>
                <p className="text-white/40 text-lg">Scan with the EcoCharge mobile app</p>
              </div>

              <div className="p-8 bg-white rounded-[2.5rem] w-full aspect-square flex flex-col items-center justify-center relative overflow-hidden group shadow-[0_0_50px_rgba(255,255,255,0.1)]">
                <div className="absolute inset-0 bg-brand-green/5 animate-pulse" />
                <QrCode className="w-full h-full text-brand-background p-4 relative z-10" />
                <div className="absolute bottom-6 left-0 right-0 text-center z-10">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Scan to <span className="text-brand-green">Auto-Sync</span> Points</p>
                </div>
                {/* Simulated Scan Trigger */}
                <div className="absolute inset-0 bg-transparent cursor-crosshair z-20" onClick={handleLinkSuccess} />
              </div>

              <div className="space-y-4 w-full">
                <p className="text-white/40 text-sm">Open EcoCharge and tap <span className="text-white font-bold">"Scan Kiosk"</span> to link your account.</p>
                <button 
                  onClick={loginAnonymously}
                  className="w-full py-5 border border-white/10 rounded-2xl font-bold text-xl hover:bg-white/5 transition-all text-white/80"
                >
                  Continue as Guest
                </button>
                <button onClick={handleBack} className="w-full py-5 bg-brand-card rounded-2xl font-bold text-xl flex items-center justify-center gap-2 text-white/60 hover:text-white transition-colors">
                  <ArrowLeft className="w-5 h-5" /> Back
                </button>
              </div>
            </motion.div>
          )}

          {step === 'CONNECTING' && (
            <motion.div
              key="connecting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-md bg-white rounded-[2.5rem] p-12 flex flex-col items-center text-center space-y-8 text-brand-background"
            >
              <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center border-4 border-slate-50 shadow-inner">
                <Search className="w-12 h-12 text-slate-400 animate-pulse" />
              </div>
              <div className="space-y-6 w-full">
                <h2 className="text-3xl font-display font-bold">Waiting for your phone..</h2>
                <div className="flex justify-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-brand-green animate-bounce" style={{ animationDelay: '0s' }} />
                  <div className="w-4 h-4 rounded-full bg-brand-green animate-bounce" style={{ animationDelay: '0.2s' }} />
                  <div className="w-4 h-4 rounded-full bg-slate-200" />
                </div>
                <p className="text-slate-400 text-sm font-medium">Keep your phone screen on and near the kiosk.</p>
              </div>
            </motion.div>
          )}

          {step === 'WELCOME' && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-md flex flex-col items-center text-center space-y-10"
            >
              <div className="bg-white rounded-[2.5rem] p-12 w-full flex flex-col items-center space-y-8 relative overflow-hidden">
                <div className="w-24 h-24 rounded-full bg-brand-green/20 border-2 border-brand-green/40 flex items-center justify-center relative">
                   <UserIcon className="w-14 h-14 text-emerald-600" />
                   <div className="absolute inset-0 bg-brand-green rounded-full opacity-20 blur-xl animate-pulse" />
                </div>
                <div className="space-y-4 text-brand-background">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Signed in as</p>
                  <h3 className="text-4xl font-display font-bold">{profile?.displayName || 'Guest'}</h3>
                  <div className="flex items-center justify-center gap-2 text-brand-green">
                    <Recycle className="w-5 h-5" />
                    <span className="font-bold">EcoCharge</span>
                  </div>
                </div>
              </div>

              <div className="space-y-8 w-full">
                <div className="space-y-2">
                  <h2 className="text-5xl font-display font-bold leading-tight">Welcome back, <br /><span className="text-brand-green">Guest!</span></h2>
                  <p className="text-white/20 text-sm font-bold uppercase tracking-widest">Auto-continues in 2s...</p>
                </div>
                
                <button 
                  onClick={() => setStep('ACTIVE_SESSION')}
                  className="w-full py-6 bg-brand-green text-white rounded-[2rem] font-bold text-3xl flex items-center justify-center gap-4 glow-green-strong hover:bg-emerald-500 transition-all shadow-2xl shadow-brand-green/30"
                >
                  Let's Go
                  <ArrowRight className="w-8 h-8" />
                </button>

                <button onClick={handleBack} className="w-full py-5 bg-brand-card rounded-2xl font-bold text-xl flex items-center justify-center gap-2 text-white/60 hover:text-white transition-colors">
                  <ArrowLeft className="w-5 h-5" /> Back
                </button>
              </div>
            </motion.div>
          )}

          {step === 'ACTIVE_SESSION' && (
            <motion.div
              key="session"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-xl flex flex-col items-center text-center space-y-10"
            >
              <div className="bg-white rounded-[2.5rem] p-12 w-full flex flex-col items-center space-y-8 relative overflow-hidden text-brand-background">
                 <div className="w-32 h-32 rounded-[2rem] bg-emerald-50 flex items-center justify-center border-2 border-brand-green/20">
                    <Recycle className="w-20 h-20 text-emerald-900 filter drop-shadow-sm" />
                 </div>
                 <div className="space-y-2">
                   <h2 className="text-4xl font-display font-bold">Insert your plastic bottle</h2>
                   <p className="text-slate-400 text-xl font-medium animate-pulse">Waiting for bottle...</p>
                   {syncStatus !== 'IDLE' && (
                     <div className="text-brand-green text-xs font-bold mt-2 font-mono">
                       {syncStatus === 'SYNCING' ? 'SYNCING TO PHONE...' : 'SYNCED TO PHONE!'}
                     </div>
                   )}
                    {lastScannedBrand && (
                      <div className="mt-4 p-4 bg-brand-green/10 border border-brand-green/20 rounded-2xl animate-in fade-in zoom-in duration-500">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-brand-green mb-1">Last Detected</p>
                        <p className="text-2xl font-display font-black text-brand-green uppercase tracking-tight">
                          {lastScannedBrand}
                        </p>
                      </div>
                    )}
                 </div>
              </div>

              <div className="flex bg-brand-emerald/40 rounded-full p-2 border border-brand-green/20">
                <button 
                  onClick={() => setMode('CHARGE')}
                  className={`px-6 py-3 rounded-full flex items-center gap-3 transition-all ${mode === 'CHARGE' ? 'bg-yellow-400 text-brand-background' : 'text-white/40'}`}
                >
                  <Zap className="w-5 h-5" />
                  <span className="font-bold">Charge mode</span>
                </button>
                <button 
                  onClick={() => setMode('CREDIT')}
                  className={`px-6 py-3 rounded-full flex items-center gap-3 transition-all ${mode === 'CREDIT' ? 'bg-brand-green text-white' : 'text-white/40'}`}
                >
                  <Coins className="w-5 h-5" />
                  <span className="font-bold">Credit mode</span>
                </button>
              </div>

              <div className="space-y-4 w-full">
                <div className="flex flex-col gap-4">
                  <button 
                    onClick={simulateRecycle}
                    className="w-full py-6 bg-brand-green text-white rounded-[2rem] font-bold text-3xl flex items-center justify-center gap-4 glow-green hover:bg-emerald-500 transition-all"
                  >
                    Scan Bottle Manually
                  </button>
                  <button onClick={handleBack} className="w-full py-5 bg-brand-card rounded-2xl font-bold text-xl flex items-center justify-center gap-2 text-white/60 hover:text-white transition-colors border border-white/5">
                    <ArrowLeft className="w-5 h-5" /> Back
                  </button>
                </div>
                
                {transactions.length > 0 && (
                  <div className="pt-8 space-y-4 text-left w-full">
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/20 px-2">Session History</p>
                    <div className="grid grid-cols-1 gap-2">
                      {transactions.map(tx => (
                        <div key={tx.transactionId} className="bg-brand-card p-4 rounded-2xl border border-white/5 flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                               <Recycle className="w-4 h-4 text-brand-green" />
                            </div>
                            <div>
                              <p className="text-sm font-bold">Bottle Recycled</p>
                              <p className="text-[10px] text-white/30 truncate max-w-[100px]">{tx.transactionId}</p>
                            </div>
                          </div>
                          <div className="text-right">
                             <p className="text-brand-green font-bold">+{tx.creditsEarned}</p>
                             <p className="text-[8px] font-bold uppercase tracking-widest text-white/20">Credits</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {step === 'SCANNING' && (
            <motion.div
              key="scanning"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-md bg-white rounded-[2.5rem] p-12 flex flex-col items-center text-center space-y-8 text-brand-background shadow-2xl relative overflow-hidden"
            >
              <div className="w-full aspect-square rounded-3xl bg-slate-950 border-2 border-brand-green/20 relative overflow-hidden shadow-inner flex items-center justify-center">
                <video 
                   ref={videoRef} 
                   autoPlay 
                   playsInline 
                   muted 
                   className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                />
                <canvas ref={canvasRef} className="hidden" />
                
                {/* Scanner UI Overlay */}
                <div className="absolute inset-0 bg-brand-green/5 pointer-events-none" />
                <div className="absolute inset-8 border border-brand-green/30 rounded-2xl pointer-events-none">
                   <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-brand-green" />
                   <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-brand-green" />
                   <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-brand-green" />
                   <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-brand-green" />
                </div>

                {/* Low Confidence Target Highlight */}
                {analysis && analysis.confidence < 0.7 && analysis.type !== 'REJECTED' && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ 
                      opacity: [0.2, 0.4, 0.2],
                      scale: [1, 1.05, 1],
                      borderColor: ['rgba(234, 179, 8, 0.3)', 'rgba(234, 179, 8, 0.6)', 'rgba(234, 179, 8, 0.3)']
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-16 border-4 border-dashed rounded-[3rem] z-10 flex items-center justify-center pointer-events-none"
                  >
                    <div className="bg-yellow-500/10 backdrop-blur-[2px] rounded-full p-4">
                      <Search className="w-8 h-8 text-yellow-500/50" />
                    </div>
                  </motion.div>
                )}

                 {/* AI Analysis Overlay */}
                <AnimatePresence>
                  {analysis && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute bottom-4 left-4 right-4 bg-brand-background/90 backdrop-blur-lg p-4 rounded-2xl border border-brand-green/30 z-20 shadow-2xl"
                    >
                      <div className="flex items-center justify-between mb-3">
                         <div className="flex items-center gap-2">
                           <div className={`p-1 rounded-lg ${analysis.type === 'REJECTED' ? 'bg-red-500/20' : 'bg-brand-green/20'}`}>
                             <ShieldCheck className={`w-3 h-3 ${analysis.type === 'REJECTED' ? 'text-red-500' : 'text-brand-green'}`} />
                           </div>
                           <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Vision Intelligence</span>
                         </div>
                         <div className="flex items-center gap-3">
                           <div className="flex flex-col items-end">
                              <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.1em]">AI Confidence</span>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-mono font-bold ${analysis.confidence > 0.8 ? 'text-brand-green' : 'text-yellow-500'}`}>
                                  {Math.round(analysis.confidence * 100)}%
                                </span>
                                <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden">
                                  <motion.div 
                                    className={`h-full ${analysis.confidence > 0.8 ? 'bg-brand-green' : 'bg-yellow-500'}`}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${analysis.confidence * 100}%` }}
                                    transition={{ duration: 0.5 }}
                                  />
                                </div>
                              </div>
                           </div>
                         </div>
                      </div>

                      {/* Prominent Tip Display */}
                      {(analysis.tip || analysis.confidence < 0.7) && analysis.confidence < 0.8 && (
                        <motion.div 
                          initial={{ scale: 0.95, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="mb-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-center gap-3"
                        >
                          <div className="p-1.5 bg-yellow-500 rounded-lg shrink-0">
                            <Lightbulb className="w-3 h-3 text-brand-background" />
                          </div>
                          <p className="text-[11px] font-bold text-yellow-200 leading-tight text-left">
                            <span className="uppercase text-[9px] block opacity-60 mb-0.5">Optimization Tip</span>
                            {analysis.confidence < 0.7 
                              ? 'Try to position the bottle within the highlighted area for better detection'
                              : analysis.tip}
                          </p>
                        </motion.div>
                      )}

                      <p className="text-white text-xs font-semibold leading-relaxed text-left opacity-90">{analysis.reason}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Prominent Brand Badge */}
                <AnimatePresence>
                  {analysis?.brand && analysis.type !== 'REJECTED' && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5, y: -40 }}
                      animate={{ opacity: 1, scale: 1.1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      className="absolute top-12 left-0 right-0 z-30 flex justify-center pointer-events-none px-4"
                    >
                      <div className="relative group">
                        <div className="absolute inset-0 bg-brand-green blur-2xl opacity-40 rounded-full animate-pulse" />
                        <div className="relative bg-brand-background/90 backdrop-blur-xl px-10 py-4 rounded-[2rem] border-2 border-brand-green shadow-[0_0_50px_rgba(34,197,94,0.6)] flex flex-col items-center gap-1">
                           <div className="flex items-center gap-3">
                             <Sparkles className="w-4 h-4 text-brand-green animate-bounce" />
                             <span className="text-white font-display font-black text-3xl uppercase tracking-[0.2em] drop-shadow-[0_2px_10px_rgba(34,197,94,0.5)]">
                               {analysis.brand}
                             </span>
                             <Sparkles className="w-4 h-4 text-brand-green animate-bounce" />
                           </div>
                           <div className="h-1 w-2/3 bg-gradient-to-r from-transparent via-brand-green to-transparent opacity-50 rounded-full" />
                           <span className="text-[10px] font-black text-brand-green uppercase tracking-[0.3em] mt-1">Identified Brand</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                
                <motion.div 
                  initial={{ top: "0%" }}
                  animate={{ top: "100%" }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute left-0 right-0 h-0.5 bg-brand-green shadow-[0_0_15px_rgba(34,197,94,1)] z-10" 
                />
                
                {!videoRef.current?.srcObject && (
                  <div className="relative z-0 flex flex-col items-center gap-3 text-white/20 p-6">
                    <Camera className="w-16 h-16 animate-pulse" />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-center">
                      {errorDetails?.includes('Optics') ? 'Optics Hardware Failure' : 'Initializing Optics...'}
                    </p>
                    {errorDetails?.includes('Optics') && (
                      <p className="text-[8px] opacity-50 max-w-[150px]">Please ensure camera permissions are granted and you are using HTTPS.</p>
                    )}
                  </div>
                )}
              </div>
              
              <div className="space-y-6 w-full">
                <h2 className="text-3xl font-display font-bold leading-tight">Analyzing Deposit...</h2>
                <div className="space-y-4">
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-brand-green"
                      initial={{ width: 0 }}
                      animate={{ width: `${scanningProgress}%` }}
                    />
                  </div>
                  <p className="text-slate-400 text-sm font-medium">Scanning with Gemini Vision AI...</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Maintenance Overlay */}
        {maintenanceMode && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-brand-background/95 backdrop-blur-xl flex flex-col items-center justify-center p-10 text-center"
          >
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-32 h-32 bg-yellow-500/10 rounded-[3rem] flex items-center justify-center border-2 border-yellow-500/20 mb-8"
            >
              <ShieldAlert className="w-16 h-16 text-yellow-500 animate-pulse" />
            </motion.div>
            <h1 className="text-5xl font-display font-black text-white mb-4 uppercase tracking-tighter">System Offline</h1>
            <p className="text-slate-400 text-xl max-w-md leading-relaxed mb-12">
              This kiosk is currently undergoing scheduled maintenance to ensure elite performance. We will be back shortly.
            </p>
            <div className="p-6 bg-brand-card rounded-[2rem] border border-white/5 space-y-2">
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em]">Maintenance Status</p>
              <p className="text-brand-green font-mono font-bold">CALIBRATING OPTICAL SENSORS...</p>
            </div>
            {isAdmin && (
              <button 
                onClick={() => setMaintenanceMode(false)}
                className="mt-8 text-white/40 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest border border-white/10 px-6 py-2 rounded-full"
              >
                Exit Maintenance Mode
              </button>
            )}
          </motion.div>
        )}

        {/* Global Error Banner */}
        {errorDetails && (
          <div className="absolute top-10 left-10 right-10 z-[100]">
            <motion.div 
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-red-500 text-white rounded-2xl p-6 shadow-2xl flex items-center justify-between border-2 border-red-400"
            >
               <div className="flex items-center gap-4">
                 <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center font-bold">!</div>
                 <div className="flex flex-col">
                   <p className="font-bold text-sm leading-tight">{errorDetails}</p>
                   <button 
                    onClick={() => setStep('TROUBLESHOOT')}
                    className="text-[10px] font-bold uppercase tracking-widest text-white/60 mt-2 flex items-center gap-1 hover:text-white transition-colors"
                   >
                     <HelpCircle className="w-3 h-3" /> Get Troubleshooting Help
                   </button>
                 </div>
               </div>
               <div className="flex items-center gap-2">
                 <button onClick={() => setErrorDetails(null)} className="px-4 py-2 bg-black/20 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-black/30 transition-colors">Dismiss</button>
               </div>
            </motion.div>
          </div>
        )}
      </main>

      {/* Footer Navigation (Mock) */}
      <footer className="px-10 py-10 flex flex-col items-center gap-6">
         <div className="w-full max-w-sm flex gap-2">
            {[1, 2, 3].map(i => (
              <div key={i} className={`flex-1 h-2 rounded-full transition-all duration-500 ${
                (step === 'LANDING' && i === 1) || 
                ((step === 'LINK_APP' || step === 'CONNECTING' || step === 'WELCOME') && i === 2) ||
                ((step === 'ACTIVE_SESSION' || step === 'SCANNING') && i === 3)
                ? 'bg-brand-green' : 'bg-brand-card'
              }`} />
            ))}
         </div>
         <button 
           onClick={() => {
             const count = (window as any).adminClicks || 0;
             (window as any).adminClicks = count + 1;
             if (count + 1 >= 5) {
               setIsAdmin(true);
               setMaintenanceMode(true);
               (window as any).adminClicks = 0;
             }
           }}
           className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/10 hover:text-white/30 transition-colors"
         >
           Kiosk Terminal v4.2.0 • EC-042
         </button>
      </footer>
    </div>
  );
}

function LandingCard({ icon, label, sublabel, color }: { icon: ReactNode, label: string, sublabel: string, color: string }) {
  return (
    <div className={`${color} p-4 rounded-3xl border border-white/5 flex flex-col items-center gap-2 hover:bg-white/5 transition-colors cursor-default group`}>
       <div className="p-2 rounded-xl bg-white/5 group-hover:scale-110 transition-transform">{icon}</div>
       <div className="text-center">
         <p className="text-[10px] font-bold text-white tracking-tighter sm:tracking-normal">{label}</p>
         <p className="text-[8px] font-bold uppercase tracking-widest text-emerald-600/40">{sublabel}</p>
       </div>
    </div>
  );
}

function TroubleshootSection({ title, items }: { title: string, items: { title: string, desc: string }[] }) {
  return (
    <div className="space-y-4">
      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 px-2">{title}</h3>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-4">
            <div className="w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[10px] font-bold shrink-0">{i + 1}</div>
            <div className="space-y-0.5">
              <p className="font-bold text-sm">{item.title}</p>
              <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
