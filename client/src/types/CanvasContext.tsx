import { createContext, useContext, useEffect, useState } from "react";
import { BoardData, ChalkData, UserData } from "./data";
import { Vec2, WorldObject } from "./canvas";
import { SessionContext } from "./SessionContext";
import { ViewportEventHandler } from "framer-motion";

interface CanvasContextType {
    currentBoardId: string;
    setCurrentBoardId: React.Dispatch<React.SetStateAction<string>>;
    getCurrentBoard: () => BoardData;
    updateCurrentBoard: (boardData: BoardData) => void;
    updateCurrentBoardCamera: (
        cameraPosition: Vec2,
        cameraZoom: number
    ) => void;
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

    function updateCurrentBoardCamera(
        cameraPosition: Vec2,
        cameraZoom: number
    ) {
        const currentBoardData = getCurrentBoard();

        sessionContext.updateBoardById({
            ...currentBoardData,
            lastCameraPosition: cameraPosition,
            lastCameraZoom: cameraZoom,
        });
    }

    function updateCurrentBoardObjects(objects: WorldObject[]) {
        const currentBoardData = getCurrentBoard();

        sessionContext.updateBoardById({
            ...currentBoardData,
            objects: objects,
        });
    }

    function onCurrentBoardObjectsSaved(savedObjects: WorldObject[]) {
        const currentBoardData = getCurrentBoard();

        const newObjectsMap = new Map(
            currentBoardData.objects.map((x) => [x.id, x])
        );
        savedObjects.forEach((x) => newObjectsMap.set(x.id, x));

        const newObjects = Array.from(newObjectsMap.values());
        sessionContext.updateBoardById({
            ...currentBoardData,
            objects: newObjects,
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
                updateCurrentBoardCamera,
                updateCurrentBoardObjects,
                onCurrentBoardObjectsSaved,
            }}
        >
            {children}
        </CanvasContext.Provider>
    );
}
