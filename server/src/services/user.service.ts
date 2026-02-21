import { ObjectId } from "mongodb";
import * as User from "../models/user.model.js";
import * as UserModel from "../models/user.model.js";
import bcrypt from "bcrypt";
import * as GuestUserService from "../services/guest-user.service.js";
import * as BoardService from "../services/board.service.js";
import * as AuthService from "../services/auth.service.js";
import { err, ok } from "../types/result.types.js";

export async function getUserById(id: string) {
    if (!ObjectId.isValid(id)) {
        return err({ reason: "User ID is invalid." });
    }

    const result = await UserModel.findUserById(new ObjectId(id));

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

    const userData = {
        id: id,
        email: result.data.email,
        displayName: result.data.displayName,
        password: result.data.password,
        createdOn: result.data.createdOn,
    };

    return ok(userData);
}

export async function getUserByEmail(email: string) {
    const result = await UserModel.findUserByEmail(email);

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

    const data = {
        id: result.data._id.toString(),
        email: email,
        displayName: result.data.displayName,
        password: result.data.password,
    };
    return ok(data);
}

export async function createUser(
    currentGuestUserId: string,
    email: string,
    plaintextPassword: string,
    displayName: string
) {
    if (!ObjectId.isValid(currentGuestUserId)) {
        return err({ reason: "Guest user ID is invalid." });
    }

    if (plaintextPassword.length === 0) {
        return err({ reason: "Password cannot be empty." });
    }
    // Hard-coded limit to prevent abuse (hashed anyway, so...)
    if (plaintextPassword.length > 500) {
        return err({ reason: "Password is invalid." });
    }

    if (displayName.length > Number(process.env.DISPLAY_NAME_MAX_LENGTH!)) {
        return err({ reason: "Display name is too long." });
    }
    if (displayName.length === 0) {
        return err({ reason: "Display name cannot be empty." });
    }

    if (email.length === 0) {
        return err({ reason: "Email cannot be empty." });
    }
    // Hard-coded limit to prevent abuse
    if (email.length > 500) {
        return err({ reason: "Email is invalid." });
    }

    //todo :this entire shit that follows should probably be a transaction somehow.

    const deleteGuestUserReuslt =
        await GuestUserService.deleteGuestUser(currentGuestUserId);

    if (!deleteGuestUserReuslt.success) {
        const error = deleteGuestUserReuslt.error;
        const errorReason = error.reason;
        switch (errorReason) {
            case "Couldn't find guest user.": {
                return err({
                    reason: "Couldn't find guest user.",
                    previousError: error,
                });
            }
            case "Guest user ID is invalid.": {
                return err({
                    reason: "Guest user ID is invalid.",
                    previousError: error,
                });
            }
            case "Couldn't delete guest user.": {
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

    const salt = await bcrypt.genSalt(Number(process.env.BCRYPT_SALT_ROUNDS));
    const password = await bcrypt.hash(plaintextPassword, salt);

    const newUser: UserModel.User = {
        email,
        password,
        createdOn: new Date(),
        displayName,
    };

    const createUserResult = await UserModel.createUser(newUser);

    if (!createUserResult.success) {
        const error = createUserResult.error;
        const errorReason = error.reason;
        switch (errorReason) {
            case "MongoDB did not acknowledge the operation.": {
                return err({
                    reason: "Couldn't create user.",
                    previousError: error,
                });
            }
            case "Unknown error.": {
                return err({
                    reason: "Couldn't create user.",
                    previousError: error,
                });
            }
            case "Unknown error and unknown type.": {
                return err({
                    reason: "Couldn't create user.",
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

    const createdUserId = createUserResult.data.toString();

    const transferBoardsResult =
        await BoardService.transferOwnershipOfAllBoardsBelongingToUser(
            new ObjectId(currentGuestUserId),
            new ObjectId(createdUserId)
        );

    if (!transferBoardsResult.success) {
        const error = transferBoardsResult.error;
        const errorReason = error.reason;
        switch (errorReason) {
            case "No boards found for the old user.": {
                return err({
                    reason: "No boards found for the guest user.",
                    previousError: error,
                });
            }
            case "Couldn't transfer ownership of boards.": {
                return err({
                    reason: "Couldn't transfer ownership of boards.",
                    previousError: error,
                });
            }
            case "From and To user ids are the same.": {
                return err({
                    reason: "Couldn't transfer ownership of boards.",
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

    const issueTokensResult = await AuthService.issueNewTokens(
        createdUserId,
        "user"
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

export async function updateUser(
    userId: string,
    updates: { displayName?: string }
) {
    if (!ObjectId.isValid(userId)) {
        return err({ reason: "User ID is invalid." });
    }

    // Whenever we add a possible update to the function params, add it to the check here
    if (updates.displayName === undefined) {
        return err({ reason: "No updates provided." });
    }

    if (updates.displayName !== undefined) {
        if (updates.displayName.length === 0) {
            return err({ reason: "Update displayName's length is zero." });
        }
        if (
            updates.displayName.length >
            Number(process.env.DISPLAY_NAME_MAX_LENGTH) // todo: all process.env parameters should be loaded on app load, because we could crash here if it wasn't provided, we don't check on app load so this could happen.
        ) {
            return err({ reason: "Update displayName is too long." });
        }
    }

    const updatePartial: Partial<UserModel.User> = {};
    // Whenever we add a possible update to the function params, add it to the partial here
    if (updates.displayName !== undefined) {
        updatePartial.displayName = updates.displayName;
    }

    const result = await UserModel.updateUser(new ObjectId(userId), updates);

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
