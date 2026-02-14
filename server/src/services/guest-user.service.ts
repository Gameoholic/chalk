import { ObjectId } from "mongodb";
import * as GuestUserModel from "../models/guest-user.model.js";
import * as AuthService from "../services/auth.service.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { err, ok } from "../types/result.types.js";

export async function getGuestUserById(id: string) {
    if (!ObjectId.isValid(id)) {
        return err({ reason: "Guest user ID is invalid." });
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
                    reason: "Couldn't search for user.",
                    previousError: error,
                });
            }
            case "Unknown error and unknown type.": {
                return err({
                    reason: "Couldn't search for user.",
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

    const data = result.data;
    return ok(data);
}

export async function createGuestUser() {
    const guestUser: GuestUserModel.GuestUser = {
        displayName: "Guest",
        createdOn: new Date(),
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
                    reason: "Couldn't create guest user.",
                    previousError: error,
                });
            }
            case "Unknown error and unknown type.": {
                return err({
                    reason: "Couldn't create guest user.",
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

    const guestUserId = createUserResult.data.toString();

    const issueTokensResult = await AuthService.issueNewTokens(
        guestUserId,
        "guest"
    );

    if (!issueTokensResult.success) {
        const error = issueTokensResult.error;
        const errorReason = error.reason;
        switch (errorReason) {
            case "Couldn't issue initial refresh token.": {
                return err({
                    reason: "Couldn't issue tokens.",
                    previousError: error,
                });
            }
            case "Couldn't issue tokens.": {
                return err({
                    reason: "Couldn't issue tokens.",
                    previousError: error,
                });
            }
            case "User ID is invalid.": {
                return err({
                    reason: "Couldn't issue tokens.",
                    previousError: error,
                });
            }
            case "User's role is invalid.": {
                return err({
                    reason: "Couldn't issue tokens.",
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

    const tokens = issueTokensResult.data;

    return ok(tokens);
}

export async function deleteGuestUser(id: string) {
    if (!ObjectId.isValid(id)) {
        return err({ reason: "Guest user ID is invalid." });
    }

    const result = await GuestUserModel.deleteGuestUser(new ObjectId(id));

    if (!result.success) {
        const error = result.error;
        const errorReason = error.reason;
        switch (errorReason) {
            case "Couldn't find guest user.": {
                return err({
                    reason: "Couldn't find guest user.",
                    previousError: error,
                });
            }
            case "MongoDB did not acknowledge the operation.": {
                return err({
                    reason: "Couldn't delete guest user.",
                    previousError: error,
                });
            }
            case "Unknown error.": {
                return err({
                    reason: "Couldn't delete guest user.",
                    previousError: error,
                });
            }
            case "Unknown error and unknown type.": {
                return err({
                    reason: "Couldn't delete guest user.",
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

export async function updateGuestUser(
    id: string,
    updates: { displayName?: string }
) {
    if (!ObjectId.isValid(id)) {
        return err({ reason: "Guest user ID is invalid." });
    }

    // Whenever we add a possible update to the function params, add it to the check here
    if (updates.displayName === undefined) {
        return err({ reason: "No updates provided." });
    }

    if (updates.displayName !== undefined) {
        if (updates.displayName.length === 0) {
            return err({ reason: "Update displayname is empty." });
        }
        if (
            updates.displayName.length >
            Number(process.env.DISPLAY_NAME_MAX_LENGTH) // todo: all process.env parameters should be loaded on app load, because we could crash here if it wasn't provided, we don't check on app load so this could happen.
        ) {
            return err({ reason: "Update displayname is too long." });
        }
    }

    const updatePartial: Partial<GuestUserModel.GuestUser> = {};
    // Whenever we add a possible update to the function params, add it to the partial here
    if (updates.displayName !== undefined) {
        updatePartial.displayName = updates.displayName;
    }

    const result = await GuestUserModel.updateGuestUser(
        new ObjectId(id),
        updates
    );

    if (!result.success) {
        const error = result.error;
        const errorReason = error.reason;

        switch (errorReason) {
            case "Couldn't find user.": {
                return err({
                    reason: "Couldn't find user.",
                    previousError: error,
                });
            }
            case "Couldn't update user.": {
                return err({
                    reason: "Couldn't update user.",
                    previousError: error,
                });
            }
            case "MongoDB did not acknowledge the operation.": {
                return err({
                    reason: "Couldn't update user.",
                    previousError: error,
                });
            }
            case "Unknown error.": {
                return err({
                    reason: "Couldn't update user.",
                    previousError: error,
                });
            }
            case "Unknown error and unknown type.": {
                return err({
                    reason: "Couldn't update user.",
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
