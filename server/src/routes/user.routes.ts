import { Router } from "express";
import {
    getAll,
    getById,
    create,
    update,
    remove,
} from "../controllers/user.controller.js";
import auth from "../middleware/auth.middleware.js";

const router = Router();

// Public route to create user
router.post("/", create);

// Authenticated routes
router.use(auth); // apply auth middleware to all routes below

router.get("/", getAll);
router.route("/:id").get(getById).put(update).delete(remove);

export default router;
