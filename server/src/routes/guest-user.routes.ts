import { Router } from "express";
import { create } from "../controllers/guest-user.controller.js";
import auth from "../middleware/auth.middleware.js";

const router = Router();
// Public route to create guest user
router.post("/", create);

// Authenticated routes
// router.use(auth); // apply auth middleware to all routes below

// router.get("/", getAll);

export default router;
