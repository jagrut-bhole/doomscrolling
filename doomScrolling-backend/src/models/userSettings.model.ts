import mongoose, { Document, Schema, model, Types } from "mongoose";

export interface IUserSetting extends Document {
  userId: Types.ObjectId;
  dailyLimitMinutes: number;
  timezone: string;
}

const userSettingsSchema = new Schema<IUserSetting>(
  {
    userId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    dailyLimitMinutes: {
      type: Number,
      default: 30,
      min: 1,
    },
    timezone: {
      type: String,
      default: "Asia/Mumbai",
    },
  },
  {
    timestamps: true,
  },
);

const UserSetting = model<IUserSetting>("UserSetting", userSettingsSchema);

export default UserSetting;
