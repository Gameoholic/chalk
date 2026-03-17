import Toolbox from "./Toolbox";
import { RefObject, useContext, useEffect, useRef, useState } from "react";
import { Camera, Vec2, WorldObject } from "../types/canvas";
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
    SlidersHorizontal,
} from "lucide-react";
import {
    deleteBoard,
    deleteBoardObjects,
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
import { ShowDebugInfoContext } from "../types/context/ShowDebugInfoContext";
import AdvancedOptionsModal from "./modals/AdvancedOptionsModal";

interface CanvasEditorProps {
    openMyBoards: () => void;
    tourMenuOpen?: boolean;
    setTourMenuOpen?: (open: boolean) => void;
    onTourCameraMoved?: () => void;
    keepMenuOpen?: boolean;
    openLoginOnMount?: boolean;
    onLoginOpened?: () => void;
}

// Handles saving and uploading data, as well as tool selection and all overlays
function CanvasEditor({
    openMyBoards,
    tourMenuOpen,
    setTourMenuOpen,
    onTourCameraMoved,
    keepMenuOpen,
    openLoginOnMount,
    onLoginOpened,
}: CanvasEditorProps) {
    const showDebugInfoContext = useContext(ShowDebugInfoContext);
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
    const [menuOpen, setMenuOpen] = useState(false);
    const [showManageThisBoardModal, setShowManageThisBoardModal] =
        useState(false);
    const [showAdvancedOptionsModal, setShowAdvancedOptionsModal] =
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

    // Open login modal when requested from welcome screen
    useEffect(() => {
        if (tourMenuOpen !== undefined && setTourMenuOpen) {
            setMenuOpen(tourMenuOpen);
        }
    }, [tourMenuOpen, setTourMenuOpen]);

    // Open login modal when requested from welcome screen
    useEffect(() => {
        if (openLoginOnMount) {
            setAuthView("login");
            onLoginOpened?.();
        }
    }, [openLoginOnMount, onLoginOpened]);

    // Saving objects
    // Objects that are currently being saved (mid-fetch request)
    const objectsBeingSavedOnDatabase: RefObject<WorldObject[]> = useRef([]);
    // Objects that are currently being deleted (mid-fetch request)
    const objectsBeingDeletedOnDatabase = useRef<Set<string>>(new Set());
    // Error data if couldn't save board
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
                saveObjectsErrorRef.current.error === null && // Use the ref to avoid stale closure
                objectsBeingSavedOnDatabase.current.length === 0 &&
                (objectsToSaveOnDatabase.current.size > 0 ||
                    wasCameraUpdatedSinceLastSave())
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
                saveObjectsErrorRef.current.error === null && // Use the ref to avoid stale closure
                objectsBeingSavedOnDatabase.current.length === 0 &&
                objectsBeingDeletedOnDatabase.current.size === 0 &&
                (objectsToSaveOnDatabase.current.size > 0 ||
                    objectsToDeleteOnDatabase.current.size > 0 ||
                    wasCameraUpdatedSinceLastSave())
            ) {
                console.log(
                    "Cooldown expired! Requesting to save " +
                        objectsToSaveOnDatabase.current.size +
                        " objects and delete " +
                        objectsToDeleteOnDatabase.current.size +
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
            "Commit: Requesting to save " +
                (canvasContext.local_unsavedObjects.length -
                    objectsBeingSavedOnDatabase.current.length) +
                " objects and delete " +
                (canvasContext.local_deletedObjectIds.size -
                    objectsBeingDeletedOnDatabase.current.size) +
                " objects to database."
        );

        // As soon as objects start saving - objectsToSaveOnDatabase becomes irrelevant, it'll get overwritten when it finished saving. So this is ok even if this line executes mid-save.
        canvasContext.local_unsavedObjects.forEach((object) => {
            objectsToSaveOnDatabase.current.set(object.id, object);
        });
        canvasContext.local_deletedObjectIds.forEach((objectId) => {
            objectsToDeleteOnDatabase.current.add(objectId);
        });
        requestSaveBoard();
    }

    // When camera is ready to be saved to database (camera finished dragging or zoom changed).
    function onCameraCommit() {
        console.log("Requesting to commit camera state to database.");

        if (onTourCameraMoved) {
            onTourCameraMoved();
        }

        requestSaveBoard();
    }

    // Avoid stale closure in timer effect hooks
    const requestSaveObjectsOnDatabaseFunction = useRef(requestSaveBoard);
    // Keep the ref constantly updated on every single render
    useEffect(() => {
        requestSaveObjectsOnDatabaseFunction.current = requestSaveBoard;
    });

    // Objects that are ready to be saved on the database
    const objectsToSaveOnDatabase: RefObject<Map<string, WorldObject>> = useRef(
        new Map()
    );
    // Object ids that are ready to be deleted on the database
    const objectsToDeleteOnDatabase: RefObject<Set<string>> = useRef(new Set());

    function wasCameraUpdatedSinceLastSave() {
        const cameraPosOnClient =
            canvasContextRef.current.local_camera.position;
        const cameraZoomOnClient = canvasContextRef.current.local_camera.zoom;
        return (
            cameraPosOnClient.x !==
                canvasContextRef.current.getCurrentBoard().lastCameraPosition
                    .x ||
            cameraPosOnClient.y !==
                canvasContextRef.current.getCurrentBoard().lastCameraPosition
                    .y ||
            cameraZoomOnClient !==
                canvasContextRef.current.getCurrentBoard().lastCameraZoom
        );
    }

    // Main method to save the board on database
    async function requestSaveBoard(asErrorRetry: boolean = false) {
        // Sanity check.
        const saveObjects = objectsToSaveOnDatabase.current.size > 0;
        const deleteObjects = objectsToDeleteOnDatabase.current.size > 0;
        const saveCamera = wasCameraUpdatedSinceLastSave();
        if (!saveObjects && !saveCamera && !deleteObjects) {
            console.warn(
                "Request to save objects+camera ignored because object save/delete length is 0 and camera hasn't updated since last save."
            );
            return;
        }

        if (saveObjectsErrorRef.current.error && !asErrorRetry) {
            console.warn(
                "Request to save/delete objects+camera (length " +
                    (objectsToSaveOnDatabase.current.size +
                        objectsToDeleteOnDatabase.current.size) +
                    ") ignored because waiting for error retry."
            );
            return;
        }

        // todo: um what about if it's just a camera request? why dont we check that too?
        // todo
        //to do/
        // todo
        if (
            objectsBeingSavedOnDatabase.current.length > 0 ||
            objectsBeingDeletedOnDatabase.current.size > 0
        ) {
            console.warn(
                "Request to save objects+camera (length " +
                    (canvasContext.local_unsavedObjects.length -
                        objectsBeingSavedOnDatabase.current.length) +
                    ") ignored because waiting on existing request."
            );
            return;
        }

        if (saveObjectsRequestOnCooldown.current && !asErrorRetry) {
            console.warn(
                "Request to save objects+camera (length " +
                    objectsToSaveOnDatabase.current.size +
                    ") ignored because waiting for cooldown to expire."
            );
            return;
        }

        objectsBeingSavedOnDatabase.current = Array.from(
            objectsToSaveOnDatabase.current.values()
        );
        objectsBeingDeletedOnDatabase.current = new Set(
            objectsToDeleteOnDatabase.current
        );

        if (saveObjects) {
            console.log(
                "Saving " +
                    objectsBeingSavedOnDatabase.current.length +
                    " board objects on database."
            );
        }
        if (deleteObjects) {
            console.log(
                "Deleting " +
                    objectsBeingDeletedOnDatabase.current.size +
                    " board objects on database."
            );
        }
        if (saveCamera) {
            console.log("Saving camera properties on database.");
        }

        if (env.VITE_SAVE_REQUEST_COOLDOWN > 0) {
            saveObjectsRequestOnCooldown.current = true;
            startCooldownTimeout();
        }

        const cameraPosOnClient =
            canvasContextRef.current.local_camera.position;
        const cameraZoomOnClient = canvasContextRef.current.local_camera.zoom;
        try {
            const savesToExecute: Promise<void>[] = [];

            if (saveCamera) {
                savesToExecute.push(
                    updateBoardCamera(
                        canvasContext.getCurrentBoard().id,
                        cameraPosOnClient,
                        cameraZoomOnClient
                    )
                );
            }

            if (saveObjects) {
                savesToExecute.push(
                    updateBoardObjects(
                        canvasContext.local_currentBoardId,
                        objectsBeingSavedOnDatabase.current
                    )
                );
            }

            await Promise.all(savesToExecute);
            // Todo: For now I'm hesitant to put this along with the Promise.all() because I want to avoid a situation where
            // an object was added/modified and also deleted in the same save operation, and then server-side it's deleted first and then re-created
            // I'm not sure if this can happen, probably not, if I'm 100% that not then we can put this along with the Promise.all above
            if (deleteObjects) {
                await deleteBoardObjects(
                    canvasContext.local_currentBoardId,
                    objectsBeingDeletedOnDatabase.current
                );
            }
        } catch (err) {
            console.error("Failure to save the objects+camera!");

            objectsBeingSavedOnDatabase.current = [];
            objectsBeingDeletedOnDatabase.current = new Set();
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

        console.log("Successfully saved the objects+camera.");

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
        // Update the server-synced context properties
        canvasContextRef.current.onCurrentBoardSaved(
            // we do this so if the object was saved but modified stays then, it stays only in localunsavedobjects and not in both buffers
            objectsBeingSavedOnDatabase.current.filter(
                (x) => !remainingUnsavedObjects.includes(x)
            ),
            objectsBeingDeletedOnDatabase.current,
            cameraPosOnClient,
            cameraZoomOnClient
        );

        canvasContextRef.current.setLocalUnsavedObjects(
            remainingUnsavedObjects
        );
        const remainingUndeletedObjectIds = new Set(
            [...canvasContext.local_deletedObjectIds].filter(
                (id) => !objectsBeingDeletedOnDatabase.current.has(id)
            )
        );
        canvasContextRef.current.setLocalDeletedObjectIds(
            remainingUndeletedObjectIds
        );

        objectsBeingSavedOnDatabase.current = [];
        objectsBeingDeletedOnDatabase.current = new Set();

        objectsToSaveOnDatabase.current = new Map();
        remainingUnsavedObjects.forEach((object) => {
            objectsToSaveOnDatabase.current.set(object.id, object);
        });
        objectsToDeleteOnDatabase.current = remainingUndeletedObjectIds;

        // Save any objects that were piling up as this request was processed
        if (objectsToSaveOnDatabase.current.size > 0) {
            console.log(
                objectsToSaveOnDatabase.current.size +
                    " objects accumulated while processing the request. Attempting to save them once cooldown expires."
            );
            console.log(
                objectsToDeleteOnDatabase.current.size +
                    " object deletions accumulated while processing the request. Attempting to save them once cooldown expires."
            );
            startCooldownTimeout();
        }

        // Save camera again if it changed while this request was being processed
        if (
            canvasContextRef.current.local_camera.position.x !==
                cameraPosOnClient.x ||
            canvasContextRef.current.local_camera.position.y !==
                cameraPosOnClient.y ||
            canvasContextRef.current.local_camera.zoom !== cameraZoomOnClient
        ) {
            console.log(
                "Camera properties updated while processing the request. Attempting to save once cooldown expires."
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

    // Animation for smoothly zooming out
    const handleResetCameraZoom = () => {
        const DURATION = 500;
        const startTime = performance.now();
        const {
            zoom: startZoom,
            position: startPos,
            size,
        } = canvasContext.local_camera;

        // The world-space point at the center of the viewport — kept locked throughout the animation
        const centerX = size.x / 2;
        const centerY = size.y / 2;
        const worldAnchorX = startPos.x + centerX / startZoom;
        const worldAnchorY = startPos.y + centerY / startZoom;

        const animate = (currentTime: number) => {
            const progress = Math.min((currentTime - startTime) / DURATION, 1);
            const ease = 1 - Math.pow(1 - progress, 3); // ease-out cubic

            const zoom = startZoom + (1.0 - startZoom) * ease;

            // Derive position from zoom directly — interpolating them separately causes drift
            canvasContext.setLocalCamera((prev) => ({
                ...prev,
                zoom,
                position: {
                    x: worldAnchorX - centerX / zoom,
                    y: worldAnchorY - centerY / zoom,
                },
            }));

            if (progress < 1) requestAnimationFrame(animate);
        };

        requestAnimationFrame(animate);
    };

    // Prevent refreshing or leaving page if objects are currently being saved / awaiting save
    useEffect(() => {
        const preventLeaving = (e: any) => {
            if (!hasPendingSaveOperations()) {
                return;
            }
            e.preventDefault();
            e.returnValue = "";
            startCooldownTimeout(true); // Force a save right now because user wanted to leave.
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
            canvasContext.local_unsavedObjects.length !== 0 ||
            objectsBeingDeletedOnDatabase.current.size !== 0 ||
            objectsToDeleteOnDatabase.current.size !== 0 ||
            canvasContext.local_deletedObjectIds.size !== 0 ||
            wasCameraUpdatedSinceLastSave()
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
            <div className="h-full w-full" data-tour-id="canvas">
                <CanvasInteractive
                    key={canvasContext.local_currentBoardId}
                    onObjectsCommit={onObjectsCommit}
                    onCameraCommit={onCameraCommit}
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
                    className={`absolute top-4 left-4 z-3 ${!menuOpen ? "pointer-events-none" : ""}`}
                    onMouseLeave={() => {
                        if (!keepMenuOpen) {
                            setMenuOpen(false);
                        }
                    }}
                >
                    {/* Menu burger icon — opens menu */}
                    <button
                        onMouseEnter={() => {
                            setMenuOpen(true);
                            if (setTourMenuOpen) setTourMenuOpen(true);
                        }}
                        className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full shadow-md transition-colors"
                        style={{
                            backgroundColor: "var(--card)",
                            color: "var(--card-foreground)",
                        }}
                        data-tour-id="menu-button"
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
                        <div data-tour-id="menu-login-boards">
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
                                disabled={
                                    sessionContext.userData.role === "guest"
                                }
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
                        </div>

                        <div data-tour-id="menu-item-manage-board">
                            <MenuItem
                                icon={<Settings2 size={18} />}
                                label="Manage This Board"
                                onClick={() => {
                                    setShowManageThisBoardModal(true);
                                }}
                            />
                        </div>

                        <div data-tour-id="menu-item-share">
                            <MenuItem
                                icon={<Share2 size={18} />}
                                label="Share Board"
                                disabled={true}
                                disabledTooltip="This feature is not available yet."
                            />
                        </div>

                        <MenuItem
                            icon={<SlidersHorizontal size={18} />}
                            label="Advanced Options"
                            onClick={() => setShowAdvancedOptionsModal(true)}
                        />
                    </div>
                </div>
            </motion.div>

            <motion.div {...fadeInAnimation}>
                {/* Debug */}
                {showDebugInfoContext.value && (
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
                            {canvasContext.local_unsavedObjects.length} unsaved
                            + {canvasContext.local_deletedObjectIds.size}{" "}
                            awaiting deletion)
                        </p>
                        <p>
                            Camera:{" "}
                            {canvasContext.local_camera.position.x !==
                                canvasContext.getCurrentBoard()
                                    .lastCameraPosition.x ||
                            canvasContext.local_camera.position.y !==
                                canvasContext.getCurrentBoard()
                                    .lastCameraPosition.y ||
                            canvasContext.local_camera.zoom !==
                                canvasContext.getCurrentBoard().lastCameraZoom
                                ? "Unsaved."
                                : "Saved."}
                        </p>
                    </div>
                )}
            </motion.div>

            <motion.div {...fadeInAnimation}>
                <div className="absolute right-6 bottom-6 flex items-center justify-center">
                    <button
                        onClick={handleResetCameraZoom}
                        className="border-border text-card-foreground bg-card rounded-full border px-3 py-1.5 text-xs font-bold shadow-lg backdrop-blur-md transition-all select-none hover:brightness-110 active:scale-95"
                        title="Reset Zoom"
                        data-tour-id="zoom-reset-button"
                    >
                        {Math.round(
                            canvasContext.local_camera.zoom * 100
                        ).toLocaleString("en-US")}
                        {/* display commas instead of periods */}%
                    </button>
                </div>
            </motion.div>

            <motion.div {...fadeInAnimation}>
                {/* Toolbox */}
                <Toolbox
                    className="absolute top-4 right-4 rounded-lg"
                    data-tour-id="toolbox"
                />
            </motion.div>
            {/* Manage Board Modal */}
            {showManageThisBoardModal && (
                <ManageThisBoardModal
                    onRename={handleRenameBoard}
                    onReset={handleResetBoard}
                    onDelete={handleDeleteBoard}
                    onClose={() => {
                        setShowManageThisBoardModal(false);
                    }}
                />
            )}

            {/* Advanced Options Modal */}
            {showAdvancedOptionsModal && (
                <AdvancedOptionsModal
                    onClose={() => setShowAdvancedOptionsModal(false)}
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
