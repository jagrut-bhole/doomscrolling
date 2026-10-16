import mongoose, { Document, Schema, Types, model } from "mongoose";

export interface IReelEvent extends Document {
  userId: Types.ObjectId;
  sessionId: Types.ObjectId;
  clientEventId: string;
  watchedAt: Date;
}

const reelEventSchema = new Schema<IReelEvent>(
  {
    userId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
    sessionId: {
      type: Types.ObjectId,
      ref: "UsageSession",
      required: true,
    },
    clientEventId: {
      type: String,
      required: true,
    },
    watchedAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

reelEventSchema.index({ userId: 1, clientEventId: 1 }, { unique: true });

const ReelEvent = model<IReelEvent>("ReelEvent", reelEventSchema);

export default ReelEvent;
