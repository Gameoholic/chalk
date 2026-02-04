import db from "../db/mongo.js";
import { ObjectId, type WithId } from "mongodb";

const collection = db.collection<RefreshToken>("refresh-tokens");

export interface RefreshToken {
    _id?: ObjectId;
}

export async function createRefreshToken(refreshToken: RefreshToken) {
    const result = await collection.insertOne(refreshToken);
    return result;
}

export async function deleteRefreshToken(id: ObjectId) {
    // todo: in al lservices, check this: if (!ObjectId.isValid(id)) throw new Error("Invalid ID");
    const query = { _id: id };
    const result = await collection.deleteOne(query);
    return result;
}

export async function findRefreshTokenById(
    id: ObjectId
): Promise<WithId<RefreshToken> | null> {
    return collection.findOne({ _id: id });
}
