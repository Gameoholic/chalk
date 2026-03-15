import { useContext, useEffect, useRef, useState } from "react";
import CanvasEditor from "./canvas/CanvasEditor.tsx";
import { BoardData, UserData, ObjectlessBoardData } from "./types/data.ts";
import { BoardsAPI, AuthAPI, GuestUsersAPI, MeAPI } from "./api";
import MyBoards from "./my-boards/MyBoards";
import {
    SessionContext,
    SessionContextProvider,
} from "./types/context/SessionContext.tsx";
import {
    CanvasContext,
    CanvasContextProvider,
} from "./types/context/CanvasContext.tsx";
import { WorldObject } from "./types/canvas";
import { ThemeContext } from "./types/context/ThemeContext.tsx";
import { updateBoardLastOpened } from "./api/boards";
import { FirstTimeVisitorContext } from "./types/context/FirstTimeVisitorContext";
import WelcomeScreen from "./canvas/WelcomeScreen";
import TourOverlay from "./canvas/TourOverlay";

type LoadDataResult =
    | {
          success: true;
          userData: UserData;
          boards: BoardData[];
          currentBoard: BoardData;
      }
    | { success: false };

export default function CanvasLoader() {
    const [data, setData] = useState<LoadDataResult | null>(null);
    const [loading, setLoading] = useState(true);

    // Fetch data only once despite react double mounting
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
        return <LoadingScreen />;
    }

    if (!data || !data.success) {
        return <AuthError />;
    }

    return (
        <SessionContextProvider
            defaultUserData={data.userData}
            defaultBoards={data.boards}
        >
            <AfterSuccessfulAuth
                initialBoardId={data.currentBoard.id}
                initialBoardObjects={data.currentBoard.objects}
            />
        </SessionContextProvider>
    );
}

function AfterSuccessfulAuth({
    initialBoardId,
    initialBoardObjects,
}: {
    initialBoardId: string;
    initialBoardObjects: WorldObject[];
}) {
    const sessionContext = useContext(SessionContext);
    const firstTimeVisitorContext = useContext(FirstTimeVisitorContext);

    // My boards <--> Canvas transition
    const [showMyBoards, setShowMyBoards] = useState(false);
    const [myBoardsKey, setMyBoardsKey] = useState(0);
    const [canvasEditorKey, setCanvasEditorKey] = useState(0);
    const [currentBoardId, setCurrentBoardId] = useState(initialBoardId); // Used to transfer board id from MyBoards to CanvasEditor (as MyBoard doesn't have access to CanvasContext)
    const [tourMenuOpen, setTourMenuOpen] = useState(false);
    const [tourCameraMoveCount, setTourCameraMoveCount] = useState(0);
    const [tourKeepMenuOpen, setTourKeepMenuOpen] = useState(false);
    const [openLoginFromWelcome, setOpenLoginFromWelcome] = useState(false);

    const handleWelcomeDismiss = () => {
        firstTimeVisitorContext.setValue("tour");
    };

    async function updateNewBoardLastOpened(newBoardId: string) {
        // this entire method is hopeful api call - no need to display error to user if failed
        await updateBoardLastOpened(newBoardId);
        // At this point the newly opened board's lastOpened property was opened
        // The API sorts boards by last opened before returning it to us
        // Meaning if we get all boards, it'll be sorted so that this new board is at the top.
        const newSortedBoards = await BoardsAPI.getAllBoards();
        sessionContext.updateBoards(newSortedBoards);
    }

    return (
        <div className="relative h-screen w-screen overflow-hidden">
            <div
                className={`absolute inset-0 z-${showMyBoards === false ? 100 : 1}`}
            >
                <CanvasContextProvider
                    key={currentBoardId} // Remount canvas context when the current board changes - so all local variables are synced from server variables
                    defaultBoardId={currentBoardId}
                    defaultBoardCameraSize={{ x: 1000, y: 1000 }}
                    defaultColor="#000000FF"
                    defaultStroke={1}
                    defaultTool="pencil"
                >
                    <CanvasEditorDiv
                        canvasEditorKey={canvasEditorKey}
                        currentBoardId={currentBoardId}
                        setMyBoardsKey={setMyBoardsKey}
                        setShowMyBoards={setShowMyBoards}
                        tourMenuOpen={tourMenuOpen}
                        setTourMenuOpen={setTourMenuOpen}
                        onTourCameraMoved={() =>
                            setTourCameraMoveCount((prev) => prev + 1)
                        }
                        keepMenuOpen={tourKeepMenuOpen}
                        openLoginOnMount={openLoginFromWelcome}
                        onLoginOpened={() => setOpenLoginFromWelcome(false)}
                    />
                </CanvasContextProvider>
            </div>
            <div className="absolute inset-0 z-5">
                <MyBoards
                    initialBoardId={currentBoardId}
                    key={myBoardsKey}
                    onBoardFinishZoomIn={(boardIdToShow: string) => {
                        setCanvasEditorKey((k) => k + 1); // force my boards remount
                        setCurrentBoardId(boardIdToShow);
                        setShowMyBoards(false);
                        updateNewBoardLastOpened(boardIdToShow);
                    }}
                />
            </div>

            {/* Welcome screen, only for first-time visitors — renders on top of everything */}
            {firstTimeVisitorContext.value === "welcome" && (
                <WelcomeScreen
                    onDismiss={handleWelcomeDismiss}
                    onLoginSignUp={() => {
                        setOpenLoginFromWelcome(true);
                        firstTimeVisitorContext.setValue("false");
                    }}
                />
            )}

            {/* Tour overlay, shown after welcome screen — renders on top of everything */}
            {firstTimeVisitorContext.value === "tour" && (
                <TourOverlay
                    onDone={() => firstTimeVisitorContext.setValue("false")}
                    menuOpen={tourMenuOpen}
                    setMenuOpen={setTourMenuOpen}
                    cameraMoveCount={tourCameraMoveCount}
                    onRequiresMenuOpenChange={setTourKeepMenuOpen}
                />
            )}
        </div>
    );
}

