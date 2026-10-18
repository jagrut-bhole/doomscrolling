import type { Request, Response } from "express";
import { responseHandler } from "@/utils/responseHandler";

export const getHealth = (request: Request, response: Response) => {
  const timestamp = new Date().toISOString();
  return responseHandler.sendSuccess(
    response,
    200,
    "Backend is running!!",
    timestamp,
  );
};
