import { type Response } from "express";

export class responseHandler {
  static sendSuccess<T>(
    response: Response,
    statusCode: number,
    message: string,
    data?: T
  ) {
    return response.status(statusCode).json({
      success: true,
      message,
      error: null,
      data: data ?? null
    })
  }

  static sendError(
    response: Response,
    statusCode: number,
    message: string,
    error?: unknown
  ) {
    return response.status(statusCode).json({
      success: false,
      message,
      error: error instanceof Error ? error.message : error ? String(error) : null,
      data: null
    }) 
  }

  static sendValidationError(
    response: Response,
    error: {
      format : () => unknown
    },
    message: "Validation Error"
  ) {
    return response.status(400).json({
      success: false,
      message,
      error: error.format(),
      data: null
    })
  }
}