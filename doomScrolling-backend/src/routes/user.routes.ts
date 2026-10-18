import { Router } from "express";

// controllers
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
} from "@/controllers/user.controller";

// middlewares
import { verifyJWT } from "@/middlewares/auth.middleware";

const router = Router();

// Public routes
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/refresh-token", refreshAccessToken);

router.post("/logout", verifyJWT, logoutUser);

export default router;