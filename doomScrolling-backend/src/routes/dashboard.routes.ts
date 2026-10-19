import { Router } from "express";

import { getDashboard } from "@/controllers/dashboard.controller";
import { verifyJWT } from "@/middlewares/auth.middleware";

const router = Router();

router.get("/", verifyJWT, getDashboard);

export default router;