function CanvasEditorDiv({
    canvasEditorKey,
    currentBoardId,
    setMyBoardsKey,
    setShowMyBoards,
    tourMenuOpen,
    setTourMenuOpen,
    onTourCameraMoved,
    keepMenuOpen,
    openLoginOnMount,
    onLoginOpened,
}: {
    canvasEditorKey: number;
    currentBoardId: string;
    setMyBoardsKey: React.Dispatch<React.SetStateAction<number>>;
    setShowMyBoards: React.Dispatch<React.SetStateAction<boolean>>;
    tourMenuOpen: boolean;
    setTourMenuOpen: (open: boolean) => void;
    onTourCameraMoved: () => void;
    keepMenuOpen: boolean;
    openLoginOnMount: boolean;
    onLoginOpened: () => void;
}) {
    const context = useContext(CanvasContext);
    context.setLocalCurrentBoardId(currentBoardId);

    return (
        <CanvasEditor
            key={canvasEditorKey}
            openMyBoards={() => {
                setMyBoardsKey((k) => k + 1); // force my boards remount
                setShowMyBoards(true);
            }}
            tourMenuOpen={tourMenuOpen}
            setTourMenuOpen={setTourMenuOpen}
            onTourCameraMoved={onTourCameraMoved}
            keepMenuOpen={keepMenuOpen}
            openLoginOnMount={openLoginOnMount}
            onLoginOpened={onLoginOpened}
        />
    );
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
                        We couldn't authenticate you. Please refresh the page or
                        try again later.
                    </p>
                </div>
            </div>
        </div>
    );
}

function LoadingScreen() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-white">
            <div className="flex flex-col items-center gap-6">
                {/* Animated blob */}
                <div className="relative h-16 w-16">
                    <span className="absolute inset-0 animate-ping rounded-full bg-zinc-900/20" />
                    <span className="absolute inset-0 rounded-full bg-zinc-900" />
                </div>

                {/* Loading text */}
                <div className="text-sm font-medium tracking-wide text-black">
                    Loading canvas…
                </div>
            </div>
        </div>
    );
}

async function loadData(): Promise<
    | {
          success: true;
          userData: UserData;
          boards: BoardData[];
          currentBoard: BoardData;
      }
    | { success: false }
> {
    let userData: UserData;
    try {
        userData = await loadUserDataOrCreateGuestUser();
    } catch (err) {
        console.error("Couldn't authenticate user at all!" + err);
        return { success: false }; // todo: just throw here.
    }

    console.log(
        "User data for user (id:" +
            userData.id +
            ", displayName:" +
            userData.displayName +
            ", role:" +
            userData.role +
            ") loaded!"
    );

    console.log("Fetching user's boards.");
    let boards: BoardData[];
    try {
        boards = await BoardsAPI.getAllBoards();
    } catch (err) {
        console.error("Couldn't load boards! " + err);
        return { success: false };
    }
    console.log(boards.length + " boards found.");

    if (boards.length === 0) {
        console.log("Creating default board.");
        try {
            const defaultBoardName = "My first board";
            const createBoardResult =
                await BoardsAPI.createBoard(defaultBoardName);
            boards[0] = {
                id: createBoardResult.id,
                createdOn: createBoardResult.createdOn,
                lastOpened: createBoardResult.createdOn,
                name: defaultBoardName,
                objects: [],
                lastCameraPosition: { x: 0, y: 0 },
                lastCameraZoom: 1,
            };
        } catch (err) {
            console.error("Couldn't create board!");
            return { success: false };
        }
        console.log("Board created successfully.");
    }

    console.log(
        "Setting current board to most recently opened: " +
            boards[0].name +
            " (" +
            boards[0].id +
            ")"
    );
    return {
        success: true,
        boards: boards,
        currentBoard: boards[0],
        userData: userData,
    };
}

async function loadUserDataOrCreateGuestUser(): Promise<UserData> {
    // Try fetching user data to see if user exists first
    let getUserDataErrorMessage;
    try {
        console.log("Attempting to retrieve current user data.");
        const getUserDataResult = await MeAPI.getUserData();
        return getUserDataResult;
    } catch (err) {
        if (err instanceof Error) {
            getUserDataErrorMessage = err.message;
        }
        console.warn("Couldn't fetch user data. " + err);
    }

    if (
        getUserDataErrorMessage !== "Unauthorized (401)" &&
        getUserDataErrorMessage !== "Invalid refresh token." &&
        getUserDataErrorMessage !== "Refresh token expired."
    ) {
        console.log(
            "Error does not have to do with refresh token being invalid. Could be a server-side error. Not logging out this user yet."
        );
        throw new Error("Couldn't authenticate user.");
        // todo: if refresh token expired error, tell user to re-log back in
    }

    if (getUserDataErrorMessage === "Refresh token expired.") {
        console.log(
            "Refresh token has expired. TODO: Replace this log message with a useful message for the client and prompt user to re-log in."
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
        const getUserDataResult = await MeAPI.getUserData();
        return getUserDataResult;
    } catch (err) {
        console.error("Couldn't create guest user. " + err);
    }

    throw new Error("Couldn't authenticate user.");
}
