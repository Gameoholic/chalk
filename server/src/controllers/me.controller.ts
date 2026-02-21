import type { Request, Response } from "express";
import * as MeService from "../services/me.service.js";
import jwt, { type JwtPayload } from "jsonwebtoken";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";

export async function get(req: AuthenticatedRequest, res: Response) {
    try {
        if (!req.authenticatedUser) {
            res.sendStatus(401);
            return;
        }

        const result = await MeService.getUserData(
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
                    email: userData.email, // note: is undefined in case of guest user!
                },
            });
        }

        const error = result.error;
        const errorReason = error.reason;

        switch (errorReason) {
            case "User ID is invalid.": {
                return res.status(500).json({
                    error: "Failed to get user data due to an internal error.",
                });
            }
            case "User's role is invalid": {
                return res.status(500).json({
                    error: "Failed to get user data due to an internal error.",
                });
            }
            case "Couldn't search for user.": {
                return res.status(500).json({
                    error: "Failed to get user data due to an internal error.",
                });
            }
            case "User doesn't exist.": {
                return res.status(500).json({
                    error: "Failed to get user data due to an internal error.",
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
            error: "Failed to get user data due to an internal error.",
        });
    }
}

export async function update(req: AuthenticatedRequest, res: Response) {
    try {
        if (!req.authenticatedUser) {
            return res.sendStatus(401);
        }

        // Optional parameters to update user with
        const displayName = req.body.displayName as string;

        const result = await MeService.updateUser(
            req.authenticatedUser.id,
            req.authenticatedUser.role,
            {
                displayName: displayName,
            }
        );

        if (result.success) {
            return res.sendStatus(204);
        }

        const error = result.error;
        const errorReason = error.reason;

        switch (errorReason) {
            case "User ID is invalid.": {
                return res.status(500).json({
                    error: "Failed to update user data due to an internal error.",
                });
            }
            case "User's role is invalid": {
                return res.status(500).json({
                    error: "Failed to update user data due to an internal error.",
                });
            }
            case "User doesn't exist.": {
                return res.status(500).json({
                    error: "Failed to update user data due to an internal error.",
                });
            }
            case "No updates provided.": {
                return res.status(400).json({
                    error: "No fields were provided to update.",
                });
            }
            case "Couldn't update user.": {
                return res.status(500).json({
                    error: "Failed to update user data due to an internal error.",
                });
            }
            case "Update displayName is too long.": {
                return res.status(400).json({
                    error: "Display name is too long.",
                });
            }
            case "Update displayName's length is zero.": {
                return res.status(400).json({
                    error: "Display name cannot be empty.",
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
            error: "Failed to update user data due to an internal error.",
        });
    }
}
