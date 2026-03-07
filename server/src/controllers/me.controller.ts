import type { Request, Response } from "express";
import * as MeService from "../services/me.service.js";
import jwt, { type JwtPayload } from "jsonwebtoken";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import * as Sentry from "@sentry/node";
import { ChalkInternalException } from "../types/result.types.js";

export async function get(req: AuthenticatedRequest, res: Response) {
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
                testIgnore: "hi from ci/cd pipeline",
            },
        });
    }

    const error = result.error;
    const errorReason = error.reason;

    switch (errorReason) {
        case "User ID is invalid.": {
            throw new ChalkInternalException(
                500,
                "Failed to get user data due to an internal error.",
                error
            );
        }
        case "User's role is invalid": {
            throw new ChalkInternalException(
                500,
                "Failed to get user data due to an internal error.",
                error
            );
        }
        case "Couldn't search for user.": {
            throw new ChalkInternalException(
                500,
                "Failed to get user data due to an internal error.",
                error
            );
        }
        case "User doesn't exist.": {
            throw new ChalkInternalException(
                500,
                "Failed to get user data due to an internal error.",
                error
            );
        }
        default: {
            throw new Error(`Unhandled error: ${errorReason satisfies never}`);
        }
    }
}

export async function update(req: AuthenticatedRequest, res: Response) {
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
            throw new ChalkInternalException(
                500,
                "Failed to update user data due to an internal error.",
                error
            );
        }
        case "User's role is invalid": {
            throw new ChalkInternalException(
                500,
                "Failed to update user data due to an internal error.",
                error
            );
        }
        case "User doesn't exist.": {
            throw new ChalkInternalException(
                500,
                "Failed to update user data due to an internal error.",
                error
            );
        }
        case "No updates provided.": {
            throw new ChalkInternalException(
                400,
                "No fields were provided to update.",
                error
            );
        }
        case "Couldn't update user.": {
            throw new ChalkInternalException(
                500,
                "Failed to update user data due to an internal error.",
                error
            );
        }
        case "Update displayName is too long.": {
            throw new ChalkInternalException(
                400,
                "Display name is too long.",
                error
            );
        }
        case "Update displayName's length is zero.": {
            throw new ChalkInternalException(
                400,
                "Display name cannot be empty.",
                error
            );
        }
        default: {
            throw new Error(`Unhandled error: ${errorReason satisfies never}`);
        }
    }
}
