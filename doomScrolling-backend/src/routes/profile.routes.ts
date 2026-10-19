import { Router } from "express";

import {
  changeLimit,
  getProfile,
  profileUpdate,
  updatePassword,
} from "@/controllers/profile.controller";
import { verifyJWT } from "@/middlewares/auth.middleware";

const router = Router();

router.get("/get", verifyJWT, getProfile);

router.patch("/change-email", verifyJWT, profileUpdate);

router.patch("/change-password", verifyJWT, updatePassword);

router.patch("/change-limit", verifyJWT, changeLimit);

export default router;
