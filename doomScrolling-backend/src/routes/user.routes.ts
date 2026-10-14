import {
  Router,
  type Request,
  type Response} from "express";
import User from "../models/user.model";

const router = Router();

// POST -> /api/v1/users: Create User
router.post("/create", async(
  _req: Request,
  res: Response
) => {
  try {
    
  } catch (error: unknown) {
	console.error(error);
  }
}) 