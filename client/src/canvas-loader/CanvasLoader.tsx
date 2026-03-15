import { useContext, useEffect, useRef, useState } from "react";
import CanvasEditor from "../canvas/CanvasEditor.tsx";
import { BoardData, UserData } from "../types/data.ts";
import { BoardsAPI, GuestUsersAPI, MeAPI } from "../api/index.ts";
import MyBoards from "../my-boards/MyBoards.tsx";
import {
    SessionContext,
    SessionContextProvider,
} from "../types/context/SessionContext.tsx";
import {
    CanvasContext,
    CanvasContextProvider,
} from "../types/context/CanvasContext.tsx";
import { updateBoardLastOpened } from "../api/boards.ts";
import { FirstTimeVisitorContext } from "../types/context/FirstTimeVisitorContext.tsx";
import WelcomeScreen from "../canvas/WelcomeScreen.tsx";
import TourOverlay from "../canvas/TourOverlay.tsx";
import LoadingScreen from "./LoadingScreen";

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
    const [loadingScreenDone, setLoadingScreenDone] = useState(false);

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

    return (
        <>
            {/* The loading screen stays mounted even after data has been fetched, until its internal exit 
                animation signals 'onAnimationDone' which means the animation completely faded out.
            */}
            {!loadingScreenDone && (
                <LoadingScreen
                    isReady={!loading}
                    onAnimationDone={() => setLoadingScreenDone(true)}
                />
            )}

            {!loading &&
                (data?.success ? (
                    <SessionContextProvider
                        defaultUserData={data.userData}
                        defaultBoards={data.boards}
                    >
                        <AfterSuccessfulAuth
                            initialBoardId={data.currentBoard.id}
                        />
                    </SessionContextProvider>
                ) : (
                    <AuthError />
                ))}
        </>
    );
}

function AfterSuccessfulAuth({ initialBoardId }: { initialBoardId: string }) {
    const sessionContext = useContext(SessionContext);
    const firstTimeVisitorContext = useContext(FirstTimeVisitorContext);

    // My boards <--> Canvas transition
    const [showMyBoards, setShowMyBoards] = useState(false);
    const [myBoardsKey, setMyBoardsKey] = useState(0);
    const [canvasEditorKey, setCanvasEditorKey] = useState(0);

    // Used to transfer board id from MyBoards to CanvasEditor
    // (as MyBoard doesn't have access to CanvasContext)
    const [currentBoardId, setCurrentBoardId] = useState(initialBoardId);

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

        // At this point the newly opened board's lastOpened property was updated.
        // The API sorts boards by last opened before returning it to us,
        // meaning if we get all boards, it'll be sorted so that this new board is at the top.
        const newSortedBoards = await BoardsAPI.getAllBoards();
        sessionContext.updateBoards(newSortedBoards);
    }

    return (
        <div className="relative h-screen w-screen overflow-hidden">
            <div
                className={`absolute inset-0 z-${showMyBoards === false ? 100 : 1}`}
            >
                <CanvasContextProvider
                    // Remount canvas context when the current board changes
                    // - so all local variables are synced from server variables
                    key={currentBoardId}
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
                        // force my boards remount
                        setCanvasEditorKey((k) => k + 1);
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
                // force my boards remount
                setMyBoardsKey((k: number) => k + 1);
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

async function loadData(): Promise<LoadDataResult> {
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
        return await MeAPI.getUserData();
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
    }

    if (getUserDataErrorMessage === "Refresh token expired.") {
        console.log(
            "Refresh token has expired. TODO: Replace this log message with a useful message for the client and prompt user to re-log in."
        );
        throw new Error("Couldn't authenticate user.");
        // todo: if refresh token expired error, tell user to re-log back in
    }

    // Reaching this line pretty much guarantees we don't have a guest user because the refresh token is invalid.
    // On guest users, refresh tokens never expire, and shouldn't be invalid. Theoretically, this could happen if we change the
    // refresh token format but that's beyond the scope of this flow.
    // Therefore, it's ok to create a new user, locking the client out of the previously logged-into guest user and preventing its use forever
    // (because there isn't one.)
    console.log("Failed to fetch data. Proceeding to create guest user.");
    // If doesn't exist, attempt to create guest user
    try {
        console.log("Attempting to create guest user.");
        await GuestUsersAPI.createGuestUser();
        return await MeAPI.getUserData();
    } catch (err) {
        console.error("Couldn't create guest user. " + err);
    }

    throw new Error("Couldn't authenticate user.");
}
