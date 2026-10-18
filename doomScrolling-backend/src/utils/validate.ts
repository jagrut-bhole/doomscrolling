import { z } from "zod";
import { type Response } from "express";
import { responseHandler } from "./responseHandler";

export function validateData<T extends z.ZodType>(
  schema: T,
  data: unknown,
  response: Response,
): z.infer<T> | null {
  const validation = schema.safeParse(data);

  if (!validation.success) {
    responseHandler.sendValidationError(
      response,
      validation.error,
      "Validation Error",
    );

    return null;
  }

  return validation.data;
}
