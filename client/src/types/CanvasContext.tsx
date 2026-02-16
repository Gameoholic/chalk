import { createContext, useContext, useState } from "react";
import { BoardData, ChalkData, UserData } from "./data";
import { WorldObject } from "./canvas";
import { SessionContext } from "./SessionContext";

interface CanvasContextType {
    boardId: string;
    setBoardId: React.Dispatch<React.SetStateAction<string>>;
    getCurrentBoard: () => BoardData;
}

export const CanvasContext = createContext<CanvasContextType>(null!);

export function CanvasContextProvider({
    children,
    initialBoardId,
}: {
    children: React.ReactNode;
    initialBoardId: string;
}) {
    const sessionContext = useContext(SessionContext);
    const [boardId, setBoardId] = useState<string>(initialBoardId);

    function getCurrentBoard(): BoardData {
        const currentBoard = sessionContext.boards.find(
            (board) => board.id === boardId
        );
        if (currentBoard === undefined) {
            throw new Error("Couldn't get current board in context!");
        }
        return currentBoard;
    }

    return (
        <CanvasContext.Provider
            value={{
                boardId,
                getCurrentBoard,
                setBoardId,
            }}
        >
            {children}
        </CanvasContext.Provider>
    );
}
