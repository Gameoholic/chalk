import express from "express";
import type { NextFunction, Response, Request } from "express";

// This will help us connect to the database
import db from "../db/mongo.js";

// This help convert the id from string to ObjectId for the _id.
import { ObjectId } from "mongodb";
import * as UserService from "../services/user.service.js";

export async function getAll(req: Request, res: Response) {
    try {
        const users = await UserService.getAllUsers();
        res.status(200).json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch users" });
    }
}

export async function getById(req: Request, res: Response) {
    try {
        const id = req.params.id as string;
        const user = await UserService.getUserById(id);
        if (!user) return res.status(404).json({ error: "User not found" });
        res.status(200).json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch user" });
    }
}

export async function create(req: Request, res: Response) {
    try {
        const { email, password, displayname } = req.body;
        const result = await UserService.createUser(
            email,
            password,
            displayname
        );
        res.status(201).json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to create user" });
    }
}

export async function update(req: Request, res: Response) {
    try {
        const { email, name } = req.body;
        const result = await UserService.updateUser(
            req.params.id as string,
            email,
            name
        );
        res.status(200).json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update user" });
    }
}

export async function remove(req: Request, res: Response) {
    try {
        const result = await UserService.deleteUserService(
            req.params.id as string
        );
        res.status(200).json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to delete user" });
    }
}
