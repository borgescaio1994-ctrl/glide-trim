import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set MIME types for JavaScript modules
app.use((req, res, next) => {
  if (req.path.endsWith('.js')) {
    res.setHeader('Content-Type', 'application/javascript');
  } else if (req.path.endsWith('.css')) {
    res.setHeader('Content-Type', 'text/css');
  } else if (req.path.endsWith('.mjs')) {
    res.setHeader('Content-Type', 'application/javascript');
  }
  next();
});

// Serve static files from dist (raiz do site)
app.use(express.static(path.join(__dirname, "dist"), {
  index: "index.html",
  maxAge: "1y",
  setHeaders: (res, filePath) => {
    if (filePath.endsWith("index.html")) {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    }
    if (filePath.endsWith('.js') || filePath.endsWith('.mjs')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
  }
}));

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
});

// API routes
app.get("/api/status", (req, res) => {
  res.json({ 
    app: "BookNow", 
    version: "1.0.0",
    status: "running",
    port: port 
  });
});

const spaIndexPath = path.join(__dirname, "dist", "index.html");

function sendSpaIndex(res) {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.sendFile(spaIndexPath);
}

// Auth callback route - serve index.html for Supabase OAuth
app.get("/auth/callback", (req, res) => {
  sendSpaIndex(res);
});

// SPA fallback - serve index.html for all non-API routes
app.use((req, res, next) => {
  if (!req.path.startsWith("/api") && req.method === "GET") {
    sendSpaIndex(res);
  } else {
    next();
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Start server
app.listen(port, "0.0.0.0", () => {
  console.log("=== BOOKNOW SERVER STARTED ===");
  console.log("Port:", port);
  console.log("Environment:", process.env.NODE_ENV || "development");
  console.log("Static files:", path.join(__dirname, "dist"));
  console.log("================================");
});
