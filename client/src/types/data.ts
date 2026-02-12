import { WorldObject } from "./canvas";

export type Result<T> =
    | { success: true; data: T }
    | { success: false; error: string };

export interface UserData {
    displayName: string;
    role: string;
    id: string;
}

export interface ObjectlessBoardData {
    id: string;
    name: string;
    createdOn: Date;
    lastOpened: Date;
}
export interface BoardData extends ObjectlessBoardData {
    objects: WorldObject[];
}
