import { useEffect, useRef, useState } from "react";
import CanvasEditor from "./canvas/CanvasEditor.tsx";
import { BoardData, UserData, ObjectlessBoardData } from "./types/canvas.ts";

type AuthStatus = "loading" | "ok" | "failed";

export default function CanvasLoader() {
    const authenticationBootstrap = useRef(false); // in dev mode, each function is rendered twice!
    // todo: combine all these to one state?
    const [authStatus, setAuthStatus] = useState<AuthStatus>("loading");
    const [boards, setBoards] = useState<ObjectlessBoardData[] | null>(null);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [currentBoard, setCurrentBoard] = useState<BoardData | null>(null);

    useEffect(() => {
        if (authenticationBootstrap.current) {
            return;
        }
        authenticationBootstrap.current = true;
        loadUserAndBoardData().then((data) => {
            setAuthStatus(data.success ? "ok" : "failed");
            if (data.success) {
                setBoards(data.boards);
                setCurrentBoard(data.currentBoard);
                setUserData(data.userData);
                setCurrentBoard(data.currentBoard);
            }
        });
    }, []);
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#242424] font-sans text-white antialiased dark:bg-white dark:text-[#213547]">
            <div className="relative min-h-screen">
                <CanvasEditor currentBoard={currentBoard} />
                {authStatus === "loading" && (
                    <CanvasEditor currentBoard={null} />
                )}
                {authStatus === "failed" && <AuthErrorOverlay />}
            </div>
        </div>
    );
}

function AuthErrorOverlay() {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-[3px]">
            <div className="rounded-xl bg-zinc-900 p-6 text-center shadow-xl">
                <h2 className="text-xl font-semibold text-red-400">
                    Authentication failed
                </h2>
                <p className="mt-2 text-zinc-300">
                    We couldn’t authenticate you. Please refresh the page or try
                    again later.
                </p>
            </div>
        </div>
    );
}

async function loadUserAndBoardData(): Promise<
    | {
          success: true;
          userData: UserData;
          boards: ObjectlessBoardData[];
          currentBoard: BoardData;
      }
    | { success: false }
> {
    let userData: UserData;
    try {
        userData = await loadUserDataOrCreateGuestUser();
    } catch (err) {
        console.error(
            "Couldn't authenticate user at all! Disabling usage of website."
        );
        return { success: false };
    }

    console.log(
        "User data for user (id:" +
            userData.id +
            ", displayName:" +
            userData.displayName +
            ") loaded!"
    );

    console.log("Fetching user's boards.");
    let boards: ObjectlessBoardData[];
    try {
        boards = await getBoardData();
    } catch (err) {
        console.error("Couldn't load boards!");
        return { success: false };
    }
    console.log(boards.length + " boards found.");

    if (boards.length === 0) {
        console.log("Creating default board.");
        try {
            await createBoard("My first board");
        } catch (err) {
            console.error("Couldn't create board!");
            return { success: false };
        }
        console.log("Board created successfully.");
    }

    console.log("Fetching most recent board.");
    let currentBoard: BoardData;
    try {
        currentBoard = await getBoardDataById(boards[0].id);
    } catch (err) {
        console.error("Couldn't load board!");
        return { success: false };
    }
    console.log("Loaded board '" + currentBoard.name + "' as current board.");
    return {
        success: true,
        boards: boards,
        currentBoard: currentBoard,
        userData: userData,
    };
}
async function loadUserDataOrCreateGuestUser(): Promise<UserData> {
    // Try fetching user data to see if user exists first
    try {
        console.log("Attempting to retrieve current user data.");
        const getUserDataResult = await getUserData();
        return getUserDataResult;
    } catch (err) {
        console.log("Couldn't fetch user data.");
    }

    // If doesn't exist, attempt to create guest user
    try {
        console.log("Attempting to create guest user.");
        await createGuestUser();
        const getUserDataResult = await getUserData();
        return getUserDataResult;
    } catch (err) {
        console.log("Couldn't create guest user.");
    }

    throw new Error("Couldn't authenticate user.");
}

async function getUserData(): Promise<UserData> {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 5000);

    const res = await fetch("http://localhost:5050/auth/me", {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
        signal: controller.signal,
    });
    const data = await res.json();
    if (!res.ok) {
        throw Error(data.error);
    }

    return { displayName: data.displayName, role: data.role, id: data.id };
}

async function createGuestUser() {
    const controller = new AbortController(); // todo do this for the entire app. otherwise it silently fails and we do not throw error.
    setTimeout(() => controller.abort(), 5000);

    const res = await fetch("http://localhost:5050/guest-users/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include", // used to receive cookie
        signal: controller.signal,
    });
    if (!res.ok) {
        const data = await res.json();
        throw Error(data.error);
    }
}

async function getBoardData(): Promise<ObjectlessBoardData[]> {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 5000);

    const res = await fetch("http://localhost:5050/me/boards/", {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
        signal: controller.signal,
    });
    const data = await res.json();
    if (!res.ok) {
        throw Error(data.error);
    }

    return data as ObjectlessBoardData[];
}

async function createBoard(name: string) {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 5000);

    const res = await fetch("http://localhost:5050/me/boards/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
        signal: controller.signal,
        body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (!res.ok) {
        throw Error(data.error);
    }

    return data as ObjectlessBoardData[];
}

async function getBoardDataById(id: string): Promise<BoardData> {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`http://localhost:5050/me/boards/${id}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
        signal: controller.signal,
    });

    const data = await res.json();
    if (!res.ok) {
        throw Error(data.error);
    }

    return data as BoardData;
}
