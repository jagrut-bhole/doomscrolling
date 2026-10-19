import { Router } from "express";

import {
  createSession,
  endSession,
  getSessions,
  getSessionById,
} from "@/controllers/session.controller";
import { recordReelEvents } from "@/controllers/reelEvent.controller";
import { verifyJWT } from "@/middlewares/auth.middleware";

const router = Router();

router.post("/", verifyJWT, createSession);
router.patch("/:id/end", verifyJWT, endSession);
router.get("/", verifyJWT, getSessions);
router.get("/:id", verifyJWT, getSessionById);

// Reel events batch recording for a session
router.post("/:id/events", verifyJWT, recordReelEvents);

export default router;
