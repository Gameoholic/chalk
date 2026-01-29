import db from "../db/mongo.js";
import { ObjectId } from "mongodb";

const collection = db.collection("users");

export interface User {
    _id?: ObjectId;
    email: string;
    password: string;
    displayname: string;
}

export async function createUser(user: User) {
    const result = await collection.insertOne(user);
    return result;
}

export async function updateUser(id: string, updates: Partial<User>) {
    if (!ObjectId.isValid(id)) throw new Error("Invalid ID");
    const query = { _id: new ObjectId(id) };
    const updateDoc = { $set: updates };
    const result = await collection.updateOne(query, updateDoc);
    return result;
}

export async function deleteUser(id: string) {
    if (!ObjectId.isValid(id)) throw new Error("Invalid ID");
    const query = { _id: new ObjectId(id) };
    const result = await collection.deleteOne(query);
    return result;
}

export async function findUserById(id: string) {
    if (!ObjectId.isValid(id)) throw new Error("Invalid ID");
    const result = await collection.findOne({ _id: new ObjectId(id) });
    return result;
}

export async function findAllUsers() {
    return collection.find({}).toArray();
}

export async function findUserByEmail(email: string) {
    return collection.findOne({ email });
}
