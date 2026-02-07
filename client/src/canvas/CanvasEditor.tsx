import CanvasViewport from "./CanvasViewport";
import Toolbox from "./Toolbox";
import { RefObject, useEffect, useRef, useState } from "react";
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
import { updateBoardName, updateBoardObjects } from "../api/boards";
import { BoardData } from "../types/data";
import ManageThisBoardModal from "./modals/ManageThisBoardModal";
import CreateAccountModal from "./modals/old/CreateAccountModal";
import ForgotPasswordModal from "./modals/old/ForgotPasswordModal";
import LoginModal from "./modals/LogInModal";

interface CanvasEditorProps {
    currentBoard: BoardData;
    theme: "light" | "dark";
    setTheme: React.Dispatch<React.SetStateAction<"light" | "dark">>;
}

function CanvasEditor({ currentBoard, theme, setTheme }: CanvasEditorProps) {
    // Settings & state data
    const [tool, setTool] = useState<Tool>("none");
    const [color, setColor] = useState("#000000FF");
    const [stroke, setStroke] = useState(1);

    const [cameraPosition, setCameraPosition] = useState<Vec2>({ x: 0, y: 0 });
    const [cameraZoom, setCameraZoom] = useState<number>(1);
    const [objectAmount, setObjectAmount] = useState<number>(0);

    // Menu
    const [showDebug, setShowDebug] = useState(true);
    const [menuOpen, setMenuOpen] = useState(false);
    const [showManageThisBoardModal, setShowManageThisBoardModal] =
        useState(false);
    const [authView, setAuthView] = useState<
        "login" | "forgot-password" | "create-account" | null
    >(null);

    // Saving objects
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

    // FPS
    const [fps, setFps] = useState(0);
    const frames = useRef(0);
    const lastTime = useRef(performance.now());

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

    // When either a new object was added, or an existing object has updated
    function onObjectUpdatedOrAdded(object: WorldObject) {
        objectsToSaveOnDatabase.current.set(object.id, object);
    }

    // When objects are ready to be saved to database (user released left click, for example). Generally, only one object should be saved at a time.
    async function requestSaveObjectsOnDatabase(asErrorRetry: boolean = false) {
        // Sanity check. Do not remove this because if it's equal to 0 and we call this method multiple times, we could have multiple fetch requests running concurrently, which could cause problems if one of them fails and causes us to reload the board.
        if (objectsToSaveOnDatabase.current.size === 0) {
            return;
        }
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
                currentBoard.id,
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
                const accumulatedDelay = prev.error ? prev.retryDelay : 0; // Add delay from previous attempts
                return {
                    error: "Failed to save changes. Your work is out of sync.",
                    retryStatus: "start-retry-timer",
                    retryDelay:
                        Number(
                            // @ts-expect-error Fix: IntelliJ complains about import.meta.env
                            import.meta.env.VITE_SAVE_RETRY_DELAY
                        ) + accumulatedDelay,
                };
            });
            return;
        }

        console.log("Successfully saved the objects.");
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

    const handleRenameBoard = async (newName: string) => {
        try {
            await updateBoardName(currentBoard.id, newName);
            currentBoard.name = newName;
        } catch {
            throw new Error("Rename failed");
        }
    };

    return (
        <div className="relative h-screen w-screen">
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

            {/* Top-left menu container */}
            <div
                className="absolute top-4 left-4 z-50"
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
                    <MenuItem
                        icon={<User size={18} />}
                        label="Login"
                        onClick={() => setAuthView("login")}
                    />

                    <MenuItem
                        icon={<LayoutDashboard size={18} />}
                        label="My Boards"
                        disabled={true}
                        disabledTooltip="You must be logged in to access additional boards."
                    />

                    <MenuItem
                        icon={<Settings2 size={18} />}
                        label="Manage This Board"
                        onClick={() => setShowManageThisBoardModal(true)}
                    />

                    <MenuItem icon={<Share2 size={18} />} label="Share" />

                    <MenuItem
                        icon={
                            theme === "light" ? (
                                <Moon size={18} />
                            ) : (
                                <Sun size={18} />
                            )
                        }
                        label={`Switch to ${theme === "light" ? "Dark" : "Light"} Mode`}
                        onClick={() =>
                            setTheme(theme === "light" ? "dark" : "light")
                        }
                    />
                    <MenuItem
                        icon={<Info size={18} />}
                        label={
                            showDebug ? "Hide Debug Info" : "Show Debug Info"
                        }
                        onClick={() => setShowDebug((v) => !v)}
                    />
                </div>
            </div>

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

            {/* Toolbox */}
            <Toolbox
                className="absolute top-4 right-4 rounded-lg"
                onToolChange={setTool}
                onColorChange={setColor}
                onWidthChange={setStroke}
            />

            {/* Canvas */}
            <CanvasViewport
                className="h-full w-full"
                key={currentBoard?.id}
                initialObjects={
                    currentBoard
                        ? new Map(
                              currentBoard.objects.map((obj) => [obj.id, obj])
                          )
                        : new Map<string, WorldObject>()
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
                onObjectsReadyToBeCommitted={requestSaveObjectsOnDatabase}
            />

            {/* Manage Board Modal */}
            {showManageThisBoardModal && (
                <ManageThisBoardModal
                    name={currentBoard.name}
                    createdOn={currentBoard.createdOn}
                    onRename={handleRenameBoard}
                    onClose={() => setShowManageThisBoardModal(false)}
                />
            )}

            {/* Login Modal */}
            {authView === "login" && (
                <LoginModal
                    onCreateAccount={() => setAuthView("create-account")}
                    onForgotPassword={() => setAuthView("forgot-password")}
                    onClose={() => setAuthView(null)}
                    onLogin={async () => {}}
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
