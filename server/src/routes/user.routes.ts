import express from "express";
import {
    createUser,
    deleteUser,
    getAllUsers,
    getUser,
    updateUser,
} from "../controllers/usersController.js";

export const usersRouter = express.Router();

usersRouter.get("/", getAllUsers);

usersRouter
    .route("/:id")
    .get(getUser)
    .post(createUser)
    .put(updateUser)
    .delete(deleteUser);
