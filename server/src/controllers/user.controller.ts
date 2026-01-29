import express from "express";
import type { NextFunction, Response, Request } from "express";

// This will help us connect to the database
import db from "../db/connection.js";

// This help convert the id from string to ObjectId for the _id.
import { ObjectId } from "mongodb";

export async function getAllUsers(req: Request, res: Response) {
    const collection = await db.collection("users");
    const results = await collection.find({}).toArray();
    res.send(results).status(200);
}

export async function getUser(req: Request, res: Response) {
    try {
        const id = req.params.id;
        if (typeof id !== "string" || !ObjectId.isValid(id))
            throw new Error("invalid");
        const collection = await db.collection("users");
        const query = { _id: new ObjectId(id) };
        const result = await collection.findOne(query);

        if (!result) res.send("Not found").status(404);
        else res.send(result).status(200);
    } catch (err) {
        res.status(500).send("Error adding user");
    }
}

export async function createUser(req: Request, res: Response) {
    try {
        const newDocument = {
            email: req.body.email,
            displayname: req.body.name,
        };
        const collection = await db.collection("users");
        const result = await collection.insertOne(newDocument);
        res.send(result).status(204);
    } catch (err) {
        console.error(err);
        res.status(500).send("Error adding user");
    }
}

export async function updateUser(req: Request, res: Response) {
    try {
        const id = req.params.id;
        if (typeof id !== "string" || !ObjectId.isValid(id))
            throw new Error("invalid");
        const query = { _id: new ObjectId(id) };
        const updates = {
            $set: {
                email: req.body.email,
                displayname: req.body.name,
            },
        };

        const collection = await db.collection("users");
        const result = await collection.updateOne(query, updates);
        res.send(result).status(200);
    } catch (err) {
        console.error(err);
        res.status(500).send("Error updating user");
    }
}

export async function deleteUser(req: Request, res: Response) {
    try {
        const id = req.params.id;
        if (typeof id !== "string" || !ObjectId.isValid(id))
            throw new Error("invalid");
        const query = { _id: new ObjectId(id) };

        const collection = db.collection("users");
        const result = await collection.deleteOne(query);

        res.send(result).status(200);
    } catch (err) {
        console.error(err);
        res.status(500).send("Error deleting user");
    }
}
