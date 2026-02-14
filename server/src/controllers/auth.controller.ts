import type { Request, Response } from "express";
import * as AuthService from "../services/auth.service.js";
import jwt, { type JwtPayload } from "jsonwebtoken";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";

export async function login(req: Request, res: Response) {
    try {
        const email = req.body.email as string;
        const password = req.body.password as string;
        if (!email || !password) {
            return res
                .status(400)
                .json({ error: "Not all arguments provided." });
        }

        const result = await AuthService.login(email, password);

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
            case "Incorrect password": {
                return res.status(401).json({
                    error: "Login credentials are incorrect.",
                });
            }
            case "User doesn't exist.": {
                return res.status(401).json({
                    error: "Login credentials are incorrect.",
                });
            }
            case "Couldn't issue tokens.": {
                return res.status(500).json({
                    error: "Failed to log in due to an internal error.",
                });
            }
            case "Couldn't search for user.": {
                return res.status(500).json({
                    error: "Failed to log in due to an internal error.",
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
            error: "Failed to log in due to an internal error.",
        });
    }
}

export async function me(req: AuthenticatedRequest, res: Response) {
    try {
        if (!req.authenticatedUser) {
            res.sendStatus(401);
            return;
        }

        const result = await AuthService.getUserData(
            req.authenticatedUser.id,
            req.authenticatedUser.role
        );

        if (result.success) {
            const userData = result.data;

            return res.status(200).json({
                data: {
                    displayName: userData.displayName,
                    role: req.authenticatedUser.role,
                    id: req.authenticatedUser.id,
                    createdOn: userData.createdOn,
                },
            });
        }

        const error = result.error;
        const errorReason = error.reason;

        switch (errorReason) {
            case "User ID is invalid.": {
                return res.status(500).json({
                    error: "Failed to authenticate due to an internal error.",
                });
            }
            case "User's role is invalid": {
                return res.status(500).json({
                    error: "Failed to authenticate due to an internal error.",
                });
            }
            case "Couldn't search for user.": {
                return res.status(500).json({
                    error: "Failed to authenticate due to an internal error.",
                });
            }
            case "User doesn't exist.": {
                return res.status(500).json({
                    error: "Failed to authenticate due to an internal error.",
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
            error: "Failed to authenticate due to an internal error.",
        });
    }
}
