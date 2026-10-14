import "dotenv/config";

import app from "./app";
import { connectDb } from "./config/database";

const PORT = Number(process.env.PORT) || 5000;

const startServer = async (): Promise<void> => {
  try {
    await connectDb();

    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`)
    })
  } catch (error: unknown) {
    console.error("Failed to start server", error);
    process.exit(1);
  }
}

void startServer();