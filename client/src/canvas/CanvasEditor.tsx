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
} from "lucide-react";
import ManageBoardModal from "./components/ManageBoardModal";
import { updateBoardObjects } from "../api/boards";
import { BoardData } from "../types/data";

function CanvasEditor({ currentBoard }: { currentBoard: BoardData }) {
    // Settings & state data
    const [tool, setTool] = useState<Tool>("none");
    const [color, setColor] = useState("#000000FF");
    const [stroke, setStroke] = useState(1);

    const [cameraPosition, setCameraPosition] = useState<Vec2>({ x: 0, y: 0 });
    const [cameraZoom, setCameraZoom] = useState<number>(1);
    const [objectAmount, setObjectAmount] = useState<number>(0);

    const [showDebug, setShowDebug] = useState(true);
    const [menuOpen, setMenuOpen] = useState(false);
    const [showManageModal, setShowManageModal] = useState(false);

    // Saving objects
    // Database objects on standby to be saved to db (either entirely new objects or objects that were updated)
    const objectsToSaveOnDatabase: RefObject<Map<string, WorldObject>> = useRef(
        new Map()
    );
    // Objects that are CURRENTLY being saved (mid-fetch request)
    const objectsBeingSavedOnDatabase: RefObject<WorldObject[]> = useRef([]);
    // If 0, currently retrying.
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

    // Rename handler for modal
    const handleRenameBoard = async (newName: string) => {
        if (!currentBoard) return;
        // TODO: call API to rename board
        currentBoard.name = newName; // temporary local update
    };

    return (
        <div className="relative h-screen w-screen">
            {/* SAVE ERROR BANNER */}
            {saveObjectsError.error && (
                <div className="animate-in fade-in slide-in-from-top-2 pointer-events-none fixed top-6 left-1/2 z-100 -translate-x-1/2">
                    <div className="flex flex-col gap-1 rounded-xl bg-red-600 px-5 py-3 text-sm font-medium text-white shadow-xl">
                        <div className="flex items-center gap-3">
                            {saveObjectsError.retryStatus === "retrying" ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <XCircle className="h-4 w-4" />
                            )}
                            <span>{saveObjectsError.error}</span>
                        </div>

                        {/* Placeholder */}
                        {saveObjectsError.retryStatus ===
                            "start-retry-timer" && (
                            <span className="ml-7 text-xs opacity-80">
                                Retrying in {}s
                            </span>
                        )}

                        {typeof saveObjectsError.retryStatus === "number" && (
                            <span className="ml-7 text-xs opacity-80">
                                Retrying in {saveObjectsError.retryStatus}s
                            </span>
                        )}

                        {saveObjectsError.retryStatus === "retrying" && (
                            <span className="ml-7 text-xs opacity-80">
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
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-900 text-white shadow-md transition-colors hover:bg-neutral-800"
                >
                    <Menu size={22} />
                </button>

                {/* Dropdown */}
                <div
                    className={`mt-2 w-56 origin-top-left rounded-xl bg-neutral-900 p-2 shadow-xl transition-all duration-300 ease-out ${
                        menuOpen
                            ? "translate-y-0 scale-100 opacity-100"
                            : "pointer-events-none -translate-y-2 scale-95 opacity-0"
                    } `}
                >
                    <MenuItem icon={<User size={18} />} label="Login" />
                    <MenuItem
                        icon={<LayoutDashboard size={18} />}
                        label="My Boards"
                    />

                    <MenuItem
                        icon={<Settings2 size={18} />}
                        label="Manage This Board"
                        onClick={() => setShowManageModal(true)}
                    />

                    <MenuItem icon={<Share2 size={18} />} label="Share" />
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
                <div className="absolute bottom-4 left-4 w-110 rounded-lg bg-neutral-900 p-3 font-mono text-sm text-white shadow-md">
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
            {showManageModal && currentBoard && (
                <ManageBoardModal
                    board={currentBoard}
                    onClose={() => setShowManageModal(false)}
                    onRename={handleRenameBoard}
                />
            )}
        </div>
    );
}

function MenuItem({
    icon,
    label,
    onClick,
}: {
    icon: React.ReactNode;
    label: string;
    onClick?: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-white transition hover:bg-neutral-800"
        >
            {icon}
            <span>{label}</span>
        </button>
    );
}

function StatusIndicator({
    status,
    objectsToUpdateOnDatabaseCount,
}: {
    status: string;
    objectsToUpdateOnDatabaseCount: number;
}) {
    return (
        <div className="group relative inline-flex items-center">
            {status === "loading-board" && (
                <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
            )}
            {status === "saving-board" && (
                <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
            )}
            {status === "ok" && (
                <CheckCircle className="h-5 w-5 text-green-400" />
            )}
            {status === "standby" && (
                <TriangleAlert className="h-5 w-5 text-yellow-300" />
            )}
            {status === "error" && <XCircle className="h-5 w-5 text-red-400" />}

            {status !== "ok" && (
                <div className="bottom-full mb-2 w-max rounded-md bg-black/80 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                    {status === "loading-board" && "Loading board..."}
                    {status === "saving-board" && "Saving X objects..."}
                    {status === "error" && "ERROR HERE"}
                    {status === "standby" &&
                        `On standby to save ${objectsToUpdateOnDatabaseCount} objects...`}
                </div>
            )}
        </div>
    );
}

export default CanvasEditor;
