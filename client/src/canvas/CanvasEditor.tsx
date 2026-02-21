import Toolbox from "./Toolbox";
import { RefObject, useContext, useEffect, useRef, useState } from "react";
import { Camera, Tool, Vec2, WorldObject } from "../types/canvas";
import {
    Menu,
    User,
    LayoutDashboard,
    Share2,
    Info,
    Settings2,
    Loader2,
    CheckCircle,
    XCircle,
    TriangleAlert,
    Moon,
    Sun,
} from "lucide-react";
import {
    deleteBoard,
    resetBoard,
    updateBoardCamera,
    updateBoardName,
    updateBoardObjects,
} from "../api/boards";
import { BoardData, UserData } from "../types/data";
import ManageThisBoardModal from "./modals/ManageThisBoardModal";
import CreateAccountModal from "./modals/CreateAccountModal";
import LoginModal from "./modals/LogInModal";
import { createUser } from "../api/users";
import CanvasInteractive from "./CanvasInteractive";
import { motion } from "motion/react";
import { CanvasContext } from "../types/CanvasContext";
import { SessionContext } from "../types/SessionContext";
import { ThemeContext } from "../types/ThemeContext";

interface CanvasEditorProps {
    openMyBoards: () => void;
}

// Handles saving and uploading data, as well as tool selection and all overlays
function CanvasEditor({ openMyBoards }: CanvasEditorProps) {
    const themeContext = useContext(ThemeContext);
    const canvasContext = useContext(CanvasContext);
    const sessionContext = useContext(SessionContext);

    // Settings & state data
    const [tool, setTool] = useState<Tool>("none");
    const [color, setColor] = useState("#000000FF");
    const [stroke, setStroke] = useState(1);

    // Camera
    const [cameraPosition, setCameraPosition] = useState<Vec2>(
        canvasContext.getCurrentBoard().lastCameraPosition
    );
    const [cameraZoom, setCameraZoom] = useState<number>(
        canvasContext.getCurrentBoard().lastCameraZoom
    );

    // Debug data
    const [objectAmount, setObjectAmount] = useState<number>(0);
    // FPS
    const [fps, setFps] = useState(0);
    const frames = useRef(0);
    const lastTime = useRef(performance.now());

    // Menu
    const [showDebug, setShowDebug] = useState(true);
    const [menuOpen, setMenuOpen] = useState(false);
    const [showManageThisBoardModal, setShowManageThisBoardModal] =
        useState(false);
    const [authView, setAuthView] = useState<
        "login" | "forgot-password" | "create-account" | "manage-user" | null
    >(null);

    // Saving objects
    // Objects that are currently being updated, can be mid draw and not committed yet! So do not save them just yet
    const objectsBeingUpdatedButNotReadyForSaving: RefObject<
        Map<string, WorldObject>
    > = useRef(new Map());
    // Database objects on standby to be saved to db (either entirely new objects or objects that were updated)
    const objectsToSaveOnDatabase: RefObject<Map<string, WorldObject>> = useRef(
        new Map()
    );
    // Objects that are CURRENTLY being saved (mid-fetch request)
    const objectsBeingSavedOnDatabase: RefObject<WorldObject[]> = useRef([]);
    const [saveObjectsError, setSaveObjectsError] = useState<
        | { error: null }
        | {
              error: string;
              retryStatus: "retrying" | "start-retry-timer" | number;
              retryDelay: number;
          }
    >({ error: null });

    useEffect(() => {
        let rafId: number;

        const loop = () => {
            frames.current++;
            const now = performance.now();

            if (now - lastTime.current >= 1000) {
                setFps(frames.current);
                frames.current = 0;
                lastTime.current = now;
            }

            rafId = requestAnimationFrame(loop);
        };

        rafId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rafId);
    }, []);

    // When either a new object was added, or an existing object has updated.
    // For example: Every time a new point is drawn in a line, or a circle's radius is being changed.
    // Basically, ANY change to an object calls this method.
    function onObjectUpdatedOrAdded(object: WorldObject) {
        objectsBeingUpdatedButNotReadyForSaving.current.set(object.id, object);
    }

    // COOLDOWN FOR SAVING OBJECTS (CLIENT SIDE RATE LIMITING)
    const saveObjectsRequestOnCooldown = useRef(false);
    // @ts-expect-error Fix: IntelliJ complains about import.meta.env
    const SAVE_REQUEST_COOLDOWN = import.meta.env.VITE_SAVE_REQUEST_COOLDOWN;
    if (SAVE_REQUEST_COOLDOWN !== 0) {
        useEffect(() => {
            const interval: number = window.setInterval(() => {
                saveObjectsRequestOnCooldown.current = false;
                // In case commit requests were sent during the delay, try to save now
                // requestSaveObjectsOnDatabase();  todo THIS IS BUGGED
            }, SAVE_REQUEST_COOLDOWN);

            return () => window.clearInterval(interval);
        }, []);
    }

    // When objects are ready to be saved to database (user released left click, for example).
    // Generally, only one object will be in objectsBeingUpdatedButNotReadyForSaving when this method is called,
    // but our code should handle a case where there's multiple objects at once.
    function onObjectsCommit() {
        console.log(
            "Requesting to commit " +
                objectsBeingUpdatedButNotReadyForSaving.current.size +
                " objects to database."
        );

        // Transfer all objects previously put into objectsbeingupdated into objectstosaveondatabase
        objectsBeingUpdatedButNotReadyForSaving.current.forEach((object) => {
            objectsToSaveOnDatabase.current.set(object.id, object);
        });
        objectsBeingUpdatedButNotReadyForSaving.current.clear();

        requestSaveObjectsOnDatabase();
    }

    async function requestSaveObjectsOnDatabase(asErrorRetry: boolean = false) {
        // Sanity check. Do not remove this because if it's equal to 0 and we call this method multiple times, we could have multiple fetch requests running concurrently, which could cause problems if one of them fails and causes us to reload the board.
        if (objectsToSaveOnDatabase.current.size === 0) {
            return;
        }

        // Check for rate limiting
        if (saveObjectsRequestOnCooldown.current) {
            return;
        }
        // saveObjectsRequestOnCooldown.current = true; // temporarily disable rate limiting

        if (objectsBeingSavedOnDatabase.current.length > 0) {
            console.warn(
                "Request to save objects (length " +
                    objectsToSaveOnDatabase.current.size +
                    ") ignored because waiting on existing request."
            );
            return;
        }
        if (saveObjectsError.error && !asErrorRetry) {
            console.warn(
                "Request to save objects (length " +
                    objectsToSaveOnDatabase.current.size +
                    ") ignored because waiting for error retry."
            );
            return;
        }

        objectsBeingSavedOnDatabase.current = Array.from(
            objectsToSaveOnDatabase.current.values()
        );
        objectsToSaveOnDatabase.current.clear();
        console.log(
            "Saving " +
                objectsBeingSavedOnDatabase.current.length +
                " board objects on database."
        );

        try {
            await updateBoardObjects(
                canvasContext.currentBoardId,
                objectsBeingSavedOnDatabase.current
            );
        } catch (err) {
            console.error("Failure to save the objects! ");

            // Restore objects
            for (const obj of objectsBeingSavedOnDatabase.current) {
                // Don't attempt to re-save the object if a newer version of it exists
                if (!objectsToSaveOnDatabase.current.has(obj.id)) {
                    objectsToSaveOnDatabase.current.set(obj.id, obj);
                }
            }
            objectsBeingSavedOnDatabase.current = [];
            setSaveObjectsError((prev) => {
                const accumulatedCooldown = prev.error ? prev.retryDelay : 0; // Add delay from previous attempts
                const COOLDOWN = Number(
                    // @ts-expect-error Fix: IntelliJ complains about import.meta.env
                    import.meta.env.VITE_SAVE_RETRY_COOLDOWN
                );
                const MAX_COOLDOWN = Number(
                    // @ts-expect-error Fix: IntelliJ complains about import.meta.env
                    import.meta.env.VITE_SAVE_RETRY_MAX_COOLDOWN
                );

                const newCooldown = accumulatedCooldown + COOLDOWN;
                return {
                    error: "Failed to save changes. Your work is out of sync.",
                    retryStatus: "start-retry-timer",
                    retryDelay:
                        MAX_COOLDOWN === 0 // If max cooldown is 0, we ignore it
                            ? newCooldown
                            : Math.min(newCooldown, MAX_COOLDOWN),
                };
            });
            return;
        }

        console.log("Successfully saved the objects.");
        canvasContext.onCurrentBoardObjectsSaved(
            objectsBeingSavedOnDatabase.current
        );

        setSaveObjectsError({ error: null });
        objectsBeingSavedOnDatabase.current = [];

        // Save any objects that were piling up as this request was processed
        if (objectsToSaveOnDatabase.current.size > 0) {
            console.log(
                objectsToSaveOnDatabase.current.size +
                    " objects piled up while processing the request. Saving them now."
            );
            requestSaveObjectsOnDatabase();
        }
    }

    // Handle error retry
    useEffect(() => {
        if (!saveObjectsError.error) return;

        // Start retry timer
        if (saveObjectsError.retryStatus === "start-retry-timer") {
            // Interval logic
            const interval = setInterval(() => {
                setSaveObjectsError((prev) => {
                    if (!prev.error || typeof prev.retryStatus !== "number") {
                        clearInterval(interval);
                        return prev;
                    }

                    // Retry saving objects
                    if (prev.retryStatus <= 1) {
                        clearInterval(interval);
                        console.log("Retrying to save objects.");
                        requestSaveObjectsOnDatabase(true);

                        return { ...prev, retryStatus: "retrying" };
                    }

                    return { ...prev, retryStatus: prev.retryStatus - 1 };
                });
            }, 1000);
            // Interval logic ^

            // Start retry timer
            setSaveObjectsError({
                error: saveObjectsError.error,
                retryStatus: saveObjectsError.retryDelay,
                retryDelay: saveObjectsError.retryDelay,
            });
        }

        //  clearInterval(interval) todo we don't actually clean it up here. could cause memory leaks? idk
        return () => {};
    }, [saveObjectsError]);

    // Update lastCameraPosition and lastCameraZoom on database
    useEffect(() => {
        const update = async () => {
            try {
                await updateBoardCamera(
                    canvasContext.getCurrentBoard().id,
                    cameraPosition,
                    cameraZoom
                );
                canvasContext.updateCurrentBoardCamera(
                    cameraPosition,
                    cameraZoom
                );
            } catch (err) {
                console.error("Couldnt update board camera: " + err);
            }
        };

        update();
    }, [cameraPosition, cameraZoom]);

    const handleRenameBoard = async (newName: string) => {
        await updateBoardName(canvasContext.getCurrentBoard().id, newName);
        canvasContext.getCurrentBoard().name = newName;
    };

    const handleResetBoard = async () => {
        if (
            objectsBeingSavedOnDatabase.current.length !== 0 ||
            objectsBeingUpdatedButNotReadyForSaving.current.size !== 0 ||
            objectsToSaveOnDatabase.current.size !== 0
        ) {
            throw new Error(
                "Can't reset board while objects are pending save."
            );
        }
        await resetBoard(canvasContext.currentBoardId);

        canvasContext.updateCurrentBoardObjects([]);
        setSaveObjectsError({ error: null });
        objectsBeingSavedOnDatabase.current = [];
        objectsBeingUpdatedButNotReadyForSaving.current.clear();
        objectsToSaveOnDatabase.current.clear();
    };

    const handleDeleteBoard = async () => {
        if (
            objectsBeingSavedOnDatabase.current.length !== 0 ||
            objectsBeingUpdatedButNotReadyForSaving.current.size !== 0 ||
            objectsToSaveOnDatabase.current.size !== 0
        ) {
            throw new Error(
                "Can't delete board while objects are pending save."
            );
        }
        await deleteBoard(canvasContext.currentBoardId);
        window.location.reload();
    };

    // Prevent refreshing or leaving page if objects are currently being saved / awaiting save
    useEffect(() => {
        const preventLeaving = (e: any) => {
            if (!hasPendingSaveOperations()) {
                return;
            }
            e.preventDefault();
            e.returnValue = "";
        };
        window.addEventListener("beforeunload", preventLeaving);

        // Clean up the event listener to avoid memory leaks
        return () => {
            window.removeEventListener("beforeunload", preventLeaving);
        };
    }, []);

    function hasPendingSaveOperations() {
        return (
            objectsBeingSavedOnDatabase.current.length !== 0 ||
            objectsToSaveOnDatabase.current.size !== 0 ||
            objectsBeingUpdatedButNotReadyForSaving.current.size !== 0
        );
    }

    // Used upon loading from my boards. Used for toolbox, burger menu, debug panel etc.
    const fadeInAnimation = {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: { duration: 0.5, ease: "easeOut" },
    } as const;

    return (
        <div className="relative h-screen w-screen">
            {/* Canvas */}
            <div className="h-full w-full">
                <CanvasInteractive
                    key={canvasContext.currentBoardId}
                    initialObjects={canvasContext.getCurrentBoard().objects}
                    initialCameraPosition={
                        canvasContext.getCurrentBoard().lastCameraPosition
                    }
                    initialCameraZoom={
                        canvasContext.getCurrentBoard().lastCameraZoom
                    }
                    selectedTool={tool}
                    selectedColor={color}
                    selectedStroke={stroke}
                    onCameraChange={(camera: Camera) => {
                        setCameraPosition(camera.position);
                        setCameraZoom(camera.zoom);
                    }}
                    onObjectAmountChange={(objectAmount: number) =>
                        setObjectAmount(objectAmount)
                    }
                    onObjectUpdated={onObjectUpdatedOrAdded}
                    onObjectsCommit={onObjectsCommit}
                />
            </div>

            {/* SAVE ERROR BANNER */}
            {saveObjectsError.error && (
                <div className="animate-in fade-in slide-in-from-top-2 pointer-events-none fixed top-6 left-1/2 z-100 -translate-x-1/2">
                    <div
                        className="flex flex-col gap-1 rounded-xl px-5 py-3 text-sm font-medium shadow-xl"
                        style={{
                            backgroundColor: "var(--error)",
                            color: "var(--error-foreground)",
                        }}
                    >
                        <div className="flex items-center gap-3">
                            {saveObjectsError.retryStatus === "retrying" ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <XCircle className="h-4 w-4" />
                            )}
                            <span>{saveObjectsError.error}</span>
                        </div>

                        {saveObjectsError.retryStatus ===
                            "start-retry-timer" && (
                            <span
                                className="ml-7 text-xs opacity-80"
                                style={{ color: "var(--error-foreground)" }}
                            >
                                Retrying in {}s
                            </span>
                        )}

                        {typeof saveObjectsError.retryStatus === "number" && (
                            <span
                                className="ml-7 text-xs opacity-80"
                                style={{ color: "var(--error-foreground)" }}
                            >
                                Retrying in {saveObjectsError.retryStatus}s
                            </span>
                        )}

                        {saveObjectsError.retryStatus === "retrying" && (
                            <span
                                className="ml-7 text-xs opacity-80"
                                style={{ color: "var(--error-foreground)" }}
                            >
                                Retrying...
                            </span>
                        )}
                    </div>
                </div>
            )}

            <motion.div {...fadeInAnimation}>
                {/* Top-left menu container */}
                <div
                    className="absolute top-4 left-4 z-3"
                    onMouseLeave={() => setMenuOpen(false)}
                >
                    {/* Menu burger icon — opens menu */}
                    <button
                        onMouseEnter={() => setMenuOpen(true)}
                        className="flex h-11 w-11 items-center justify-center rounded-full shadow-md transition-colors"
                        style={{
                            backgroundColor: "var(--card)",
                            color: "var(--card-foreground)",
                        }}
                    >
                        <Menu size={22} />
                    </button>

                    {/* Dropdown */}
                    <div
                        className={`mt-2 w-56 origin-top-left rounded-xl p-2 shadow-xl transition-all duration-300 ease-out ${
                            menuOpen
                                ? "translate-y-0 scale-100 opacity-100"
                                : "pointer-events-none -translate-y-2 scale-95 opacity-0"
                        }`}
                        style={{ backgroundColor: "var(--card)" }}
                    >
                        {sessionContext.userData.role === "guest" && (
                            <MenuItem
                                icon={<User size={18} />}
                                label="Login"
                                onClick={() => setAuthView("login")}
                            />
                        )}
                        {sessionContext.userData.role === "user" && (
                            <MenuItem
                                icon={<User size={18} />}
                                label={
                                    "Manage account: " +
                                    sessionContext.userData.displayName
                                }
                                onClick={() => setAuthView("manage-user")}
                            />
                        )}

                        <MenuItem
                            icon={<LayoutDashboard size={18} />}
                            label="My Boards"
                            disabled={sessionContext.userData.role === "guest"}
                            disabledTooltip="You must be logged in to access additional boards."
                            onClick={() => {
                                if (!hasPendingSaveOperations()) openMyBoards();
                            }}
                        />

                        <MenuItem
                            icon={<Settings2 size={18} />}
                            label="Manage This Board"
                            onClick={() => setShowManageThisBoardModal(true)}
                        />

                        <MenuItem icon={<Share2 size={18} />} label="Share" />

                        <MenuItem
                            icon={
                                themeContext.theme === "light" ? (
                                    <Moon size={18} />
                                ) : (
                                    <Sun size={18} />
                                )
                            }
                            label={`Switch to ${themeContext.theme === "light" ? "Dark" : "Light"} Mode`}
                            onClick={() =>
                                themeContext.updateTheme(
                                    themeContext.theme === "light"
                                        ? "dark"
                                        : "light"
                                )
                            }
                        />
                        <MenuItem
                            icon={<Info size={18} />}
                            label={
                                showDebug
                                    ? "Hide Debug Info"
                                    : "Show Debug Info"
                            }
                            onClick={() => setShowDebug((v) => !v)}
                        />
                    </div>
                </div>
            </motion.div>

            <motion.div {...fadeInAnimation}>
                {/* Debug */}
                {showDebug && (
                    <div
                        className="absolute bottom-4 left-4 w-110 rounded-lg p-3 font-mono text-sm shadow-md"
                        style={{
                            backgroundColor: "var(--card)",
                            color: "var(--card-foreground)",
                        }}
                    >
                        <p className="font-bold">Debug</p>
                        <p>
                            Camera Pos: {cameraPosition.x}, {cameraPosition.y}
                        </p>
                        <p>Camera Zoom: {cameraZoom.toFixed(2)}</p>
                        <p>FPS: {fps}</p>
                        <p>Objects: {objectAmount}</p>
                    </div>
                )}
            </motion.div>

            <motion.div {...fadeInAnimation}>
                {/* Toolbox */}
                <Toolbox
                    className="absolute top-4 right-4 rounded-lg"
                    onToolChange={setTool}
                    onColorChange={setColor}
                    onWidthChange={setStroke}
                />
            </motion.div>
            {/* Manage Board Modal */}
            {showManageThisBoardModal && (
                <ManageThisBoardModal
                    name={canvasContext.getCurrentBoard().name}
                    createdOn={canvasContext.getCurrentBoard().createdOn}
                    onRename={handleRenameBoard}
                    onReset={handleResetBoard}
                    onDelete={handleDeleteBoard}
                    onClose={() => setShowManageThisBoardModal(false)}
                />
            )}

            {/* Login Modal */}
            {authView === "login" && (
                <LoginModal
                    onCreateAccount={() => setAuthView("create-account")}
                    onForgotPassword={() => setAuthView("forgot-password")}
                    onClose={() => setAuthView(null)}
                />
            )}

            {/* Create Account Modal */}
            {authView === "create-account" && (
                <CreateAccountModal
                    onLogin={() => setAuthView("login")}
                    onClose={() => setAuthView(null)}
                />
            )}
        </div>
    );
}

