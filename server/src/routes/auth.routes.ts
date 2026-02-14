import { Router } from "express";
import { login, logout, me } from "../controllers/auth.controller.js";
import auth from "../middleware/auth.middleware.js";

const router = Router();

router.post("/login", login);
router.use(auth); // apply auth middleware to all routes below
router.post("/logout", logout);
router.get("/me", me);

export default router;
