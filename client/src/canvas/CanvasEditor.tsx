import WorldViewport from "./WorldViewport";
import Toolbox from "./Toolbox";
import { RefObject, useEffect, useRef, useState } from "react";
import {
    BoardData,
    Camera,
    CanvasStatus,
    Tool,
    Vec2,
    WorldObject,
} from "../types/canvas";
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

function CanvasEditor({ currentBoard }: { currentBoard: BoardData | null }) {
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

    const [canvasStatus, setCanvasStatus] = useState<CanvasStatus>("ok");
    // Database objects on standby to be saved to db (either entirely new objects or objects that were updated)
    const objectsToCommitOnDatabase: RefObject<Map<string, WorldObject>> =
        useRef(new Map());

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
    function onObjectUpdated(object: WorldObject) {
        objectsToCommitOnDatabase.current.set(object.id, object);
        setCanvasStatus("standby");
    }
    // When objects are ready to be saved to database (user released left click, for example). Generally, only one object should be committed at a time.
    function onObjectsReadyToBeCommitted() {
        if (objectsToCommitOnDatabase.current.size == 0) {
            return; // Sanity check. For now this also serves to be necessary as this method is called even if user taps pencil tool without actually creating a shape and calling onObjectUpdated hence this method is called for no reason. Will be changed in the future, todo
        }
        const objectsBeingCommitted = new Map(
            objectsToCommitOnDatabase.current
        );
        objectsToCommitOnDatabase.current.clear();
        setCanvasStatus("saving-board");
        // Typically only one object should be ready to be committed at a time, so we do it in a loop just in case

        commitObjects();
        async function commitObjects() {
            const controller = new AbortController();
            setTimeout(() => controller.abort(), 5000);

            console.log(
                "Committing " +
                    objectsBeingCommitted.size +
                    " objects to board."
            );
            const res = await fetch(
                `http://localhost:5050/me/boards/${currentBoard?.id}/objects`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    credentials: "include",
                    body: JSON.stringify({
                        objects: Array.from(objectsBeingCommitted.values()),
                    }),
                    signal: controller.signal,
                }
            );
            const data = await res.json();
            if (!res.ok) {
                console.error("Failure to commit the object! " + data.error);
            }
            console.log(
                "Committed " +
                    objectsBeingCommitted.size +
                    " objects successfully."
            );
        }
    }

    // Rename handler for modal
    const handleRenameBoard = async (newName: string) => {
        if (!currentBoard) return;
        // TODO: call API to rename board
        currentBoard.name = newName; // temporary local update
    };

    return (
        <div className="relative h-screen w-screen">
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
                    <div className="flex items-center gap-1">
                        <span>Status:</span>
                        <StatusIndicator
                            status={canvasStatus}
                            objectsToUpdateOnDatabaseCount={
                                objectsToCommitOnDatabase.current.size
                            }
                        />
                    </div>
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
            <WorldViewport
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
                onObjectUpdated={onObjectUpdated}
                onObjectsReadyToBeCommitted={onObjectsReadyToBeCommitted}
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
    status: CanvasStatus;
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
