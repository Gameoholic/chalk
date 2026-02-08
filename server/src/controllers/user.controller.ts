import express from "express";
import type { NextFunction, Response, Request } from "express";

// This will help us connect to the database
import db from "../db/mongo.js";

// This help convert the id from string to ObjectId for the _id.
import { ObjectId } from "mongodb";
import * as UserService from "../services/user.service.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";

export async function create(req: AuthenticatedRequest, res: Response) {
    try {
        if (!req.authenticatedUser) {
            return res.sendStatus(401);
        }
        if (req.authenticatedUser.role !== "guest") {
            return res
                .status(400)
                .json({ error: "You already own a non-guest account" });
        }

        const email = req.body.email as string;
        const password = req.body.password as string;
        const displayName = req.body.displayName as string;
        if (!email || !password || !displayName) {
            return res
                .status(400)
                .json({ error: "Not all arguments provided" });
        }

        const tokens = await UserService.createUser(
            req.authenticatedUser.id,
            email,
            password,
            displayName
        );

        res.cookie("refresh-token", tokens.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
        });

        res.cookie("access-token", tokens.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
        });
        return res.sendStatus(201);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to create user" });
    }
}

// export async function getAll(req: Request, res: Response) {
//     try {
//         const users = await UserService.getAllUsers();
//         res.status(200).json(users);
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ error: "Failed to fetch users" });
//     }
// }

// export async function getById(req: Request, res: Response) {
//     try {
//         const id = req.params.id as string;
//         const user = await UserService.getUserById(id);
//         if (!user) return res.status(404).json({ error: "User not found" });
//         res.status(200).json(user);
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ error: "Failed to fetch user" });
//     }
// }

// export async function update(req: Request, res: Response) {
//     try {
//         const { email, name } = req.body;
//         const result = await UserService.updateUser(
//             req.params.id as string,
//             email,
//             name
//         );
//         res.status(200).json(result);
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ error: "Failed to update user" });
//     }
// }

// export async function remove(req: Request, res: Response) {
//     try {
//         const result = await UserService.deleteUserService(
//             req.params.id as string
//         );
//         res.status(200).json(result);
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ error: "Failed to delete user" });
//     }
// }
