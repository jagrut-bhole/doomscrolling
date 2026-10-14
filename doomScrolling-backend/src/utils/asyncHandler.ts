import type {
  Request,
  Response
} from "express";

type ResponseHandler = (
  request: Request,
  response: Response
) => Promise<any> | any;

export const asyncHandler = (fn: ResponseHandler) => {
  return async (request: Request, response: Response) => {
    try {
      await fn(request, response);
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