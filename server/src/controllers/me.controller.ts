import type { Request, Response } from "express";
import * as AuthService from "../services/auth.service.js";
import jwt, { type JwtPayload } from "jsonwebtoken";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";

export async function get(req: AuthenticatedRequest, res: Response) {
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
                    email: userData.email, // note: is undefined in case of guest user!
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
