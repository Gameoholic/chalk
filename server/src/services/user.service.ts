import { ObjectId } from "mongodb";
import * as User from "../models/user.model.js";
import * as UserModel from "../models/user.model.js";
import bcrypt from "bcrypt";
import * as GuestUserService from "../services/guest-user.service.js";
import * as BoardService from "../services/board.service.js";
import * as AuthService from "../services/auth.service.js";

export async function getAllUsers() {
    return UserModel.findAllUsers();
}

export async function getUserById(id: string) {
    if (!ObjectId.isValid(id)) {
        throw new Error("Invalid user id");
    }
    const result = await UserModel.findUserById(new ObjectId(id));
    if (!result) {
        throw new Error("User doesn't exist");
    }
    return result;
}

export async function createUser(
    currentGuestUserId: string,
    email: string,
    plaintextPassword: string,
    displayName: string
) {
    if (plaintextPassword.length === 0 || plaintextPassword.length > 100) {
        throw new Error("Password invalid.");
    }
    if (displayName.length === 0 || displayName.length > 100) {
        throw new Error("Display name invalid.");
    }
    if (email.length === 0 || email.length > 100) {
        throw new Error("Email invalid.");
    }

    if (!ObjectId.isValid(currentGuestUserId)) {
        throw new Error("Invalid guest user id");
    }

    //todo :this entire shit that follows should probably be a transaction

    try {
        await GuestUserService.deleteGuestUser(currentGuestUserId);
    } catch (err) {
        throw new Error("Couldn't delete guest user");
    }

    const salt = await bcrypt.genSalt(Number(process.env.BCRYPT_SALT_ROUNDS));
    const password = await bcrypt.hash(plaintextPassword, salt);

    const newUser: UserModel.User = {
        email,
        password,
        displayName,
    };

    const user = await UserModel.createUser(newUser);

    const userBoardLength =
        await BoardService.transferOwnershipOfAllBoardsBelongingToUser(
            currentGuestUserId,
            user.insertedId.toString()
        );
    if (userBoardLength === 0) {
        throw new Error("Boards couldn't be transferred.");
    }

    const initialRefreshToken = await AuthService.issueRefreshToken(
        user.insertedId.toString(),
        "user"
    );
    const tokens = await AuthService.refreshTokens(initialRefreshToken); // We do this because we need an access token

    return tokens;
}

export async function updateUser(
    id: string,
    email?: string,
    displayname?: string
) {
    const updates: Partial<UserModel.User> = {};
    if (email) updates.email = email;
    if (displayname) updates.displayName = displayname;
    return UserModel.updateUser(id, updates);
}

export async function deleteUserService(id: string) {
    return UserModel.deleteUser(id);
}
