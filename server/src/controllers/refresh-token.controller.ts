import express from "express";
import type { NextFunction, Response, Request } from "express";

// This will help us connect to the database
import db from "../db/mongo.js";

// This help convert the id from string to ObjectId for the _id.
import { ObjectId } from "mongodb";
import * as GuestUserService from "../services/guest-user.service.js";
import jwt from "jsonwebtoken";

export async function getAll(req: Request, res: Response) {
    try {
        const users = await GuestUserService.getAllGuestUsers();
        res.status(200).json({ data: users });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch guest users" });
    }
}

export async function getById(req: Request, res: Response) {
    try {
        const id = req.params.id as string;
        const guestUser = await GuestUserService.getGuestUserById(id);
        if (!guestUser)
            return res.status(404).json({ error: "Guest user not found" });
        res.status(200).json({ data: guestUser });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch guest user" });
    }
}

export async function create(req: Request, res: Response) {
    try {
        const guestUserId = await GuestUserService.createGuestUser();

        // guest token never expires by design.
        const accessToken = jwt.sign(
            { id: guestUserId, role: "guest" },
            process.env.JWT_SECRET!,
            {
                expiresIn: "1d",
            }
        );

        res.cookie("access-token", accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
        }).sendStatus(204);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to create guest user" });
    }
}

export async function update(req: Request, res: Response) {
    try {
        const { displayName } = req.body;
        const result = await GuestUserService.updateGuestUser(
            req.params.id as string,
            displayName
        );
        res.status(200).json({ data: result });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update guest user" });
    }
}

export async function remove(req: Request, res: Response) {
    try {
        const result = await GuestUserService.deleteGuestUser(
            req.params.id as string
        );
        res.status(200).json({ data: result });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to delete guest user" });
    }
}
