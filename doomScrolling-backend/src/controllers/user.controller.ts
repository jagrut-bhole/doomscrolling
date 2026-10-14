// types
import type { Request, Response } from "express";

// libraries
import jwt from "jsonwebtoken";

// utilities
import { asyncHandler } from "@/utils/asyncHandler";
import { responseHandler } from "@/utils/responseHandler";
import { generateAccessTokenAndRefreshToken } from "@/utils/user.utils";

// constants
import {
  cookieOptions,
  accessTokenCookieOptions,
  refreshTokenCookieOptions,
} from "@/constants/cookie.constants";

// validators
import {
  type userRegisterInput,
  userRegisterSchema,
  type userLoginInput,
  userLoginSchema,
} from "@/validators/user.validators";

// mongoose models
import User from "@/models/user.model";

interface JwtRefreshPayload extends jwt.JwtPayload {
  _id: string;
}

export const registerUser = asyncHandler(
  async (request: Request, response: Response) => {
    try {
      const data: userRegisterInput = request.body;

      const validation = userRegisterSchema.safeParse(data);

      if (!validation.success) {
        return responseHandler.sendValidationError(
          response,
          validation.error,
          "Validation Error",
        );
      }

      const { name, email, password, limit } = validation.data;
      const normalizedEmail = email.toLowerCase();

      const existingUser = await User.findOne({
        email: normalizedEmail,
      });

      if (existingUser) {
        return responseHandler.sendError(response, 400, "User already exists");
      }

      const user = await User.create({
        name,
        email: normalizedEmail,
        password,
        limit,
      });

      const { accessToken, refreshToken } =
        await generateAccessTokenAndRefreshToken(user._id.toString());

      const createdUser = await User.findById(user._id).select(
        "-password -refreshToken",
      );

      if (!createdUser) {
        return responseHandler.sendError(
          response,
          500,
          "Something went wrong while registering the user!!",
        );
      }

      response
        .cookie("accessToken", accessToken, accessTokenCookieOptions)
        .cookie("refreshToken", refreshToken, refreshTokenCookieOptions);

      return responseHandler.sendSuccess(
        response,
        201,
        "User registered successfully",
        createdUser,
      );
    } catch (error) {
      console.error("Register Error:", error);
      return responseHandler.sendError(
        response,
        500,
        "Internal Server Error while creating the user!",
      );
    }
  },
);

export const loginUser = asyncHandler(
  async (request: Request, response: Response) => {
    try {
      const data: userLoginInput = request.body;

      const validation = userLoginSchema.safeParse(data);

      if (!validation.success) {
        return responseHandler.sendValidationError(
          response,
          validation.error,
          "Validation Error",
        );
      }

      const { email, password } = validation.data;

      const user = await User.findOne({
        email: email.toLowerCase(),
      });

      if (!user) {
        return responseHandler.sendError(response, 404, "User not found");
      }

      const isPasswordValid = await user.isPasswordCorrect(password);

      if (!isPasswordValid) {
        return responseHandler.sendError(
          response,
          400,
          "Invalid credentials!!",
        );
      }

      const { accessToken, refreshToken } =
        await generateAccessTokenAndRefreshToken(user._id.toString());

      const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken",
      );

      response
        .cookie("accessToken", accessToken, accessTokenCookieOptions)
        .cookie("refreshToken", refreshToken, refreshTokenCookieOptions);

      return responseHandler.sendSuccess(
        response,
        200,
        "User logged in successfully",
        loggedInUser,
      );
    } catch (error: unknown) {
      console.error("Login Error:", error);
      return responseHandler.sendError(
        response,
        500,
        "Internal Server Error while logging in!",
      );
    }
  },
);

export const logoutUser = asyncHandler(
  async (request: Request, response: Response) => {
    try {
      const userId = request.user?._id;
      const incomingRefreshToken =
        request.cookies?.refreshToken ||
        request.header("Authorization")?.replace("Bearer ", "");

      if (userId) {
        await User.findByIdAndUpdate(
          userId,
          {
            $unset: {
              refreshToken: 1,
            },
          },
          {
            new: true,
          },
        );
      } else if (incomingRefreshToken) {
        await User.findOneAndUpdate(
          { refreshToken: incomingRefreshToken },
          {
            $unset: {
              refreshToken: 1,
            },
          },
          {
            new: true,
          },
        );
      }

      response
        .clearCookie("accessToken", cookieOptions)
        .clearCookie("refreshToken", cookieOptions);

      return responseHandler.sendSuccess(
        response,
        200,
        "User logged out successfully",
        {},
      );
    } catch (error) {
      console.error("Logout Error:", error);
      return responseHandler.sendError(
        response,
        500,
        "Internal Server Error while logging out the user",
      );
    }
  },
);

export const getCurrentUser = asyncHandler(
  async (request: Request, response: Response) => {
    return responseHandler.sendSuccess(
      response,
      200,
      "Current user fetched successfully",
      request.user,
    );
  },
);

export const refreshAccessToken = asyncHandler(
  async (request: Request, response: Response) => {
    try {
      const incomingRefreshToken =
        request.cookies?.refreshToken ||
        request.header("Authorization")?.replace("Bearer ", "");

      if (!incomingRefreshToken) {
        return responseHandler.sendError(
          response,
          401,
          "Unauthorized request: Refresh token missing",
        );
      }

      const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;

      if (!refreshTokenSecret) {
        console.error("REFRESH_TOKEN_SECRET environment variable is not defined");
        return responseHandler.sendError(
          response,
          500,
          "Internal Server Error: Server misconfiguration",
        );
      }

      let decodedToken: JwtRefreshPayload;
      
      try {
        decodedToken = jwt.verify(
          incomingRefreshToken,
          refreshTokenSecret,
        ) as JwtRefreshPayload;
      } catch (jwtError) {
        return responseHandler.sendError(
          response,
          401,
          "Invalid or expired refresh token",
        );
      }

      const user = await User.findById(decodedToken?._id);

      if (!user) {
        return responseHandler.sendError(
          response,
          401,
          "Invalid refresh token: User not found",
        );
      }

      // Security check: verify token matches the one saved in the database
      if (user.refreshToken !== incomingRefreshToken) {
        return responseHandler.sendError(
          response,
          401,
          "Refresh token is expired or has been revoked",
        );
      }

      // Generate new tokens (Refresh Token Rotation)
      const { accessToken, refreshToken: newRefreshToken } =
        await generateAccessTokenAndRefreshToken(user._id.toString());

      response
        .cookie("accessToken", accessToken, accessTokenCookieOptions)
        .cookie("refreshToken", newRefreshToken, refreshTokenCookieOptions);

      return responseHandler.sendSuccess(
        response,
        200,
        "Access token refreshed successfully",
        {
          accessToken,
        },
      );
    } catch (error: unknown) {
      console.error("Refresh Access Token Error:", error);
      return responseHandler.sendError(
        response,
        500,
        "Internal Server Error while refreshing access token",
      );
    }
  },
);