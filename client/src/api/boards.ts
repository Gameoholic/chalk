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

export async function upsertBoardObjects(
    boardId: string,
    objects: WorldObject[]
) {
    const result = await fetchHelper<undefined>(
        `me/boards/${boardId}/objects`,
        "POST",
        { objects }
    );

    if (!result.success) {
        console.error("Error executing upsertBoardObjects: " + result.error);
        throw Error(result.error);
    }

    return;
}

export async function deleteBoardObjects(
    boardId: string,
    objectIds: Set<string>
) {
    const result = await fetchHelper<undefined>(
        `me/boards/${boardId}/objects`,
        "DELETE",
        { objectIds: [...objectIds] }
    );

    if (!result.success) {
        console.error("Error executing deleteBoardObjects: " + result.error);
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

export async function updateBoardLastOpened(boardId: string) {
    const result = await fetchHelper<undefined>(`me/boards/${boardId}`, "PUT", {
        lastOpened: true,
    });

    if (!result.success) {
        console.error("Error executing updateBoardLastOpened: " + result.error);
        throw Error(result.error);
    }

    return;
}

export async function updateBoardCameraPosition(
    boardId: string,
    cameraPosition: Vec2
) {
    const result = await fetchHelper<undefined>(`me/boards/${boardId}`, "PUT", {
        lastCameraPosition: cameraPosition,
    });

    if (!result.success) {
        console.error(
            "Error executing updateBoardCameraPosition: " + result.error
        );
        throw Error(result.error);
    }

    return;
}

export async function updateBoardCameraZoom(
    boardId: string,
    cameraZoom: number
) {
    const result = await fetchHelper<undefined>(`me/boards/${boardId}`, "PUT", {
        lastCameraZoom: cameraZoom,
    });

    if (!result.success) {
        console.error(
            "Error executing updateBoardCameraZooom: " + result.error
        );
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

export async function deleteBoard(boardId: string) {
    const result = await fetchHelper<undefined>(
        `me/boards/${boardId}`,
        "DELETE"
    );

    if (!result.success) {
        console.error("Error executing deleteBoard: " + result.error);
        throw Error(result.error);
    }

    return;
}
