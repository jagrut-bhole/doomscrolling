import { Router } from "express";

import {
  getProfile,
  profileUpdate,
  updatePassword,
} from "@/controllers/profile.controller";
import { verifyJWT } from "@/middlewares/auth.middleware";

const router = Router();

router.get("/get", verifyJWT, getProfile);

router.patch("/update-email", verifyJWT, profileUpdate);

router.patch("/update-password", verifyJWT, updatePassword);

export default router;
