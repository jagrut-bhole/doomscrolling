import type { Request, Response } from "express";

// utilities
import { asyncHandler } from "@/utils/asyncHandler";
import { responseHandler } from "@/utils/responseHandler";

// mongoose models
import User from "@/models/user.model";
import ReelEventModel from "@/models/reelEvent.model";
import UsageSession from "@/models/usageSession.model";
import UserSetting from "@/models/userSettings.model";

export const getProfile = asyncHandler(
  async (request: Request, response: Response) => {
    try {
      const userId = request.user?._id;

      if (!userId) {
        return responseHandler.sendError(response, 400, "Userid not found on incoming request");
      }

      const user = await User.findById(userId);

      if (!user) {
        return responseHandler.sendError(response, 404, "User not found!!");
      }

      const userPart = {
        id: user._id,
        name: user.name,
        email: user.email,
        limit: user.limit,
        createdAt: user._id.getTimestamp()
      }
      
    } catch (error: unknown) {
	console.error(error);
    }
  }
)