import { createContext, useState } from "react";
import { BoardData, ChalkData, UserData } from "./data";
import { WorldObject } from "./canvas";

interface SessionContextType {
    userData: UserData;
    /**
     * Important: Boards' objects will only be updated after a successful db save.
     */
    boards: BoardData[];
    updateUserData: (userData: UserData) => void;
    updateUserDisplayName: (displayName: string) => void;
    updateBoardById: (boardData: BoardData) => void;
    updateBoards: (boards: BoardData[]) => void;
}

export const SessionContext = createContext<SessionContextType>(null!);

/**
 * Updates to defaultData will not cause a re-render! Just the default data.
 */
export function SessionContextProvider({
    children,
    defaultUserData,
    defaultBoards,
}: {
    children: React.ReactNode;
    defaultUserData: UserData;
    defaultBoards: BoardData[];
}) {
    const [userData, setUserData] = useState<UserData>(defaultUserData);
    const [boards, setBoards] = useState<BoardData[]>(defaultBoards);

    // function updateData(data: SessionData) {
    // setData(data);
    // }

    /**
     * Will update an EXISTING board's data (excluding its id, which is used for querying it in the first place!)
     */
    function updateBoardById(boardData: BoardData) {
        setBoards((prev) =>
            prev.map((board) => (board.id === boardData.id ? boardData : board))
        );
    }

    /**
     * Will update ALL boards.
     */
    function updateBoards(boards: BoardData[]) {
        setBoards(boards);
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

    function updateUserData(userData: UserData) {
        setUserData(userData);
    }

    function updateUserDisplayName(displayName: string) {
        setUserData((prev) => ({ ...prev, displayName }));
    }

    // function updateCurrentBoardId(currentBoardId: string) {
    //     setData((prev) => ({
    //         userData: prev.userData,
    //         boards: prev.boards,
    //         currentBoardId: currentBoardId,
    //     }));
    // }

    return (
        <SessionContext.Provider
            value={{
                userData,
                boards,
                updateUserData,
                updateUserDisplayName,
                updateBoardById,
                updateBoards,
            }}
        >
            {children}
        </SessionContext.Provider>
    );
}
