import { Vec2, WorldObject } from "./canvas";

export type Result<T> =
    | { success: true; data: T }
    | { success: false; error: string };

export interface ChalkData {
    userData: UserData;
    boards: BoardData[];
    currentBoardId: string;
}

export interface UserData {
    displayName: string;
    role: string;
    id: string;
    createdOn: Date;
    email: string | undefined; // Undefined if user is guest
}

export interface ObjectlessBoardData {
    id: string;
    name: string;
    createdOn: Date;
    lastOpened: Date;
    lastCameraPosition: Vec2;
    lastCameraZoom: number;
}
export interface BoardData extends ObjectlessBoardData {
    objects: WorldObject[];
}
