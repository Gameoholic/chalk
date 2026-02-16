import { createContext, useState } from "react";
import { BoardData, ChalkData, UserData } from "./data";
import { WorldObject } from "./canvas";

interface SessionContextType {
    userData: UserData;
    boards: BoardData[];
    updateUserData: (userData: UserData) => void;
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

    // function changeCurrentBoard(boardId: string) {
    //     setData((prev) => ({
    //         userData: prev.userData,
    //         boards: prev.boards,
    //         currentBoardId: boardId,
    //     }));
    // }

    // function updateCurrentBoard(boardData: BoardData) {
    //     setData((prev) => ({
    //         userData: prev.userData,
    //         boards: prev.boards.map((board) =>
    //             board.id === prev.currentBoardId ? boardData : board
    //         ),
    //         currentBoardId: prev.currentBoardId,
    //     }));
    // }

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
        // setData((prev) => ({
        //     userData: userData,
        //     boards: prev.boards,
        //     currentBoardId: prev.currentBoardId,
        // }));
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
            }}
        >
            {children}
        </SessionContext.Provider>
    );
}
