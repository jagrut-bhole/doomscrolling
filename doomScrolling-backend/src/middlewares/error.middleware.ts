import type { Request, Response, NextFunction } from "express";
import { responseHandler } from "@/utils/responseHandler";

export const globalErrorHandler = (
  err: Error,
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  console.error(err);

  if (response.headersSent) {
    return next(err);
  }

  return responseHandler.sendError(response, 500, "Internal Server Error");
};
