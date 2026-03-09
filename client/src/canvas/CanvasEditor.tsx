import Toolbox from "./Toolbox";
import { RefObject, useContext, useEffect, useRef, useState } from "react";
import { Camera, Tool, Vec2, WorldObject } from "../types/canvas";
import isDeepEqual from "fast-deep-equal";
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
import LoginModal from "./modals/LoginModal";
import { createUser } from "../api/users";
import CanvasInteractive from "./CanvasInteractive";
import { motion } from "motion/react";
import { CanvasContext } from "../types/context/CanvasContext";
import { SessionContext } from "../types/context/SessionContext";
import { ThemeContext } from "../types/context/ThemeContext";
import ManageAccountModal from "./modals/ManageAccountModal";
import { logout } from "../api/auth";
import { updateUserDisplayName } from "../api/me";
import { env } from "../env";

interface CanvasEditorProps {
    openMyBoards: () => void;
}

// Handles saving and uploading data, as well as tool selection and all overlays
function CanvasEditor({ openMyBoards }: CanvasEditorProps) {
    const themeContext = useContext(ThemeContext);
    const canvasContext = useContext(CanvasContext);
    // Use this whenever after we run code async, otherwise we get stale closure
    const canvasContextRef = useRef(canvasContext);
    useEffect(() => {
        canvasContextRef.current = canvasContext;
    });
    const sessionContext = useContext(SessionContext);

    // FPS
    const [fps, setFps] = useState(0);
    const frames = useRef(0);
    const lastTime = useRef(performance.now());
    // Calculate FPS
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

    // Menu
    const [showDebug, setShowDebug] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [showManageThisBoardModal, setShowManageThisBoardModal] =
        useState(false);
    const [authView, setAuthView] = useState<
        "login" | "forgot-password" | "create-account" | "manage-user" | null
    >(null);

    // Used if a save operation is currently undergoing and user asked to go my boards
    const [queued_navigateToMyBoards, setQueued_navigateToMyBoards] =
        useState(false);
    useEffect(() => {
        if (queued_navigateToMyBoards && !hasPendingSaveOperations()) {
            openMyBoards();
            setQueued_navigateToMyBoards(false);
        }
    }, [canvasContext.local_unsavedObjects]);

    // Used if a save operation is currently undergoing and user requested to reset board
    const [queued_resetBoard, setQueued_ResetBoard] = useState(false);
    useEffect(() => {
        if (queued_resetBoard && !hasPendingSaveOperations()) {
            handleResetBoard();
            setQueued_ResetBoard(false);
        }
    }, [canvasContext.local_unsavedObjects]);

    // Used if a save operation is currently undergoing and user requested to reset board
    const [queued_deleteBoard, setQueued_deleteBoard] = useState(false);
    useEffect(() => {
        if (queued_deleteBoard && !hasPendingSaveOperations()) {
            handleDeleteBoard();
            setQueued_deleteBoard(false);
        }
    }, [canvasContext.local_unsavedObjects]);

    // Saving objects
    // Objects that are currently being saved (mid-fetch request)
    const objectsBeingSavedOnDatabase: RefObject<WorldObject[]> = useRef([]);
    // Error data if couldn't save objects
    const [saveObjectsError, setSaveObjectsError] = useState<
        | { error: null }
        | {
              error: string;
              retryCooldownSecondsOrStatus: "retrying" | number;
              lastRetryCooldown: number;
          }
    >({ error: null });

    // Fix for state closure
    const saveObjectsErrorRef = useRef(saveObjectsError);
    useEffect(() => {
        saveObjectsErrorRef.current = saveObjectsError;
    }, [saveObjectsError]);

    // COOLDOWN FOR SAVING BOARD OBJECTS (CLIENT SIDE "RATE LIMITING")
    const saveCooldownTimeoutRef = useRef<number | null>(null);
    const saveObjectsRequestOnCooldown = useRef(false);

    const startCooldownTimeout = (forceTimeoutNow = false) => {
        // If we need to force the timeout to happen now (such as when going to my boards or reseting/deleting board)
        if (forceTimeoutNow) {
            saveObjectsRequestOnCooldown.current = false;
            requestSaveObjectsOnDatabaseFunction.current(); // Use the ref to avoid stale closure
            saveObjectsRequestOnCooldown.current = true;
            return;
        }
        if (env.VITE_SAVE_REQUEST_COOLDOWN === 0) {
            // If we don't want a cooldown timer, immediately execute the save
            if (
                objectsToSaveOnDatabase.current.size > 0 &&
                saveObjectsErrorRef.current.error === null && // Use the ref to avoid stale closure
                objectsBeingSavedOnDatabase.current.length === 0
            ) {
                console.log(
                    "Requesting to save " +
                        objectsToSaveOnDatabase.current.size +
                        " objects on database (request likely originated because objects accumulated during a prior save)."
                );
                requestSaveObjectsOnDatabaseFunction.current(); // Use the ref to avoid stale closure
            }
            return;
        }

        if (saveCooldownTimeoutRef.current !== null) {
            return;
        }

        saveCooldownTimeoutRef.current = window.setTimeout(() => {
            saveCooldownTimeoutRef.current = null;
            saveObjectsRequestOnCooldown.current = false;

            // In case we have objects that are waiting to be saved (previously failed because of our cooldown), try to save now
            if (
                objectsToSaveOnDatabase.current.size > 0 &&
                saveObjectsErrorRef.current.error === null && // Use the ref to avoid stale closure
                objectsBeingSavedOnDatabase.current.length === 0
            ) {
                console.log(
                    "Cooldown expired! Requesting to save " +
                        objectsToSaveOnDatabase.current.size +
                        " objects on database."
                );
                requestSaveObjectsOnDatabaseFunction.current(); // Use the ref to avoid stale closure
            }
        }, env.VITE_SAVE_REQUEST_COOLDOWN);
    };
    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (saveCooldownTimeoutRef.current)
                clearTimeout(saveCooldownTimeoutRef.current);
        };
    }, []);

    // When objects are ready to be saved to database (user released left click, for example).
    // Generally, only one object will be in objectsBeingUpdatedButNotReadyForSaving when this method is called,
    // but our code should be able to support cases where there's multiple objects at once.
    function onObjectsCommit() {
        console.log(
            "Requesting to commit " +
                (canvasContext.local_unsavedObjects.length -
                    objectsBeingSavedOnDatabase.current.length) +
                " objects to database."
        );

        // As soon as objects start saving - objectsToSaveOnDatabase becomes irrelevant, it'll get overwritten when it finished saving. So this is ok even if this line executes mid-save.
        canvasContext.local_unsavedObjects.forEach((object) => {
            objectsToSaveOnDatabase.current.set(object.id, object);
        });
        requestSaveObjectsOnDatabase();
    }

    // Avoid stale closure in timer effect hooks
    const requestSaveObjectsOnDatabaseFunction = useRef(
        requestSaveObjectsOnDatabase
    );
    // Keep the ref constantly updated on every single render
    useEffect(() => {
        requestSaveObjectsOnDatabaseFunction.current =
            requestSaveObjectsOnDatabase;
    });

    // Objects that are ready to be saved on the database
    const objectsToSaveOnDatabase: RefObject<Map<string, WorldObject>> = useRef(
        new Map()
    );

    // Main method to save objects on database
    async function requestSaveObjectsOnDatabase(asErrorRetry: boolean = false) {
        // Sanity check. Do not remove this because if it's equal to 0 and we call this method multiple times, we could have multiple fetch requests running concurrently, which could cause problems if one of them fails and causes us to reload the board.
        if (objectsToSaveOnDatabase.current.size === 0) {
            console.warn(
                "Request to save objects ignored because object length is 0."
            );
            return;
        }

        if (saveObjectsErrorRef.current.error && !asErrorRetry) {
            console.warn(
                "Request to save objects (length " +
                    objectsToSaveOnDatabase.current.size +
                    ") ignored because waiting for error retry."
            );
            return;
        }

        if (objectsBeingSavedOnDatabase.current.length > 0) {
            console.warn(
                "Request to save objects (length " +
                    (canvasContext.local_unsavedObjects.length -
                        objectsBeingSavedOnDatabase.current.length) +
                    ") ignored because waiting on existing request."
            );
            return;
        }

        if (saveObjectsRequestOnCooldown.current && !asErrorRetry) {
            console.warn(
                "Request to save objects (length " +
                    objectsToSaveOnDatabase.current.size +
                    ") ignored because waiting for cooldown to expire."
            );
            return;
        }

        objectsBeingSavedOnDatabase.current = Array.from(
            objectsToSaveOnDatabase.current.values()
        );

        console.log(
            "Saving " +
                objectsBeingSavedOnDatabase.current.length +
                " board objects on database."
        );

        if (env.VITE_SAVE_REQUEST_COOLDOWN > 0) {
            saveObjectsRequestOnCooldown.current = true;
            startCooldownTimeout();
        }

        try {
            await updateBoardObjects(
                canvasContext.local_currentBoardId,
                objectsBeingSavedOnDatabase.current
            );
        } catch (err) {
            console.error("Failure to save the objects!");

            objectsBeingSavedOnDatabase.current = [];
            setSaveObjectsError((prev) => {
                const accumulatedCooldown = prev.error
                    ? prev.lastRetryCooldown
                    : 0; // Add delay from previous attempts
                const updatedCooldown =
                    accumulatedCooldown + env.VITE_SAVE_RETRY_COOLDOWN;
                const finalCooldown =
                    env.VITE_SAVE_RETRY_MAX_COOLDOWN === 0 // If max cooldown is 0, we ignore it
                        ? updatedCooldown
                        : Math.min(
                              updatedCooldown,
                              env.VITE_SAVE_RETRY_MAX_COOLDOWN
                          );
                return {
                    error: "Failed to save changes. Your work is out of sync.",
                    retryCooldownSecondsOrStatus: finalCooldown,
                    lastRetryCooldown: finalCooldown,
                };
            });
            return;
        }

        console.log("Successfully saved the objects.");

        setSaveObjectsError({ error: null });
        // Iterate over all objects we saved, remove them from localUnsavedObjects, UNLESS they were modified since the save started (unlikely but possible)
        // Since this is all happening after an await asynchrounsly, the context is stale, so we use the ref to read it here
        const remainingUnsavedObjects =
            canvasContextRef.current.local_unsavedObjects.filter(
                (objectLocal) => {
                    const savedVersion =
                        objectsBeingSavedOnDatabase.current.find(
                            (s) => s.id === objectLocal.id
                        );

                    // If it wasn't in the save batch, keep it.
                    if (!savedVersion) return true;

                    // If it WAS in the batch, check if it has changed since then.
                    // If isDeepEqual is true, they are identical -> Return false, removes it.
                    // If isDeepEqual is false, the user modified it mid-save -> Return true, keeps it.
                    return !isDeepEqual(objectLocal, savedVersion);
                }
            );
        canvasContextRef.current.onCurrentBoardObjectsSaved(
            // we do this so if the object was saved but modified stays then, it stays only in localunsavedobjects and not in both buffers
            objectsBeingSavedOnDatabase.current.filter(
                (x) => !remainingUnsavedObjects.includes(x)
            )
        );
        canvasContextRef.current.setLocalUnsavedObjects(
            remainingUnsavedObjects
        );

        objectsBeingSavedOnDatabase.current = [];

        objectsToSaveOnDatabase.current = new Map();
        remainingUnsavedObjects.forEach((object) => {
            objectsToSaveOnDatabase.current.set(object.id, object);
        });

        // Save any objects that were piling up as this request was processed
        if (objectsToSaveOnDatabase.current.size > 0) {
            console.log(
                objectsToSaveOnDatabase.current.size +
                    " objects accumulated while processing the request. Attempting to save them once cooldown expires."
            );
            startCooldownTimeout();
        }
    }

    // Handle object save error retry
    useEffect(() => {
        if (!saveObjectsError.error) return;

        const secondsLeft = saveObjectsError.retryCooldownSecondsOrStatus;
        if (secondsLeft === "retrying") return;

        // If we've hit 0, trigger the retry
        if (secondsLeft <= 0) {
            setSaveObjectsError((prev) => ({
                ...prev,
                retryCooldownSecondsOrStatus: "retrying",
            }));
            console.log("Retrying to save objects.");
            requestSaveObjectsOnDatabaseFunction.current(true);
            return;
        }

        // If we are actively counting down, tick down by 1 every second
        const timer = setTimeout(() => {
            setSaveObjectsError((prev) => {
                if (
                    prev.error === null ||
                    prev.retryCooldownSecondsOrStatus === "retrying"
                )
                    return prev;

                return {
                    ...prev,
                    retryCooldownSecondsOrStatus:
                        prev.retryCooldownSecondsOrStatus - 1,
                };
            });
        }, 1000);

        return () => clearTimeout(timer);
    }, [saveObjectsError]);

    const handleRenameBoard = async (newName: string) => {
        await updateBoardName(canvasContext.getCurrentBoard().id, newName);
        canvasContext.getCurrentBoard().name = newName;
    };

    const handleResetBoard = async () => {
        if (hasPendingSaveOperations()) {
            // Will quicken the ongoing save processes and reset the board as soon as save is done
            setQueued_ResetBoard(true);
            startCooldownTimeout(true);
            return;
        }
        await resetBoard(canvasContext.local_currentBoardId);

        canvasContext.updateCurrentBoardObjects([]);
        setSaveObjectsError({ error: null });
        objectsBeingSavedOnDatabase.current = [];
        canvasContext.local_unsavedObjects = [];
        objectsToSaveOnDatabase.current.clear();
    };

    const handleDeleteBoard = async () => {
        if (hasPendingSaveOperations()) {
            // Will quicken the ongoing save processes and reset the board as soon as save is done
            setQueued_deleteBoard(true);
            startCooldownTimeout(true);
            return;
        }
        await deleteBoard(canvasContext.local_currentBoardId);
        window.location.reload();
    };

    const handleUserLogout = async () => {
        await logout();
    };

    const handleUserChangeDisplayName = async (displayName: string) => {
        await updateUserDisplayName(displayName);
        sessionContext.updateUserDisplayName(displayName);
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
            canvasContext.local_unsavedObjects.length !== 0
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
                    key={canvasContext.local_currentBoardId}
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
                            {saveObjectsError.retryCooldownSecondsOrStatus ===
                            "retrying" ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <XCircle className="h-4 w-4" />
                            )}
                            <span>{saveObjectsError.error}</span>
                        </div>

                        {typeof saveObjectsError.retryCooldownSecondsOrStatus ===
                            "number" && (
                            <span
                                className="ml-7 text-xs opacity-80"
                                style={{ color: "var(--error-foreground)" }}
                            >
                                Retrying in{" "}
                                {saveObjectsError.retryCooldownSecondsOrStatus}s
                            </span>
                        )}

                        {saveObjectsError.retryCooldownSecondsOrStatus ===
                            "retrying" && (
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
                                if (!hasPendingSaveOperations()) {
                                    openMyBoards();
                                } else {
                                    // quicken the save process and queue the navigate to my boards until save finishes
                                    setQueued_navigateToMyBoards(true);
                                    startCooldownTimeout(true);
                                }
                            }}
                        />

                        <MenuItem
                            icon={<Settings2 size={18} />}
                            label="Manage This Board"
                            onClick={() => setShowManageThisBoardModal(true)}
                        />

                        <MenuItem
                            icon={<Share2 size={18} />}
                            label="Share Board"
                            disabled={true}
                            disabledTooltip="This feature is not available yet."
                        />

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
                            Camera Pos: {canvasContext.local_camera.position.x},{" "}
                            {canvasContext.local_camera.position.y}
                        </p>
                        <p>
                            Camera Zoom:{" "}
                            {canvasContext.local_camera.zoom.toFixed(2)}
                        </p>
                        <p>FPS: {fps}</p>
                        <p>
                            Objects:{" "}
                            {canvasContext.getCurrentBoard().objects.length +
                                canvasContext.local_unsavedObjects.length}{" "}
                            ({canvasContext.getCurrentBoard().objects.length}{" "}
                            saved on server +{" "}
                            {canvasContext.local_unsavedObjects.length} unsaved)
                        </p>
                    </div>
                )}
            </motion.div>

            <motion.div {...fadeInAnimation}>
                {/* Toolbox */}
                <Toolbox className="absolute top-4 right-4 rounded-lg" />
            </motion.div>
            {/* Manage Board Modal */}
            {showManageThisBoardModal && (
                <ManageThisBoardModal
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

            {/* Create Account Modal */}
            {authView === "manage-user" && (
                <ManageAccountModal
                    onLogout={handleUserLogout}
                    onUpdateDisplayName={handleUserChangeDisplayName}
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
