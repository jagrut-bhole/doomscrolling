import { Router } from "express";

import { syncData } from "@/controllers/sync.controller";
import { verifyJWT } from "@/middlewares/auth.middleware";

const router = Router();

router.post("/", verifyJWT, syncData);

export default router;
