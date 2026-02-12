import { ObjectId } from "mongodb";
import * as GuestUserModel from "../models/guest-user.model.js";
import * as AuthService from "../services/auth.service.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { err, ok } from "../types/result.types.js";

export async function getGuestUserById(id: string) {
    if (!ObjectId.isValid(id)) {
        return err({ reason: "User ID is invalid." });
    }

    const result = await GuestUserModel.findGuestUserById(new ObjectId(id));

    if (!result.success) {
        const error = result.error;
        const errorReason = error.reason;
        switch (errorReason) {
            case "Couldn't find user.": {
                return err({
                    reason: "User doesn't exist.",
                    previousError: error,
                });
            }
            case "Unknown error.": {
                return err({
                    reason: "Couldn't count boards.",
                    previousError: error,
                });
            }
            case "Unknown error and unknown type.": {
                return err({
                    reason: "Couldn't count boards.",
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

export async function createGuestUser() {
    const guestUser: GuestUserModel.GuestUser = {
        displayName: "Guest",
    };

    const createUserResult = await GuestUserModel.createGuestUser(guestUser);

    if (!createUserResult.success) {
        const error = createUserResult.error;
        const errorReason = error.reason;
        switch (errorReason) {
            case "MongoDB did not acknowledge the operation.": {
                return err({
                    reason: "Couldn't create guest user.",
                    previousError: error,
                });
            }
            case "Unknown error.": {
                return err({
                    reason: "Couldn't count boards.",
                    previousError: error,
                });
            }
            case "Unknown error and unknown type.": {
                return err({
                    reason: "Couldn't count boards.",
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

    const guestUserId = createUserResult.data;
    // I STOPPED RIGHT HERE LAST TIME.
    // I STOPPED RIGHT HERE LAST TIME.
    // I STOPPED RIGHT HERE LAST TIME.
    // I STOPPED RIGHT HERE LAST TIME.
    // I STOPPED RIGHT HERE LAST TIME.
    // I STOPPED RIGHT HERE LAST TIME.
    // I STOPPED RIGHT HERE LAST TIME.
    // I STOPPED RIGHT HERE LAST TIME.
    // I STOPPED RIGHT HERE LAST TIME.
    // I STOPPED RIGHT HERE LAST TIME.
    // I STOPPED RIGHT HERE LAST TIME.
    // I STOPPED RIGHT HERE LAST TIME.
    // I STOPPED RIGHT HERE LAST TIME.
    // I STOPPED RIGHT HERE LAST TIME.
    // I STOPPED RIGHT HERE LAST TIME.
    // I STOPPED RIGHT HERE LAST TIME.
    // I STOPPED RIGHT HERE LAST TIME.
    // I STOPPED RIGHT HERE LAST TIME.
    // I STOPPED RIGHT HERE LAST TIME.
    // I STOPPED RIGHT HERE LAST TIME.
    // I STOPPED RIGHT HERE LAST TIME.
    // I STOPPED RIGHT HERE LAST TIME.
    // I STOPPED RIGHT HERE LAST TIME.
    // I STOPPED RIGHT HERE LAST TIME.
    // I STOPPED RIGHT HERE LAST TIME.

    const initialRefreshToken = await AuthService.issueRefreshToken(
        guestUserId.toString(),
        "guest"
    );
    const tokens = await AuthService.refreshTokens(initialRefreshToken); // We do this because we need an access token
    return tokens;
}

export async function updateGuestUser(id: string, displayName?: string) {
    const updates: Partial<GuestUserModel.GuestUser> = {};
    if (displayName) updates.displayName = displayName;
    return GuestUserModel.updateGuestUser(id, updates);
}

export async function deleteGuestUser(id: string) {
    const result = await GuestUserModel.deleteGuestUser(id);
    if (result.deletedCount === 0) {
        throw new Error("Couldn't delete guest user");
    }
}
