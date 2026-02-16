import { createContext, useState } from "react";
import { BoardData, UserData } from "./data";
import { WorldObject } from "./canvas";

interface ChalkData {
    userData: UserData;
    boards: BoardData[];
    currentBoardId: string;
}

export const ChalkContext = createContext<ChalkData>(null!);

export function ChalkContextProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [data, setData] = useState<ChalkData>(null!);

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

    return (
        <ChalkContext.Provider value={data}>{children}</ChalkContext.Provider>
    );
}
