import { BoardData, ObjectlessBoardData, UserData } from "../types/data";
import { fetchHelper } from ".";
import { Result } from "../types/data";
import { WorldObject } from "../types/canvas";

export async function getAllBoards(): Promise<ObjectlessBoardData[]> {
    const result = await fetchHelper<ObjectlessBoardData[]>(
        "me/boards/",
        "GET"
    );
    if (!result.success) {
        console.log("Error executing getBoardData: " + result.error);
        throw Error(result.error);
    }

    return result.data;
}

export async function getBoardById(id: string): Promise<BoardData> {
    const result = await fetchHelper<BoardData>(`me/boards/${id}`, "GET");
    if (!result.success) {
        console.log("Error executing getBoardById: " + result.error);
        throw Error(result.error);
    }

    return result.data;
}

export async function createBoard(name: string) {
    const result = await fetchHelper<ObjectlessBoardData>(
        "me/boards/",
        "POST",
        { name }
    );
    if (!result.success) {
        console.log("Error executing createBoard: " + result.error);
        throw Error(result.error);
    }

    return result.data as ObjectlessBoardData;
}

export async function updateBoardObjects(
    boardId: string,
    objects: WorldObject[]
) {
    const result = await fetchHelper<undefined>(
        `me/boards/${boardId}/objects`,
        "POST",
        { objects }
    );

    if (!result.success) {
        console.log("Error executing updateBoardObjects: " + result.error);
        throw Error(result.error);
    }

    return;
}
