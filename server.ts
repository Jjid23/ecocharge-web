import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Middleware to allow the API to receive JSON data (like from your mobile app)
  app.use(express.json());

  // Add a basic health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Example API: Read data (Send kiosk data to the mobile app)
  app.get("/api/kiosk/status", (req, res) => {
    // Later, you can fetch this directly from Firebase
    res.json({
      kioskId: "ECO-001",
      trashBinLevel: "75%",
      status: "online"
    });
  });

  // Example API: Create data (Receive a bottle deposit from the app)
  app.post("/api/deposit", (req, res) => {
    const depositData = req.body; 
    console.log("Received a deposit:", depositData);
    
    // Respond back to the app that it was successful
    res.json({ 
      success: true, 
      message: "Bottle deposit tracked successfully!" 
    });
  });

  // --- NEW CUSTOM APIs ---
  // Example GET API
  app.get("/api/my-new-data", (req, res) => {
    res.json({
      id: 1,
      name: "Sample Item",
      description: "This is some data from the new API!"
    });
  });

  // Example POST API
  app.post("/api/save-record", (req, res) => {
    const userData = req.body;
    console.log("Data received from POST /api/save-record:", userData);
    res.json({
      success: true,
      message: "Data was successfully saved (simulated)!",
      receivedData: userData
    });
  });
  // -----------------------

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve the built assets
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