function MenuItem({
    icon,
    label,
    onClick,
    disabled = false,
    disabledTooltip,
}: {
    icon: React.ReactNode;
    label: string;
    onClick?: () => void;
    disabled?: boolean;
    disabledTooltip?: string;
}) {
    const [isHover, setIsHover] = useState(false);

    return (
        <div className="group relative">
            <button
                onClick={disabled ? undefined : onClick}
                disabled={disabled}
                onMouseEnter={() => setIsHover(true)}
                onMouseLeave={() => setIsHover(false)}
                className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition"
                style={{
                    color: disabled
                        ? "var(--muted-foreground)"
                        : isHover
                          ? "var(--accent-foreground)"
                          : "var(--card-foreground)",
                    backgroundColor: disabled
                        ? "transparent"
                        : isHover
                          ? "var(--accent)"
                          : "var(--card)",
                    cursor: disabled
                        ? "not-allowed"
                        : isHover
                          ? "pointer"
                          : "default",
                }}
            >
                {icon}
                <span>{label}</span>
            </button>

            {disabled && disabledTooltip && (
                <div
                    className="pointer-events-none absolute top-1/2 left-full ml-2 -translate-y-1/2 rounded-md px-2 py-1 text-xs whitespace-nowrap opacity-0 transition-opacity group-hover:opacity-100"
                    style={{
                        backgroundColor: "var(--card-muted)",
                        color: "var(--card-foreground)",
                    }}
                >
                    {disabledTooltip}
                </div>
            )}
        </div>
    );
}

export default CanvasEditor;
