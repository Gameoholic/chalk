import { Router } from "express";
import auth from "../middleware/auth.middleware.js";
import { get, update } from "../controllers/me.controller.js";

const router = Router();

router.use(auth); // apply auth middleware to all routes below

// All user updates go here - if some updates are only permitted to user and not guest user, we will simply check in the relevant service.
router.get("", get);
router.put("", update);
// router.get("/", getAll);
// router.route("/:id").get(getById).put(update).delete(remove);

export default router;
