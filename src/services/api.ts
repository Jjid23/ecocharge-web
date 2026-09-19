/**
 * api.ts — All HTTP calls go to the SmartEVCharging .NET backend.
 *
 * URL resolution:
 *  - Local dev  : Vite proxy forwards /api/* → http://localhost:5225
 *  - Vercel prod: vercel.json rewrites /api/* → Railway backend URL
 *  - Override   : set VITE_API_URL env var to point anywhere
 *
 * JWT token is read from localStorage key "ecocharge_token" and attached
 * as a Bearer Authorization header on every authenticated request.
 */

import {
  User,
  BottleTransaction,
  ChargingPort,
  ChargingSession,
  PointTransaction,
  SystemSettings,
  BottleSize,
  PortStatus,
  DetectionResult
} from '../types';

// ── Base URL ──────────────────────────────────────────────────────────────────
// Empty string = use relative /api/* paths (works with Vite proxy + Vercel rewrites)
const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

function apiUrl(path: string): string {
  return API_BASE + path;
}

// ── Token helpers ─────────────────────────────────────────────────────────────

function getToken(): string | null {
  return localStorage.getItem('ecocharge_token');
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // .NET backend returns { error: "..." } or { message: "..." } on errors
    const msg = (data as any).error ?? (data as any).message ?? `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

// ── Shape of what .NET returns ────────────────────────────────────────────────

interface NetUser {
  userId: string;
  fullName: string;
  username: string;
  email: string;
  phoneNumber?: string;
  role: string;
  currentPoints: number;
  createdAt: string;
  updatedAt: string;
  // android compat fields (ignored by web)
  creditsSeconds?: number;
  bottlesDepositedTotal?: number;
}

interface AuthEnvelope {
  message: string;
  token: string;
  user: NetUser;
}

// Map .NET user → web User type
function mapUser(u: NetUser): User {
  return {
    userId:        u.userId,
    fullName:      u.fullName,
    username:      u.username,
    email:         u.email,
    currentPoints: u.currentPoints,
    role:          (u.role === 'admin' ? 'admin' : 'user'),
    createdAt:     u.createdAt,
    updatedAt:     u.updatedAt
  };
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function registerUser(payload: {
  fullName: string;
  username: string;
  email: string;
  password: string;
}): Promise<{ message: string; user: User }> {
  const res = await fetch(apiUrl('/api/auth/register'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await handleResponse<AuthEnvelope>(res);
  // Token can be at top level OR inside user object (AuthResponse also has Token)
  const token = data.token ?? (data.user as any)?.token;
  if (token) localStorage.setItem('ecocharge_token', token);
  // currentPoints comes from the user object — ensure we read it
  const netUser: NetUser = {
    ...data.user,
    currentPoints: data.user?.currentPoints ?? 20  // fallback to welcome bonus
  };
  return { message: data.message, user: mapUser(netUser) };
}

export async function loginUser(payload: {
  identifier: string;
  password: string;
}): Promise<{ message: string; user: User }> {
  const res = await fetch(apiUrl('/api/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await handleResponse<AuthEnvelope>(res);
  const token = data.token ?? (data.user as any)?.token;
  if (token) localStorage.setItem('ecocharge_token', token);
  const netUser: NetUser = {
    ...data.user,
    currentPoints: data.user?.currentPoints ?? 0
  };
  return { message: data.message, user: mapUser(netUser) };
}

export async function fetchCurrentUser(userId: string): Promise<{ user: User }> {
  const res = await fetch(apiUrl(`/api/auth/me/${userId}`), {
    headers: authHeaders()
  });
  const data = await handleResponse<{ user: NetUser }>(res);
  return { user: mapUser(data.user) };
}

export async function updateUserProfile(
  userId: string,
  payload: {
    fullName?: string;
    username?: string;
    email?: string;
    currentPassword?: string;
    newPassword?: string;
  }
): Promise<{ message: string; user: User }> {
  const res = await fetch(apiUrl(`/api/auth/profile/${userId}`), {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(payload)
  });
  const data = await handleResponse<{ message: string; user: NetUser }>(res);
  return { message: data.message, user: mapUser(data.user) };
}

// ── Bottle detection ──────────────────────────────────────────────────────────

export async function detectAndAwardBottle(payload: {
  userId: string;
  bottleSize: BottleSize;
  quantity?: number;
  bottleType?: string;
  imageData?: string;
}): Promise<{
  message: string;
  transaction: BottleTransaction;
  earnedPoints: number;
  newBalance: number;
}> {
  const res = await fetch(apiUrl('/api/bottle/detect'), {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      userId:     payload.userId,
      bottleSize: payload.bottleSize,
      quantity:   payload.quantity ?? 1,
      bottleType: payload.bottleType,
      imageData:  payload.imageData ?? null
    })
  });
  return handleResponse(res);
}

export async function analyzeBottleImageYolo(imageData: string): Promise<DetectionResult> {
  try {
    const res = await fetch(apiUrl('/api/bottle/analyze-image'), {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ imageData })
    });

    // Handle server sleeping (Render free tier)
    if (!res.ok) {
      if (res.status >= 500 || res.status === 0) {
        throw new Error('⏳ Detection server is waking up. Please wait 30 seconds and try again.');
      }
      throw new Error(`Detection failed (HTTP ${res.status}). Please try again.`);
    }

    const data = await res.json().catch(() => null);

    // YOLO server returned a response
    if (data && data.isBottle && data.bestLabel && data.bestLabel !== 'none') {
      return {
        bottleSize:    (data.bottleSize ?? 'medium') as BottleSize,
        bottleType:    data.bottleType  ?? `${data.detectedLabel ?? data.bestLabel} PET Plastic`,
        confidence:    data.confidence  ?? data.bestConfidence ?? 0.01,
        pointsEarned:  data.pointsEarned ?? 3,
        detectedAt:    new Date().toISOString(),
        detectedLabel: data.detectedLabel ?? data.bestLabel ?? 'unknown'
      };
    }

    // No bottle detected
    return {
      bottleSize:    'medium' as BottleSize,
      bottleType:    'No bottle detected',
      confidence:    0,
      pointsEarned:  0,
      detectedAt:    new Date().toISOString(),
      detectedLabel: 'none'
    };
  } catch (err) {
    console.error('[YOLO] analyzeBottleImageYolo error:', err);
    throw err;
  }
}

// Keep old Gemini function as no-op alias for backwards compat
export async function analyzeBottleImageGemini(imageData: string): Promise<DetectionResult> {
  return analyzeBottleImageYolo(imageData);
}

// ── Charging ports ────────────────────────────────────────────────────────────

function normalizePortStatus(s: string | undefined): PortStatus {
  const v = (s ?? '').toLowerCase();
  if (v === 'in use' || v === 'occupied') return 'In Use';
  if (v === 'maintenance') return 'Maintenance';
  if (v === 'disabled' || v === 'offline') return 'Disabled';
  return 'Available';
}

export async function fetchChargingPorts(): Promise<{ ports: ChargingPort[] }> {
  const res = await fetch(apiUrl('/api/ports'), { headers: authHeaders() });
  const data = await handleResponse<{ ports: any[] }>(res);
  const ports: ChargingPort[] = data.ports.map(p => ({
    portId:           p.portId   ?? p.id,
    portNumber:       p.portNumber,
    portStatus:       normalizePortStatus(p.portStatus),
    connectorType:    p.connectorType,
    updatedAt:        p.updatedAt,
    currentUserId:    p.currentUserId,
    currentSessionId: p.currentSessionId
  }));
  return { ports };
}

// ── Charging sessions ─────────────────────────────────────────────────────────

export async function startChargingSession(payload: {
  userId: string;
  portId: string;
  durationMinutes: number;
}): Promise<{
  message: string;
  session: ChargingSession;
  port: ChargingPort;
  remainingPoints: number;
}> {
  const res = await fetch(apiUrl('/api/charging/start'), {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload)
  });
  const data = await handleResponse<any>(res);
  return {
    message:        data.message,
    session:        mapSession(data.session),
    port:           mapPort(data.port),
    remainingPoints: data.remainingPoints
  };
}

export async function stopChargingSession(
  sessionId: string
): Promise<{ message: string; session: ChargingSession }> {
  const res = await fetch(apiUrl(`/api/charging/stop/${sessionId}`), {
    method: 'POST',
    headers: authHeaders()
  });
  const data = await handleResponse<any>(res);
  return { message: data.message, session: mapSession(data.session) };
}

export async function fetchActiveChargingSession(
  userId: string
): Promise<{ activeSession: ChargingSession | null }> {
  const res = await fetch(apiUrl(`/api/charging/active/${userId}`), {
    headers: authHeaders()
  });
  const data = await handleResponse<{ activeSession: any | null }>(res);
  return {
    activeSession: data.activeSession ? mapSession(data.activeSession) : null
  };
}

// ── History ───────────────────────────────────────────────────────────────────

export async function fetchRecyclingHistory(
  userId: string
): Promise<{ transactions: BottleTransaction[] }> {
  const res = await fetch(apiUrl(`/api/history/recycling/${userId}`), {
    headers: authHeaders()
  });
  const data = await handleResponse<{ transactions: any[] }>(res);
  const transactions: BottleTransaction[] = (data.transactions ?? []).map(t => ({
    transactionId:   t.transactionId,
    userId:          t.userId,
    userFullName:    t.userFullName,
    bottleSize:      t.bottleSize as BottleSize,
    bottleType:      t.bottleType,
    quantity:        t.quantity ?? 1,
    pointsEarned:    t.pointsEarned ?? 0,
    detectionStatus: (t.detectionStatus ?? 'Verified') as any,
    detectedAt:      t.detectedAt,
    confidenceScore: t.confidenceScore ?? 0.97
  }));
  return { transactions };
}

export async function fetchChargingHistory(
  userId: string
): Promise<{ sessions: ChargingSession[] }> {
  const res = await fetch(apiUrl(`/api/history/charging/${userId}`), {
    headers: authHeaders()
  });
  const data = await handleResponse<{ sessions: any[] }>(res);
  return { sessions: data.sessions.map(mapSession) };
}

export async function fetchPointsHistory(
  userId: string
): Promise<{ transactions: PointTransaction[] }> {
  const res = await fetch(apiUrl(`/api/history/points/${userId}`), {
    headers: authHeaders()
  });
  const data = await handleResponse<{ transactions: any[] }>(res);
  const transactions: PointTransaction[] = (data.transactions ?? []).map(t => ({
    pointTransactionId: t.pointTransactionId,
    userId:             t.userId,
    transactionType:    (t.transactionType ?? 'Deducted') as any,
    pointsAdded:        t.pointsAdded ?? 0,
    pointsDeducted:     t.pointsDeducted ?? 0,
    balanceAfter:       t.balanceAfter ?? 0,
    description:        t.description ?? '',
    createdAt:          t.createdAt
  }));
  return { transactions };
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export async function fetchAdminStats(): Promise<{
  stats: any;
  recentBottles: BottleTransaction[];
  recentSessions: ChargingSession[];
}> {
  const res = await fetch(apiUrl('/api/admin/stats'), { headers: authHeaders() });
  return handleResponse(res);
}

export async function fetchAdminUsers(): Promise<{ users: User[] }> {
  const res = await fetch(apiUrl('/api/admin/users'), { headers: authHeaders() });
  const data = await handleResponse<{ users: any[] }>(res);
  const users: User[] = (data.users ?? []).map(u => ({
    userId:        u.userId,
    fullName:      u.fullName  ?? u.username ?? '',
    username:      u.username  ?? '',
    email:         u.email     ?? '',
    currentPoints: u.currentPoints ?? 0,
    role:          (u.role === 'admin' || u.role === '1' || u.role === 1) ? 'admin' : 'user',
    createdAt:     u.createdAt ?? '',
    updatedAt:     u.updatedAt ?? u.createdAt ?? ''
  }));
  return { users };
}

export async function updateAdminUserPoints(
  userId: string,
  pointsAdjustment: number,
  reason: string
): Promise<{ user: User }> {
  const res = await fetch(apiUrl(`/api/admin/users/${userId}/points`), {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ pointsAdjustment, reason })
  });
  const data = await handleResponse<{ user: NetUser }>(res);
  return { user: mapUser(data.user) };
}

export async function updateAdminPortStatus(
  portId: string,
  portStatus: PortStatus,
  connectorType?: string
): Promise<{ port: ChargingPort }> {
  const res = await fetch(apiUrl(`/api/admin/ports/${portId}/status`), {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ portStatus, connectorType })
  });
  const data = await handleResponse<{ port: any }>(res);
  return { port: mapPort(data.port) };
}

export async function fetchAdminSettings(): Promise<{ settings: SystemSettings }> {
  const res = await fetch(apiUrl('/api/admin/settings'), { headers: authHeaders() });
  return handleResponse(res);
}

export async function updateAdminSettings(
  settings: Partial<SystemSettings>
): Promise<{ settings: SystemSettings }> {
  const res = await fetch(apiUrl('/api/admin/settings'), {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(settings)
  });
  return handleResponse(res);
}

export async function fetchAdminRecyclingLogs(): Promise<{
  transactions: BottleTransaction[];
}> {
  const res = await fetch(apiUrl('/api/admin/transactions/recycling'), {
    headers: authHeaders()
  });
  const data = await handleResponse<{ transactions: any[] }>(res);
  const transactions: BottleTransaction[] = (data.transactions ?? []).map(t => ({
    transactionId:   t.transactionId,
    userId:          t.userId,
    userFullName:    t.userFullName ?? t.userId,
    bottleSize:      (t.bottleSize ?? 'medium') as BottleSize,
    bottleType:      t.bottleType ?? 'PET Clear Plastic',
    quantity:        t.quantity ?? 1,
    pointsEarned:    t.pointsEarned ?? 0,
    detectionStatus: (t.detectionStatus ?? 'Verified') as any,
    detectedAt:      t.detectedAt ?? t.createdAt ?? new Date().toISOString(),
    confidenceScore: t.confidenceScore ?? 0.97
  }));
  return { transactions };
}

export async function fetchAdminChargingLogs(): Promise<{
  sessions: ChargingSession[];
}> {
  const res = await fetch(apiUrl('/api/admin/transactions/charging'), {
    headers: authHeaders()
  });
  const data = await handleResponse<{ sessions: any[] }>(res);
  return { sessions: (data.sessions ?? []).map(mapSession) };
}

// ── Local mappers ─────────────────────────────────────────────────────────────

function mapSession(s: any): ChargingSession {
  return {
    sessionId:       s.sessionId,
    userId:          s.userId,
    userFullName:    s.userFullName,
    portId:          s.portId,
    portNumber:      s.portNumber,
    connectorType:   s.connectorType,
    durationMinutes: s.durationMinutes,
    pointsUsed:      s.pointsUsed,
    startTime:       s.startTime,
    endTime:         s.endTime,
    sessionStatus:   s.sessionStatus,
    remainingSeconds: s.remainingSeconds
  };
}

function mapPort(p: any): ChargingPort {
  return {
    portId:           p.portId,
    portNumber:       p.portNumber,
    portStatus:       normalizePortStatus(p.portStatus),
    connectorType:    p.connectorType,
    updatedAt:        p.updatedAt,
    currentUserId:    p.currentUserId,
    currentSessionId: p.currentSessionId
  };
}

// ── ESP32 Device / Kiosk ──────────────────────────────────────────────────────

export async function fetchDeviceStatus(): Promise<any> {
  const res = await fetch(apiUrl('/api/device/status'), { headers: authHeaders() });
  return handleResponse(res);
}

export async function fetchDeviceHistory(count = 60): Promise<any> {
  const res = await fetch(apiUrl(`/api/device/history?count=${count}`), { headers: authHeaders() });
  return handleResponse(res);
}

export async function setRelayCommand(
  portNumber: number,
  activate: boolean,
  durationSeconds = 0
): Promise<any> {
  const res = await fetch(apiUrl(`/api/device/relay/${portNumber}`), {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ portNumber, activate, durationSeconds })
  });
  return handleResponse(res);
}

// ── Session resume ────────────────────────────────────────────────────────────

export async function fetchResumableSessions(userId: string): Promise<{ resumableSessions: ResumableSession[] }> {
  const res = await fetch(apiUrl(`/api/charging/resumable/${userId}`), { headers: authHeaders() });
  return handleResponse(res);
}

export async function resumeSession(sessionId: string): Promise<{
  message: string;
  session: ChargingSession;
  port: ChargingPort;
  remainingPoints: number;
}> {
  const res = await fetch(apiUrl(`/api/charging/resume/${sessionId}`), {
    method: 'POST',
    headers: authHeaders()
  });
  const data = await handleResponse<any>(res);
  return {
    message:        data.message,
    session:        mapSession(data.session),
    port:           mapPort(data.port),
    remainingPoints: data.remainingPoints
  };
}

export interface ResumableSession {
  sessionId:        string;
  portNumber:       number;
  remainingSeconds: number;
  remainingMinutes: number;
  pointsRefunded:   number;
  stoppedAt:        string;
}
