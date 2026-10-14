import mongoose from "mongoose";

type connectionObj = {
    isConnected ?: number
}

const connection : connectionObj = {}

export const connectDb = async (): Promise<void> => {

  if (connection.isConnected) {
    console.log("Database is already connected!!");
    return;
  }
  
  try {
    const mongoURL = process.env.MONGODB_URI;

    if (!mongoURL) {
      throw new Error("MONGODB_URI is missing from .env");
    }

    await mongoose.connect(mongoURL);

    console.log("MongoDB connected successfully");
  } catch (error: unknown) {
    console.error("Database connection failed!!");
    console.log("Error while connecting database: ", error);
    process.exit(1);
  }
};
