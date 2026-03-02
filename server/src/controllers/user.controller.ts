import type { Response } from "express";

import * as UserService from "../services/user.service.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { ChalkInternalException } from "../types/result.types.js";

export async function create(req: AuthenticatedRequest, res: Response) {
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
        return res.status(400).json({ error: "Password was not provided." });
    }
    if (displayName === undefined) {
        return res.status(400).json({ error: "Displayname was not provided." });
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
            throw new ChalkInternalException(
                500,
                "Failed to create user due to an internal error.",
                error
            );
        }
        case "Couldn't delete guest user.": {
            throw new ChalkInternalException(
                500,
                "Failed to create user due to an internal error.",
                error
            );
        }
        case "Couldn't find guest user.": {
            throw new ChalkInternalException(
                500,
                "Failed to create user due to an internal error.",
                error
            );
        }
        case "Couldn't issue tokens.": {
            throw new ChalkInternalException(
                500,
                "Guest user was created, but access and refresh tokens couldn't be issued due to an internal error.",
                error
            );
        }
        case "Couldn't transfer ownership of boards.": {
            throw new ChalkInternalException(
                500,
                "Failed to create user due to an internal error.",
                error
            );
        }
        case "Display name cannot be empty.": {
            throw new ChalkInternalException(
                400,
                "Display name cannot be empty.",
                error
            );
        }
        case "Display name is too long.": {
            throw new ChalkInternalException(
                400,
                "Display name is too long.",
                error
            );
        }
        case "Email cannot be empty.": {
            throw new ChalkInternalException(
                400,
                "Email cannot be empty.",
                error
            );
        }
        case "Email is invalid.": {
            throw new ChalkInternalException(400, "Email is invalid.", error);
        }
        case "Guest user ID is invalid.": {
            throw new ChalkInternalException(
                500,
                "Failed to create user due to an internal error.",
                error
            );
        }
        case "No boards found for the guest user.": {
            throw new ChalkInternalException(
                500,
                "Failed to create user due to an internal error.",
                error
            );
        }
        case "Password cannot be empty.": {
            throw new ChalkInternalException(
                400,
                "Password cannot be empty.",
                error
            );
        }
        case "Password is invalid.": {
            throw new ChalkInternalException(
                500,
                "Password is invalid.",
                error
            );
        }
        default: {
            throw new Error(`Unhandled error: ${errorReason satisfies never}`);
        }
    }
}
