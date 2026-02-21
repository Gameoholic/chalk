import { Router } from "express";
import {
    getAll,
    create,
    getById,
    updateBoard,
    updateWorldObjects,
    deleteById,
} from "../controllers/board.controller.js";
import auth from "../middleware/auth.middleware.js";

const router = Router();

router.use(auth); // apply auth middleware to all routes below

router.delete("/:id", deleteById);
router.get("/:id", getById);
router.put("/:id", updateBoard);
router.post("/:id/objects", updateWorldObjects);
router.get("/", getAll);
router.post("/", create);

export default router;
