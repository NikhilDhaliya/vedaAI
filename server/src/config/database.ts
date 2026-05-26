import mongoose from "mongoose";

export async function connectDatabase(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");

  await mongoose.connect(uri);
  console.log("[MongoDB] Connected");

  mongoose.connection.on("error", (err) => {
    console.error("[MongoDB] Error:", err.message);
  });
}
