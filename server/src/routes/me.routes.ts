import { Router } from "express";
import auth from "../middleware/auth.middleware.js";
import { get } from "../controllers/me.controller.js";

const router = Router();

router.use(auth); // apply auth middleware to all routes below

router.get("", get);

// router.get("/", getAll);
// router.route("/:id").get(getById).put(update).delete(remove);

export default router;
