import { createContext, useContext, useState } from "react";
import { BoardData, ChalkData, UserData } from "./data";
import { WorldObject } from "./canvas";
import { SessionContext } from "./SessionContext";
import { ViewportEventHandler } from "framer-motion";

interface CanvasContextType {
    currentBoardId: string;
    setCurrentBoardId: React.Dispatch<React.SetStateAction<string>>;
    getCurrentBoard: () => BoardData;
    updateCurrentBoard: (boardData: BoardData) => void;
    updateCurrentBoardObjects: (objects: WorldObject[]) => void;
    onCurrentBoardObjectsSaved: (savedObjects: WorldObject[]) => void;
}

export const CanvasContext = createContext<CanvasContextType>(null!);

export function CanvasContextProvider({
    children,
    defaultBoardId: defaultBoardId,
}: {
    children: React.ReactNode;
    defaultBoardId: string;
}) {
    const sessionContext = useContext(SessionContext);
    const [currentBoardId, setCurrentBoardId] =
        useState<string>(defaultBoardId);

    function getCurrentBoard(): BoardData {
        const currentBoard = sessionContext.boards.find(
            (board) => board.id === currentBoardId
        );
        if (currentBoard === undefined) {
            throw new Error("Couldn't get current board in context!");
        }
        return currentBoard;
    }

    function updateCurrentBoard(boardData: BoardData) {
        if (boardData.id !== currentBoardId) {
            throw new Error(
                "Provided board data's id doesn't match current board id."
            );
        }

        sessionContext.updateBoardById(boardData);
    }

    function updateCurrentBoardObjects(objects: WorldObject[]) {
        const currentBoardData = sessionContext.boards.find(
            (x) => x.id === currentBoardId
        );
        if (currentBoardData === undefined) {
            throw new Error("Current board's data not found.");
        }

        currentBoardData.objects = objects;

        sessionContext.updateBoardById(currentBoardData);
    }

    function onCurrentBoardObjectsSaved(savedObjects: WorldObject[]) {
        const currentBoardData = sessionContext.boards.find(
            (x) => x.id === currentBoardId
        );
        if (currentBoardData === undefined) {
            throw new Error("Current board's data not found.");
        }

        const savedObjectsMap = new Map(savedObjects.map((x) => [x.id, x]));
        const existingIds = new Set(currentBoardData.objects.map((x) => x.id));

        // Update existing objects in place (preserves order)
        const updatedExisting = currentBoardData.objects.map(
            (x) => savedObjectsMap.get(x.id) ?? x
        );

        // Append saved objects that are entirely new
        const newObjects = savedObjects.filter((x) => !existingIds.has(x.id));

        sessionContext.updateBoardById({
            ...currentBoardData,
            objects: [...updatedExisting, ...newObjects],
        });
    }

    // function updateCurrentBoard_Objects(objects: WorldObject[]) {
    //     setData((prev) => ({
    //         userData: prev.userData,
    //         boards: prev.boards.map((board) =>
    //             board.id === prev.currentBoardId ? { ...board, objects } : board
    //         ),
    //         currentBoardId: prev.currentBoardId,
    //     }));
    // }

    return (
        <CanvasContext.Provider
            value={{
                currentBoardId,
                setCurrentBoardId,
                getCurrentBoard,
                updateCurrentBoard,
                updateCurrentBoardObjects,
                onCurrentBoardObjectsSaved,
            }}
        >
            {children}
        </CanvasContext.Provider>
    );
}
