/**
 * This service is a bridge between the me controller and the user/guest-user services.
 */

import jwt, { type JwtPayload } from "jsonwebtoken";
import bcrypt from "bcrypt";
import * as GuestUserService from "../services/guest-user.service.js";
import * as UserService from "../services/user.service.js";
import * as RefreshTokenService from "../services/refresh-token.service.js";
import { ObjectId, type WithId } from "mongodb";
import type { StringValue } from "ms";
import { err, ok } from "../types/result.types.js";
import * as UserModel from "../models/user.model.js";

// todo: small improvement, can escape the switch of the error handling out of the if to avoid
// repeating cases that are the same for both user and guest user

/**
 * @returns Data for user/guest user (displayname and createdOn)
 */
export async function getUserData(userId: string, userRole: string) {
    if (!ObjectId.isValid(userId)) {
        return err({ reason: "User ID is invalid." });
    }

    if (userRole === "guest") {
        const result = await GuestUserService.getGuestUserById(userId);

        if (!result.success) {
            const error = result.error;
            const errorReason = error.reason;

            switch (errorReason) {
                case "Couldn't search for guest user.": {
                    return err({
                        reason: "Couldn't search for user.",
                        previousError: error,
                    });
                }
                case "Guest user doesn't exist.": {
                    return err({
                        reason: "User doesn't exist.",
                        previousError: error,
                    });
                }
                case "Guest user ID is invalid.": {
                    return err({
                        reason: "User ID is invalid.",
                        previousError: error,
                    });
                }

                default: {
                    throw new Error(
                        `Unhandled error: ${errorReason satisfies never}`
                    );
                }
            }
        }
        return ok({ ...result.data, email: undefined }); // users have email field, and this method must return the same success type. might rewrite this in the future but ok for now
    } else if (userRole === "user") {
        const result = await UserService.getUserById(userId);

        if (!result.success) {
            const error = result.error;
            const errorReason = error.reason;

            switch (errorReason) {
                case "Couldn't search for user.": {
                    return err({
                        reason: "Couldn't search for user.",
                        previousError: error,
                    });
                }
                case "User doesn't exist.": {
                    return err({
                        reason: "User doesn't exist.",
                        previousError: error,
                    });
                }
                case "User ID is invalid.": {
                    return err({
                        reason: "User ID is invalid.",
                        previousError: error,
                    });
                }

                default: {
                    throw new Error(
                        `Unhandled error: ${errorReason satisfies never}`
                    );
                }
            }
        }
        return ok(result.data);
    }
    return err({ reason: "User's role is invalid" });
}

export async function updateUser(
    userId: string,
    userRole: string,
    updates: { displayName?: string }
) {
    if (!ObjectId.isValid(userId)) {
        return err({ reason: "User ID is invalid." });
    }

    // If we want to only allow certain updates for certain roles, make the check here.
    // For example: if (userRole === "guest" && updates.displayName !== undefined) return err("Guest users cannot change their displayname")

    if (userRole === "guest") {
        const result = await GuestUserService.updateGuestUser(userId, updates);

        if (!result.success) {
            const error = result.error;
            const errorReason = error.reason;

            switch (errorReason) {
                case "Guest user ID is invalid.": {
                    return err({
                        reason: "User ID is invalid.",
                        previousError: error,
                    });
                }
                case "Couldn't update guest user.": {
                    return err({
                        reason: "Couldn't update user.",
                        previousError: error,
                    });
                }
                case "Couldn't find guest user.": {
                    return err({
                        reason: "User doesn't exist.",
                        previousError: error,
                    });
                }

                case "No updates provided.": {
                    return err({
                        reason: "No updates provided.",
                        previousError: error,
                    });
                }

                case "Update displayName is too long.": {
                    return err({
                        reason: "Update displayName is too long.",
                        previousError: error,
                    });
                }

                case "Update displayName's length is zero.": {
                    return err({
                        reason: "Update displayName's length is zero.",
                        previousError: error,
                    });
                }

                default: {
                    throw new Error(
                        `Unhandled error: ${errorReason satisfies never}`
                    );
                }
            }
        }
        return ok(undefined);
    } else if (userRole === "user") {
        const result = await UserService.updateUser(userId, updates);

        if (!result.success) {
            const error = result.error;
            const errorReason = error.reason;

            switch (errorReason) {
                case "User ID is invalid.": {
                    return err({
                        reason: "User ID is invalid.",
                        previousError: error,
                    });
                }
                case "Couldn't update user.": {
                    return err({
                        reason: "Couldn't update user.",
                        previousError: error,
                    });
                }
                case "Couldn't find user.": {
                    return err({
                        reason: "User doesn't exist.",
                        previousError: error,
                    });
                }

                case "No updates provided.": {
                    return err({
                        reason: "No updates provided.",
                        previousError: error,
                    });
                }

                case "Update displayName is too long.": {
                    return err({
                        reason: "Update displayName is too long.",
                        previousError: error,
                    });
                }

                case "Update displayName's length is zero.": {
                    return err({
                        reason: "Update displayName's length is zero.",
                        previousError: error,
                    });
                }

                default: {
                    throw new Error(
                        `Unhandled error: ${errorReason satisfies never}`
                    );
                }
            }
        }
        return ok(undefined);
    }
    return err({ reason: "User's role is invalid" });
}
