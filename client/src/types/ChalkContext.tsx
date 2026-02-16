import { createContext, useState } from "react";
import { BoardData, ChalkData, UserData } from "./data";
import { WorldObject } from "./canvas";

interface ChalkContextType {
    data: ChalkData;
    updateData: (data: ChalkData) => void;
    updateCurrentBoard: (boardData: BoardData) => void;
    updateCurrentBoard_Objects: (objects: WorldObject[]) => void;
    updateUserData: (userData: UserData) => void;
    updateCurrentBoardId: (currentBoardId: string) => void;
    changeCurrentBoard: (boardId: string) => void;
    getCurrentBoard: () => BoardData;
}

export const ChalkContext = createContext<ChalkContextType>(null!);

export function ChalkContextProvider({
    children,
    initialData,
}: {
    children: React.ReactNode;
    initialData: ChalkData;
}) {
    const [data, setData] = useState<ChalkData>(initialData);

    function updateData(data: ChalkData) {
        setData(data);
    }

    function changeCurrentBoard(boardId: string) {
        setData((prev) => ({
            userData: prev.userData,
            boards: prev.boards,
            currentBoardId: boardId,
        }));
    }

    function updateCurrentBoard(boardData: BoardData) {
        setData((prev) => ({
            userData: prev.userData,
            boards: prev.boards.map((board) =>
                board.id === prev.currentBoardId ? boardData : board
            ),
            currentBoardId: prev.currentBoardId,
        }));
    }

    function updateCurrentBoard_Objects(objects: WorldObject[]) {
        setData((prev) => ({
            userData: prev.userData,
            boards: prev.boards.map((board) =>
                board.id === prev.currentBoardId ? { ...board, objects } : board
            ),
            currentBoardId: prev.currentBoardId,
        }));
    }

    function updateUserData(userData: UserData) {
        setData((prev) => ({
            userData: userData,
            boards: prev.boards,
            currentBoardId: prev.currentBoardId,
        }));
    }

    function updateCurrentBoardId(currentBoardId: string) {
        setData((prev) => ({
            userData: prev.userData,
            boards: prev.boards,
            currentBoardId: currentBoardId,
        }));
    }

    function getCurrentBoard() {
        const currentBoard = data.boards.find(
            (x) => x.id === data.currentBoardId
        );
        if (currentBoard === undefined) {
            throw new Error("Couldn't get current board in context!");
        }
        return currentBoard;
    }

    return (
        <ChalkContext.Provider
            value={{
                data,
                updateData,
                updateCurrentBoard,
                updateCurrentBoard_Objects,
                updateUserData,
                updateCurrentBoardId,
                changeCurrentBoard,
                getCurrentBoard,
            }}
        >
            {children}
        </ChalkContext.Provider>
    );
}
