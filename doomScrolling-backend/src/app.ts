import express from "express";
import cors from 'cors';
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import healthRoutes from "./routes/health.routes";
import { errorMiddleware } from "./middlewares/error.middleware";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({
  extended: true
}));
app.use(cookieParser());

if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to doomScrolling backend API"
  })
});

app.use("/api/v1/health", healthRoutes);

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found"
  })
});

app.use(errorMiddleware);

export default app;
