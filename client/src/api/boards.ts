import { BoardData, ObjectlessBoardData, UserData } from "../types/data";
import { fetchHelper } from ".";
import { Result } from "../types/data";
import { Vec2, WorldObject } from "../types/canvas";

// export async function getAllBoards(): Promise<ObjectlessBoardData[]> {
//     const result = await fetchHelper<ObjectlessBoardData[]>(
//         "me/boards/",
//         "GET"
//     );
//     if (!result.success) {
//         console.error("Error executing getBoardData: " + result.error);
//         throw Error(result.error);
//     }

//     return result.data;
// }

export async function getAllBoards(): Promise<BoardData[]> {
    const result = await fetchHelper<BoardData[]>("me/boards/", "GET");
    if (!result.success) {
        console.error("Error executing getBoardData: " + result.error);
        throw Error(result.error);
    }

    return result.data;
}

export async function getBoardById(id: string): Promise<BoardData> {
    const result = await fetchHelper<BoardData>(`me/boards/${id}`, "GET");
    if (!result.success) {
        console.error("Error executing getBoardById: " + result.error);
        throw Error(result.error);
    }

    return result.data;
}

export async function createBoard(name: string) {
    const result = await fetchHelper<{ id: string; createdOn: Date }>(
        "me/boards/",
        "POST",
        {
            name,
        }
    );
    if (!result.success) {
        console.error("Error executing createBoard: " + result.error);
        throw Error(result.error);
    }

    return result.data;
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
        console.error("Error executing updateBoardObjects: " + result.error);
        throw Error(result.error);
    }

    return;
}

export async function updateBoardName(boardId: string, name: string) {
    const result = await fetchHelper<undefined>(`me/boards/${boardId}`, "PUT", {
        name,
    });

    if (!result.success) {
        console.error("Error executing updateBoardName: " + result.error);
        throw Error(result.error);
    }

    return;
}

export async function updateBoardCamera(
    boardId: string,
    cameraPosition: Vec2,
    caemraZoom: number
) {
    const result = await fetchHelper<undefined>(`me/boards/${boardId}`, "PUT", {
        lastCameraPosition: cameraPosition,
        lastCameraZoom: caemraZoom,
    });

    if (!result.success) {
        console.error("Error executing updateBoardCamera: " + result.error);
        throw Error(result.error);
    }

    return;
}

export async function resetBoard(boardId: string) {
    const result = await fetchHelper<undefined>(`me/boards/${boardId}`, "PUT", {
        objects: [],
    });

    if (!result.success) {
        console.error("Error executing resetBoard: " + result.error);
        throw Error(result.error);
    }

    return;
}
