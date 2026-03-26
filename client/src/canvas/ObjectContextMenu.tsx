import { JSX, useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import ColorPicker from "../components/ColorPicker";
import {
    WorldObject,
    PathObject,
    EraserPathObject,
    LineObject,
    RectObject,
    EllipseObject,
} from "../types/canvas";

function hasColor(
    obj: WorldObject
): obj is PathObject | LineObject | RectObject | EllipseObject {
    return (
        obj.type === "path" ||
        obj.type === "line" ||
        obj.type === "rect" ||
        obj.type === "ellipse"
    );
}

function hasStroke(
    obj: WorldObject
): obj is PathObject | EraserPathObject | LineObject {
    return (
        obj.type === "path" || obj.type === "eraser-path" || obj.type === "line"
    );
}

function hasHollow(obj: WorldObject): obj is RectObject | EllipseObject {
    return obj.type === "rect" || obj.type === "ellipse";
}

interface ObjectContextMenuProps {
    object: WorldObject;
    screenX: number;
    screenY: number;
    onUpdate: (updated: WorldObject) => void;
    onDelete: () => void;
    onClose: () => void;
}

export default function ObjectContextMenu({
    object,
    screenX,
    screenY,
    onUpdate,
    onDelete,
    onClose,
}: ObjectContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);
    const colorPickerRef = useRef<HTMLDivElement>(null);

    // Always build updates from the latest object state, not the stale prop.
    // Without this, changing stroke after color would spread the original `object`
    // prop (which still has the old color) and silently revert the color change.
    const currentObjectRef = useRef<WorldObject>(object);
    useEffect(() => {
        currentObjectRef.current = object;
    }, [object]);

    const [pos, setPos] = useState({ x: screenX, y: screenY });

    useEffect(() => {
        if (!menuRef.current) return;
        const { offsetWidth: w, offsetHeight: h } = menuRef.current;
        setPos({
            x: Math.min(screenX, window.innerWidth - w - 8),
            y: Math.min(screenY, window.innerHeight - h - 8),
        });
    }, [screenX, screenY]);

    useEffect(() => {
        const handlePointerDown = (e: PointerEvent) => {
            if (
                menuRef.current &&
                !menuRef.current.contains(e.target as Node)
            ) {
                onClose();
            }
        };
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("pointerdown", handlePointerDown);
        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("pointerdown", handlePointerDown);
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [onClose]);

    // ─── Local state ─────────────────────────────────────

    const [color, setColor] = useState(
        hasColor(object) ? (object as any).color : "#000000"
    );
    const [stroke, setStroke] = useState(
        hasStroke(object) ? (object as any).stroke : 1
    );
    const [hollow, setHollow] = useState(
        hasHollow(object) ? (object as any).hollow : false
    );
    const [hollowStroke, setHollowStroke] = useState(
        hasHollow(object) ? ((object as any).hollowStroke ?? 1) : 1
    );

    const [showColorPicker, setShowColorPicker] = useState(false);

    // Close color picker on outside click (separate from menu close)
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                colorPickerRef.current &&
                !colorPickerRef.current.contains(event.target as Node)
            ) {
                setShowColorPicker(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // ─── Handlers ─────────────────────────────────────

    const handleColorChange = (newColor: string) => {
        setColor(newColor);
        const updated = {
            ...currentObjectRef.current,
            color: newColor,
        } as WorldObject;
        currentObjectRef.current = updated;
        onUpdate(updated);
    };

    const handleStrokeChange = (newStroke: number) => {
        setStroke(newStroke);
        const updated = {
            ...currentObjectRef.current,
            stroke: newStroke,
        } as WorldObject;
        currentObjectRef.current = updated;
        onUpdate(updated);
    };

    const handleHollowChange = (newHollow: boolean) => {
        setHollow(newHollow);
        const updated = {
            ...currentObjectRef.current,
            hollow: newHollow,
        } as WorldObject;
        currentObjectRef.current = updated;
        onUpdate(updated);
    };

    const handleHollowStrokeChange = (newStroke: number) => {
        setHollowStroke(newStroke);
        const updated = {
            ...currentObjectRef.current,
            hollowStroke: newStroke,
        } as WorldObject;
        currentObjectRef.current = updated;
        onUpdate(updated);
    };

    const objectLabel: Record<WorldObject["type"], string> = {
        path: "Path",
        "eraser-path": "Eraser Path",
        line: "Line",
        rect: "Rectangle",
        ellipse: "Ellipse",
        text: "Text",
    };

    // Checkerboard (same idea as Toolbox)
    const renderCheckerboard = () => {
        const squares: JSX.Element[] = [];

        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                const isLight = (row + col) % 2 === 0;
                squares.push(
                    <div
                        key={`${row}-${col}`}
                        className={isLight ? "bg-gray-200" : "bg-gray-400"}
                    />
                );
            }
        }

        return (
            <div className="absolute inset-0 grid grid-cols-4 grid-rows-4">
                {squares}
            </div>
        );
    };

    return (
        <div
            ref={menuRef}
            className="fixed z-300 min-w-50 rounded-2xl border border-white/10 p-3 shadow-2xl"
            style={{
                top: pos.y,
                left: pos.x,
                backgroundColor: "var(--card)",
                color: "var(--card-foreground)",
            }}
            onContextMenu={(e) => e.preventDefault()}
        >
            <p
                className="mb-3 text-xs font-semibold tracking-wider uppercase"
                style={{ color: "var(--muted-foreground)" }}
            >
                {objectLabel[object.type]}
            </p>

            <div className="flex flex-col gap-3">
                {/* ─── Color (NEW) ───────────────── */}
                {hasColor(object) && (
                    <Row label="Color">
                        <div className="relative flex items-center gap-2">
                            <button
                                onClick={() =>
                                    setShowColorPicker(!showColorPicker)
                                }
                                className="relative h-6 w-10 overflow-hidden rounded border border-white/20"
                            >
                                {renderCheckerboard()}
                                <div
                                    className="absolute inset-0"
                                    style={{ backgroundColor: color }}
                                />
                            </button>

                            {showColorPicker && (
                                <div
                                    ref={colorPickerRef}
                                    className="absolute right-full z-50 mr-3 rounded-xl border border-gray-700 p-3 shadow-xl"
                                    style={{
                                        backgroundColor: "var(--card)",
                                    }}
                                >
                                    <ColorPicker
                                        value={color}
                                        onChange={handleColorChange}
                                    />
                                </div>
                            )}
                        </div>
                    </Row>
                )}

                {/* Stroke */}
                {hasStroke(object) && (
                    <Row label="Width">
                        <div className="flex w-full flex-col gap-1">
                            <input
                                type="range"
                                min="1"
                                max="50"
                                value={stroke}
                                onChange={(e) =>
                                    handleStrokeChange(Number(e.target.value))
                                }
                                className="w-full cursor-pointer"
                                style={{ accentColor: "var(--accent)" }}
                            />
                            <span className="text-muted-foreground text-right text-xs">
                                {stroke}px
                            </span>
                        </div>
                    </Row>
                )}

                {/* Hollow */}
                {hasHollow(object) && (
                    <>
                        <Row label="Fill">
                            <div className="flex gap-1">
                                {(["Filled", "Hollow"] as const).map(
                                    (label) => {
                                        const isHollow = label === "Hollow";
                                        const active = hollow === isHollow;
                                        return (
                                            <button
                                                key={label}
                                                onClick={() =>
                                                    handleHollowChange(isHollow)
                                                }
                                                className="rounded-lg px-2 py-1 text-xs font-medium"
                                                style={{
                                                    backgroundColor: active
                                                        ? "var(--accent)"
                                                        : "transparent",
                                                    color: active
                                                        ? "var(--accent-foreground)"
                                                        : "var(--card-foreground)",
                                                }}
                                            >
                                                {label}
                                            </button>
                                        );
                                    }
                                )}
                            </div>
                        </Row>

                        {hollow && (
                            <Row label="Border">
                                <input
                                    type="range"
                                    min="1"
                                    max="20"
                                    value={hollowStroke}
                                    onChange={(e) =>
                                        handleHollowStrokeChange(
                                            Number(e.target.value)
                                        )
                                    }
                                    className="w-full cursor-pointer"
                                    style={{ accentColor: "var(--accent)" }}
                                />
                            </Row>
                        )}
                    </>
                )}

                <div className="border-t border-white/10" />

                <button
                    onClick={onDelete}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
                >
                    <Trash2 size={15} />
                    Delete
                </button>
            </div>
        </div>
    );
}

function Row({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground min-w-[44px] text-xs">
                {label}
            </span>
            <div className="flex flex-1 justify-end">{children}</div>
        </div>
    );
}
