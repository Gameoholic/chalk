import type { Response } from "express";

import * as UserService from "../services/user.service.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";

export async function create(req: AuthenticatedRequest, res: Response) {
    try {
        if (!req.authenticatedUser) {
            return res.sendStatus(401);
        }

        if (req.authenticatedUser.role !== "guest") {
            return res.status(400).json({
                error: "You may only create a user if currently logged in as a guest user.",
            });
        }

        const email = req.body.email as string;
        const password = req.body.password as string;
        const displayName = req.body.displayName as string;

        if (email === undefined) {
            return res.status(400).json({ error: "Email was not provided." });
        }
        if (password === undefined) {
            return res
                .status(400)
                .json({ error: "Password was not provided." });
        }
        if (displayName === undefined) {
            return res
                .status(400)
                .json({ error: "Displayname was not provided." });
        }

        const result = await UserService.createUser(
            req.authenticatedUser.id,
            email,
            password,
            displayName
        );
        if (result.success) {
            const tokens = result.data;

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

            return res.sendStatus(204);
        }

        const error = result.error;
        const errorReason = error.reason;

        switch (errorReason) {
            case "Couldn't create user.": {
                return res.status(500).json({
                    error: "Failed to create user due to an internal error.",
                });
            }
            case "Couldn't delete guest user.": {
                return res.status(500).json({
                    error: "Failed to create user due to an internal error.",
                });
            }
            case "Couldn't find guest user.": {
                return res.status(500).json({
                    error: "Failed to create user due to an internal error.",
                });
            }
            case "Couldn't issue tokens.": {
                return res.status(500).json({
                    error: "Guest user was created, but access and refresh tokens couldn't be issued due to an internal error.",
                });
            }
            case "Couldn't transfer ownership of boards.": {
                return res.status(500).json({
                    error: "Failed to create user due to an internal error.",
                });
            }
            case "Display name cannot be empty.": {
                return res.status(400).json({
                    error: "Display name cannot be empty.",
                });
            }
            case "Display name is too long.": {
                return res.status(400).json({
                    error: "Display name is too long.",
                });
            }
            case "Email cannot be empty.": {
                return res.status(400).json({
                    error: "Email cannot be empty.",
                });
            }
            case "Email is invalid.": {
                return res.status(400).json({
                    error: "Email is invalid.",
                });
            }
            case "Guest user ID is invalid.": {
                return res.status(500).json({
                    error: "Failed to create user due to an internal error.",
                });
            }
            case "No boards found for the guest user.": {
                return res.status(500).json({
                    error: "Failed to create user due to an internal error.",
                });
            }
            case "Password cannot be empty.": {
                return res.status(400).json({
                    error: "Password cannot be empty.",
                });
            }
            case "Password is invalid.": {
                return res.status(500).json({
                    error: "Password is invalid.",
                });
            }
            default: {
                throw new Error(
                    `Unhandled error: ${errorReason satisfies never}`
                );
            }
        }
    } catch (err) {
        return res.status(500).json({
            error: "Failed to create user due to an internal error.",
        });
    }
}
