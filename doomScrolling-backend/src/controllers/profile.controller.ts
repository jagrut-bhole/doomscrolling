import type { Request, Response } from "express";

// utilities
import { asyncHandler } from "@/utils/asyncHandler";
import { responseHandler } from "@/utils/responseHandler";
import { validateData } from "@/utils/validate";

// mongoose models
import User from "@/models/user.model";
import ReelEventModel from "@/models/reelEvent.model";
import UsageSession from "@/models/usageSession.model";
import UserSetting from "@/models/userSettings.model";

// validators
import {
  type profileUpdateInput,
  profileUpdateSchema,
  type userPasswordChangeInput,
  userPasswordChangeSchema,
} from "@/validators/profile.validators";
import bcrypt from "bcryptjs";

export const getProfile = asyncHandler(
  async (request: Request, response: Response) => {
    const userId = request.user?._id;

    if (!userId) {
      return responseHandler.sendError(
        response,
        400,
        "Userid not found on incoming request",
      );
    }

    const currentUser = await User.findById(userId);

    if (!currentUser) {
      return responseHandler.sendError(response, 404, "User not found!!");
    }

    const user = {
      _id: currentUser._id,
      name: currentUser.name,
      email: currentUser.email,
      limit: currentUser.limit,
      createdAt: currentUser.createdAt,
      updateAt: currentUser.updatedAt,
    };

    return responseHandler.sendSuccess(
      response,
      200,
      "Profile fetched successfully!!",
      user,
    );
  },
);

export const profileUpdate = asyncHandler(
  async (request: Request, response: Response) => {
    const userId = request.user?._id;

    if (!userId) {
      return responseHandler.sendError(response, 400, "UserId not found");
    }

    const data = validateData(profileUpdateSchema, request.body, response);

    if (!data) return;

    const { currentEmail, newEmail, password } = data;

    const user = await User.findOne({
      _id: userId,
      email: currentEmail,
    });

    if (!user) {
      return responseHandler.sendError(response, 404, "User not found");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
      return responseHandler.sendError(response, 400, "Invalid credentials!!");
    }

    user.email = newEmail;

    try {
      await user.save();
    } catch (error: any) {
      console.error(error);
      if (error.code === 11000) {
        return responseHandler.sendError(
          response,
          400,
          `Account with ${newEmail} already exists!!`,
        );
      }
      throw error;
    }
    return responseHandler.sendSuccess(
      response,
      200,
      "Email changes successfully!!",
    );
  },
);

export const updatePassword = asyncHandler(
  async (request: Request, response: Response) => {
    const userId = request.user?._id;

    if (!userId) {
      return responseHandler.sendError(response, 400, "User ID not found");
    }

    const data = validateData(userPasswordChangeSchema, request.body, response);

    if (!data) return;

    const { currentPassword, newPassword } = data;

    const user = await User.findById(userId);

    if (!user) {
      return responseHandler.sendError(response, 404, "User not found");
    }

    const isPasswordValid = await user.isPasswordCorrect(currentPassword);
    console.log("currentPassword: ", currentPassword);
    console.log("newPassword: ", newPassword);

    console.log("Valid: ", isPasswordValid);

    if (!isPasswordValid) {
      return responseHandler.sendError(
        response,
        400,
        "Invalid credentials provided",
      );
    }

    user.password = newPassword;

    await user.save();

    return responseHandler.sendSuccess(
      response,
      200,
      "Password changed successfully",
    );
  },
);
