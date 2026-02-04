import db from "../db/mongo.js";
import { ObjectId } from "mongodb";

const collection = db.collection<GuestUser>("guest-users");

export interface GuestUser {
    _id?: ObjectId;
    displayName: string;
}

export async function createGuestUser(guestUser: GuestUser) {
    const result = await collection.insertOne(guestUser);
    return result;
}

export async function updateGuestUser(id: string, updates: Partial<GuestUser>) {
    if (!ObjectId.isValid(id)) throw new Error("Invalid ID");
    const query = { _id: new ObjectId(id) };
    const updateDoc = { $set: updates };
    const result = await collection.updateOne(query, updateDoc);
    return result;
}

export async function deleteGuestUser(id: string) {
    if (!ObjectId.isValid(id)) throw new Error("Invalid ID");
    const query = { _id: new ObjectId(id) };
    const result = await collection.deleteOne(query);
    return result;
}

export async function findGuestUserById(id: ObjectId) {
    const result = await collection.findOne({ _id: id });
    return result;
}

export async function findAllGuestUsers() {
    return collection.find({}).toArray();
}
