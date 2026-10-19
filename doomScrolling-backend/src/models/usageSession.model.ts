import mongoose, { Document, Schema, Types, model } from "mongoose";

export interface IUsageSession extends Document {
  userId: Types.ObjectId;
  clientSessionId: string;
  startedAt: Date;
  endedAt?: Date | null;
  durationSeconds: number;
  reelsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const usageSessionSchema = new Schema<IUsageSession>(
  {
    userId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    clientSessionId: {
      type: String,
      required: true,
    },
    startedAt: {
      type: Date,
      required: true,
    },
    endedAt: {
      type: Date,
      default: null,
    },
    durationSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
    reelsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

usageSessionSchema.index(
  {
    userId: 1,
    clientSessionId: 1,
  },
  {
    unique: true,
  },
);

const UsageSession = model<IUsageSession>("UsageSession", usageSessionSchema);

export default UsageSession