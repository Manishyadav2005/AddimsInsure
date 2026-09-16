import express from "express";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

import mongoose from "mongoose";
import { createServer as createViteServer } from "vite";

// Import Database Connection & Modular API Routes
import { connectMongoDB } from "./models";
import apiRoutes from "./routes";

import fs from "fs";

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3036;

app.use(express.json());
app.use("/uploads", express.static(uploadsDir));

// Initialize MongoDB Connection
connectMongoDB().catch(err => console.error("[MongoDB] Initial connect error:", err));

// DB Health Check Endpoint
app.get("/api/db-status", (req, res) => {
  res.json({
    connected: mongoose.connection.readyState === 1,
    status: mongoose.connection.readyState === 1 ? "Connected to MongoDB" : "Disconnected",
    database: mongoose.connection.readyState === 1 ? (mongoose.connection.name || "policy") : null,
    uriHost: process.env.MONGODB_URI ? (process.env.MONGODB_URI.split('@')[1] || process.env.MONGODB_URI) : "None"
  });
});

// Mount All Modular API Routes under /api
app.use("/api", apiRoutes);

// Catch-all for unhandled /api requests (returns JSON 404 instead of Vite HTML)
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: `API endpoint ${req.originalUrl} not found` });
});

// Vite / Static Assets Server setup
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Addims InSure Server] Server is up and running on port ${PORT}`);
  });
}

// Server ready for real data
setupServer();
