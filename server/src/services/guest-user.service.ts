import { ObjectId } from "mongodb";
import * as GuestUserModel from "../models/guest-user.model.js";
import * as AuthService from "../services/auth.service.js";
import bcrypt from "bcrypt";
import crypto from "crypto";

export async function getAllGuestUsers() {
    return GuestUserModel.findAllGuestUsers();
}

export async function getGuestUserById(id: string) {
    // return GuestUserModel.findGuestUserById(id);
}

export async function createGuestUser() {
    const guestUser: GuestUserModel.GuestUser = {
        displayName: "Guest",
    };

    const insertedUser = await GuestUserModel.createGuestUser(guestUser);
    const initialRefreshToken = await AuthService.issueRefreshToken(
        insertedUser.insertedId.toString(),
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
    return GuestUserModel.deleteGuestUser(id);
}
