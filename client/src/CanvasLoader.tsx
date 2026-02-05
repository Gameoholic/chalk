import { useEffect, useRef, useState } from "react";
import CanvasEditor from "./canvas/CanvasEditor.tsx";
import { BoardData, UserData, ObjectlessBoardData } from "./types/data.ts";
import { BoardsAPI, AuthAPI, GuestUsersAPI } from "./api";

type LoadDataResult =
    | {
          success: true;
          userData: UserData;
          boards: ObjectlessBoardData[];
          currentBoard: BoardData;
      }
    | { success: false };

export default function CanvasLoader() {
    const [data, setData] = useState<LoadDataResult | null>(null);
    const [loading, setLoading] = useState(true);

    // Create a ref to hold the running promise
    // This persists across the Strict Mode "double-mount"
    const dataFetchPromise = useRef<Promise<LoadDataResult> | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function fetchData() {
            if (!dataFetchPromise.current) {
                dataFetchPromise.current = loadData();
            }
            const result = await dataFetchPromise.current;
            if (!cancelled) {
                setData(result);
                setLoading(false);
            }
        }

        fetchData();

        return () => {
            cancelled = true;
        };
    }, []);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center text-white">
                Loading...
            </div>
        );
    }

    if (!data || !data.success) {
        return <AuthError />;
    }

    return <CanvasEditor currentBoard={data.currentBoard} />;
}

function AuthError() {
    return (
        <div className="flex min-h-screen items-center justify-center text-white">
            <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-[3px]">
                <div className="rounded-xl bg-zinc-900 p-6 text-center shadow-xl">
                    <h2 className="text-xl font-semibold text-red-400">
                        Authentication failed
                    </h2>
                    <p className="mt-2 text-zinc-300">
                        We couldn’t authenticate you. Please refresh the page or
                        try again later.
                    </p>
                </div>
            </div>
        </div>
    );
}

async function loadData(): Promise<
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
        console.error("Couldn't authenticate user at all!" + err);
        return { success: false };
    }

    console.log(
        "User data for user (id:" +
            userData.id +
            ", displayName:" +
            userData.displayName +
            ", displayName:" +
            userData.displayName +
            ") loaded!"
    );

    console.log("Fetching user's boards.");
    let boards: ObjectlessBoardData[];
    try {
        boards = await BoardsAPI.getAllBoards();
    } catch (err) {
        console.error("Couldn't load boards! " + err);
        return { success: false }; // todo: just throw here.
    }
    console.log(boards.length + " boards found.");

    if (boards.length === 0) {
        console.log("Creating default board.");
        try {
            boards[0] = await BoardsAPI.createBoard("My first board");
        } catch (err) {
            console.error("Couldn't create board!");
            return { success: false };
        }
        console.log("Board created successfully.");
    }

    console.log("Fetching most recent board.");
    let currentBoard: BoardData;
    try {
        currentBoard = await BoardsAPI.getBoardById(boards[0].id);
    } catch (err) {
        console.error("Couldn't load board! " + err);
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
    let getUserDataErrorMessage;
    try {
        console.log("Attempting to retrieve current user data.");
        const getUserDataResult = await AuthAPI.getUserData();
        return getUserDataResult;
    } catch (err) {
        if (err instanceof Error) {
            getUserDataErrorMessage = err.message;
        }
        console.log("Couldn't fetch user data. " + err);
    }

    if (getUserDataErrorMessage !== "Invalid/Nonexistent refresh token.") {
        console.log(
            "Error does not have to do with refresh token being invalid. Could be a network error. Not logging out this user yet."
        );
        throw new Error("Couldn't authenticate user.");
    }

    // Reaching this line pretty much guarantees we don't have a guest user because the refresh token is invalid.
    // On guest users, refresh tokens never expire, and shouldn't be invalid. Theoretically, this could happen if we change the
    // refresh token format but that's beyond the scope of this flow.
    // Therefore, it's ok to create a new user, locking the client out of the previously logged-into guest user and preventing its use forever
    // (because there isn't one.)
    console.log(
        "Failed to fetch data because refresh token is invalid/nonexistent. Proceeding to create guest user."
    );
    // If doesn't exist, attempt to create guest user
    try {
        console.log("Attempting to create guest user.");
        await GuestUsersAPI.createGuestUser();
        const getUserDataResult = await AuthAPI.getUserData();
        return getUserDataResult;
    } catch (err) {
        console.error("Couldn't create guest user. " + err);
    }

    throw new Error("Couldn't authenticate user.");
}
