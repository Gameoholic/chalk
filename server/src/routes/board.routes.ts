import { Router } from "express";
import {
    getAll,
    create,
    getById,
    updateBoard,
    upsertWorldObjects,
} from "../controllers/board.controller.js";
import auth from "../middleware/auth.middleware.js";

const router = Router();

router.use(auth); // apply auth middleware to all routes below

router.get("/:id", getById);
// update board metadata (name, lastOpened, etc)
router.patch("/:id", updateBoard);
// append world objects
router.post("/:id/objects", upsertWorldObjects);
router.get("/", getAll);
router.post("/", create);

export default router;
