import type { Request, Response } from "express";

export const getHealth = (
  _req: Request,
  res: Response
): void => {
  res.status(200).json({
    success: true,
    message: "Backend is running!!",
    timestamp: new Date().toISOString()
  });
}
