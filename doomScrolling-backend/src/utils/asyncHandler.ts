import type {
  Request,
  Response,
  NextFunction
} from "express";

type ResponseHandler = (
  request: Request,
  response: Response,
  next: NextFunction
) => Promise<any> | any;

export const asyncHandler = (fn: ResponseHandler) => {
  return async (request: Request, response: Response, next: NextFunction) => {
    try {
      await fn(request, response, next);
    } catch (error) {
      console.log("error");
      const message = error instanceof Error ? error.message : "Internal Server Error"; 
      response.status(500).send({
        success: false,
        message: "Internal Server Error",
        error: message,
        data: null,
      })
    }
  }
}