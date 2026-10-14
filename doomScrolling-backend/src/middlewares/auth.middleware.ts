import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

import User from "@/models/user.model";
import { responseHandler } from "@/utils/responseHandler";
import { asyncHandler } from "@/utils/asyncHandler";

interface JWTAccessPayload extends jwt.JwtPayload {
  _id: string;
}

export const verifyJWT = asyncHandler(
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const token =
        request.cookies?.accessToken ||
        request.header("Authorization")?.replace("Bearer ", "");

      if (!token) {
        return responseHandler.sendError(
          response,
          401,
          "Unauthorized request: Access token missing",
        );
      }

      const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;

      if (!accessTokenSecret) {
        console.error("ACCESS_TOKEN_SECRET environment variable is not defined");
        return responseHandler.sendError(
          response,
          500,
          "Internal Server Error: Server misconfiguration",
        );
      }

      let decodedToken: JWTAccessPayload;

      try {
        decodedToken = jwt.verify(
          token,
          accessTokenSecret,
        ) as JWTAccessPayload;
      } catch (jwtError) {
        return responseHandler.sendError(
          response,
          401,
          "Invalid or expired access token",
        );
      }

      const user = await User.findById(decodedToken?._id).select(
        "-password -refreshToken",
      );

      if (!user) {
        return responseHandler.sendError(
          response,
          401,
          "Invalid Access Token: User not found",
        );
      }

      request.user = user;
      return next();
    } catch (error: unknown) {
      console.error("verifyJWT Error:", error);
      return responseHandler.sendError(
        response,
        500,
        "Internal Server Error in authentication middleware",
      );
    }
  },
);
