import mongoose from "mongoose";

export async function connectMongoDB() {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    console.log("[MongoDB] No MONGODB_URI configured. Database connection skipped.");
    return null;
  }
  try {
    if (mongoose.connection.readyState >= 1) {
      return mongoose.connection;
    }
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000
    });
    console.log("==================================================");
    console.log("[MongoDB] Connected to MongoDB successfully!");
    console.log(`[MongoDB] Database Host: ${uri.split('@')[1] || uri}`);
    console.log("==================================================");
    return mongoose.connection;
  } catch (err) {
    console.error("[MongoDB] Connection error (continuing in offline/fallback mode):", (err as any)?.message || err);
    return null;
  }
}
