import WorldViewport from "./WorldViewport";
import Toolbox from "./Toolbox";
import { useEffect, useRef, useState } from "react";
import { Camera, Tool, Vec2 } from "./CanvasTypes";
import {
    Menu,
    User,
    LayoutDashboard,
    Share2,
    Info,
    Settings2,
} from "lucide-react";

function CanvasEditor() {
    const [tool, setTool] = useState<Tool>("none");
    const [color, setColor] = useState("#000000FF");
    const [stroke, setStroke] = useState(1);

    const [cameraPosition, setCameraPosition] = useState<Vec2>({ x: 0, y: 0 });
    const [cameraZoom, setCameraZoom] = useState<number>(1);
    const [objectAmount, setObjectAmount] = useState<number>(0);

    const [showDebug, setShowDebug] = useState(true);
    const [menuOpen, setMenuOpen] = useState(false);

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

    return (
        <div className="relative h-screen w-screen">
            {/* Top-left menu container (fade-out area stays the same) */}
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
            <WorldViewport
                className="h-full w-full"
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
            />
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

export default CanvasEditor;
