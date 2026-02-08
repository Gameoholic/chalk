import { Router } from "express";
import auth from "../middleware/auth.middleware.js";
import { me } from "../controllers/auth.controller.js";
import { create } from "../controllers/user.controller.js";

const router = Router();

router.use(auth); // apply auth middleware to all routes below

router.post("/", create);

// router.get("/", getAll);
// router.route("/:id").get(getById).put(update).delete(remove);

export default router;
