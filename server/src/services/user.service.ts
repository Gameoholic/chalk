import { ObjectId } from "mongodb";
import * as User from "../models/user.model.js";
import * as UserModel from "../models/user.model.js";
import bcrypt from "bcrypt";

export async function getAllUsers() {
    return UserModel.findAllUsers();
}

export async function getUserById(id: string) {
    return UserModel.findUserById(id);
}

export async function createUser(
    email: string,
    plaintextPassword: string,
    displayname: string
) {
    const salt = await bcrypt.genSalt(Number(process.env.BCRYPT_SALT_ROUNDS));
    const password = await bcrypt.hash(plaintextPassword, salt);

    const newUser: UserModel.User = { email, password, displayname };

    return UserModel.createUser(newUser);
}

export async function updateUser(
    id: string,
    email?: string,
    displayname?: string
) {
    const updates: Partial<UserModel.User> = {};
    if (email) updates.email = email;
    if (displayname) updates.displayname = displayname;
    return UserModel.updateUser(id, updates);
}

export async function deleteUserService(id: string) {
    return UserModel.deleteUser(id);
}
