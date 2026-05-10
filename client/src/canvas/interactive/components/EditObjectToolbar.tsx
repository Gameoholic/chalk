import React, { useRef, useState, useEffect } from "react";
import { Trash2 } from "lucide-react";
import { Camera, WorldObject } from "../../../types/canvas";
import { getBoundingBox } from "../utils/canvasHitTesting";
import ColorPicker from "../../../components/ColorPicker";

type EditableProperty =
    | "color"
    | "stroke"
    | "hollow"
    | "hollowStroke"
    | "fontSize"
    | "fontFamily"
    | "lineHeight"
    | "bold"
    | "italic";

const OBJECT_PROPERTIES: Record<string, EditableProperty[]> = {
    path: ["color", "stroke"],
    "eraser-path": ["stroke"],
    line: ["color", "stroke"],
    rect: ["color", "hollow", "hollowStroke"],
    ellipse: ["color", "hollow", "hollowStroke"],
    text: ["color", "fontSize", "fontFamily", "lineHeight", "bold", "italic"],
};

function getSharedProperties(objects: WorldObject[]): Set<EditableProperty> {
    if (objects.length === 0) return new Set();
    const sets = objects.map(
        (obj) => new Set(OBJECT_PROPERTIES[obj.type] ?? [])
    );
    const [first, ...rest] = sets;
    return new Set([...first].filter((prop) => rest.every((s) => s.has(prop))));
}

function getSharedValue<T>(objects: WorldObject[], key: string): T | "mixed" {
    const values = objects.map((obj) => (obj as any)[key]);
    return values.every((v) => v === values[0]) ? (values[0] as T) : "mixed";
}

function getUnionBoundingBox(
    objects: WorldObject[]
): { min: { x: number; y: number }; max: { x: number; y: number } } | null {
    let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
    let any = false;
    for (const obj of objects) {
        const bb = getBoundingBox(obj);
        if (!bb) continue;
        any = true;
        minX = Math.min(minX, bb.min.x);
        minY = Math.min(minY, bb.min.y);
        maxX = Math.max(maxX, bb.max.x);
        maxY = Math.max(maxY, bb.max.y);
    }
    return any
        ? { min: { x: minX, y: minY }, max: { x: maxX, y: maxY } }
        : null;
}

interface EditObjectToolbarProps {
    selectedObjects: WorldObject[];
    camera: Camera;
    onUpdate: (updatedObjects: WorldObject[]) => void;
    onDelete: (deletedObjectIds: string[]) => void;
}

export function EditObjectToolbar({
    selectedObjects,
    camera,
    onUpdate,
    onDelete,
}: EditObjectToolbarProps) {
    const [showColorPicker, setShowColorPicker] = useState(false);
    const pickerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                pickerRef.current &&
                !pickerRef.current.contains(e.target as Node)
            ) {
                setShowColorPicker(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Delete selected objects keyboard shortcut
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Delete" && selectedObjects.length > 0) {
                onDelete(selectedObjects.map((obj) => obj.id));
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [selectedObjects]);

    if (selectedObjects.length === 0) return null;

    const sharedProps = getSharedProperties(selectedObjects);
    const bb = getUnionBoundingBox(selectedObjects);
    if (!bb) return null;

    const screenMinX = (bb.min.x - camera.position.x) * camera.zoom;
    const screenMinY = (bb.min.y - camera.position.y) * camera.zoom;
    const screenMaxX = (bb.max.x - camera.position.x) * camera.zoom;
    const centerX = (screenMinX + screenMaxX) / 2;
    const topY = screenMinY;

    function applyToAll(patch: Partial<Record<string, any>>) {
        const updated = selectedObjects.map((obj) => ({ ...obj, ...patch }));
        onUpdate(updated as WorldObject[]);
    }

    const colorValue = getSharedValue<string>(selectedObjects, "color");
    const strokeValue = getSharedValue<number>(selectedObjects, "stroke");
    const hollowValue = getSharedValue<boolean>(selectedObjects, "hollow");
    const hollowStrokeValue = getSharedValue<number>(
        selectedObjects,
        "hollowStroke"
    );
    const fontSizeValue = getSharedValue<number>(selectedObjects, "fontSize");
    const fontFamilyValue = getSharedValue<string>(
        selectedObjects,
        "fontFamily"
    );
    const boldValue = getSharedValue<boolean>(selectedObjects, "bold");
    const italicValue = getSharedValue<boolean>(selectedObjects, "italic");

    const FONT_FAMILIES = ["sans-serif", "serif", "monospace"] as const;

    const mixedLabelStyle: React.CSSProperties = {
        fontSize: 11,
        color: "var(--muted-foreground)",
        fontStyle: "italic",
    };

    const MixedColorPattern = () => (
        <svg
            width="28"
            height="28"
            style={{ borderRadius: 6, display: "block" }}
        >
            <defs>
                <pattern
                    id="checker"
                    width="7"
                    height="7"
                    patternUnits="userSpaceOnUse"
                >
                    <rect width="7" height="7" fill="#ccc" />
                    <rect width="3.5" height="3.5" fill="#888" />
                    <rect
                        x="3.5"
                        y="3.5"
                        width="3.5"
                        height="3.5"
                        fill="#888"
                    />
                </pattern>
            </defs>
            <rect width="28" height="28" fill="url(#checker)" rx="6" />
            <text
                x="14"
                y="19"
                textAnchor="middle"
                fontSize="14"
                fill="white"
                fontWeight="bold"
            >
                —
            </text>
        </svg>
    );

    const divider = (
        <div
            style={{
                width: 1,
                height: 20,
                backgroundColor: "var(--border)",
                flexShrink: 0,
            }}
        />
    );

    return (
        <div
            style={{
                position: "absolute",
                left: centerX,
                top: topY - 56,
                transform: "translateX(-50%)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                backgroundColor: "var(--card)",
                borderRadius: "12px",
                padding: "8px 12px",
                boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
                zIndex: 50,
                pointerEvents: "all",
            }}
        >
            {/* Color */}
            {sharedProps.has("color") && (
                <div className="relative" ref={pickerRef}>
                    <button
                        onClick={() => setShowColorPicker((v) => !v)}
                        title="Color"
                        style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            backgroundColor:
                                colorValue === "mixed"
                                    ? "transparent"
                                    : colorValue,
                            border: "2px solid var(--card-foreground)",
                            cursor: "pointer",
                            padding: 0,
                            overflow: "hidden",
                        }}
                    >
                        {colorValue === "mixed" && <MixedColorPattern />}
                    </button>
                    {showColorPicker && (
                        <div
                            style={{
                                position: "absolute",
                                top: "calc(100% + 8px)",
                                left: "50%",
                                transform: "translateX(-50%)",
                                backgroundColor: "var(--card)",
                                borderRadius: 12,
                                padding: 12,
                                boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                                zIndex: 100,
                            }}
                        >
                            <ColorPicker
                                value={
                                    colorValue === "mixed"
                                        ? "#000000"
                                        : colorValue
                                }
                                onChange={(color) => {
                                    applyToAll({ color });
                                    setShowColorPicker(false);
                                }}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Stroke */}
            {sharedProps.has("stroke") && (
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <input
                        type="range"
                        min="1"
                        max="20"
                        value={strokeValue === "mixed" ? 1 : strokeValue}
                        onChange={(e) =>
                            applyToAll({ stroke: Number(e.target.value) })
                        }
                        style={{
                            width: 64,
                            accentColor: "var(--accent)",
                            cursor: "pointer",
                        }}
                    />
                    <span
                        style={{
                            fontSize: 11,
                            color: "var(--card-foreground)",
                            minWidth: 24,
                        }}
                    >
                        {strokeValue === "mixed" ? (
                            <span style={mixedLabelStyle}>—</span>
                        ) : (
                            `${strokeValue}px`
                        )}
                    </span>
                </div>
            )}

            {/* Hollow toggle (rect/ellipse) */}
            {sharedProps.has("hollow") && (
                <button
                    title="Toggle hollow/filled"
                    onClick={() =>
                        applyToAll({
                            hollow:
                                hollowValue === "mixed" ? true : !hollowValue,
                        })
                    }
                    style={{
                        padding: "2px 8px",
                        borderRadius: 6,
                        fontSize: 11,
                        cursor: "pointer",
                        backgroundColor:
                            hollowValue === true
                                ? "var(--accent)"
                                : "transparent",
                        color: "var(--card-foreground)",
                        border: "1.5px solid var(--card-foreground)",
                    }}
                >
                    {hollowValue === "mixed"
                        ? "—"
                        : hollowValue
                          ? "Hollow"
                          : "Filled"}
                </button>
            )}

            {/* Hollow stroke */}
            {sharedProps.has("hollowStroke") && hollowValue !== false && (
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <input
                        type="range"
                        min="1"
                        max="20"
                        value={
                            hollowStrokeValue === "mixed"
                                ? 1
                                : hollowStrokeValue
                        }
                        onChange={(e) =>
                            applyToAll({ hollowStroke: Number(e.target.value) })
                        }
                        style={{
                            width: 64,
                            accentColor: "var(--accent)",
                            cursor: "pointer",
                        }}
                    />
                    <span
                        style={{
                            fontSize: 11,
                            color: "var(--card-foreground)",
                            minWidth: 24,
                        }}
                    >
                        {hollowStrokeValue === "mixed" ? (
                            <span style={mixedLabelStyle}>—</span>
                        ) : (
                            `${hollowStrokeValue}px`
                        )}
                    </span>
                </div>
            )}

            {/* Font size */}
            {sharedProps.has("fontSize") && (
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <input
                        type="range"
                        min="8"
                        max="200"
                        value={fontSizeValue === "mixed" ? 16 : fontSizeValue}
                        onChange={(e) =>
                            applyToAll({ fontSize: Number(e.target.value) })
                        }
                        style={{
                            width: 64,
                            accentColor: "var(--accent)",
                            cursor: "pointer",
                        }}
                    />
                    <span
                        style={{
                            fontSize: 11,
                            color: "var(--card-foreground)",
                            minWidth: 24,
                        }}
                    >
                        {fontSizeValue === "mixed" ? (
                            <span style={mixedLabelStyle}>—</span>
                        ) : (
                            `${fontSizeValue}px`
                        )}
                    </span>
                </div>
            )}

            {/* Font family */}
            {sharedProps.has("fontFamily") && (
                <div style={{ display: "flex", gap: 4 }}>
                    {FONT_FAMILIES.map((f) => (
                        <button
                            key={f}
                            title={f}
                            onClick={() => applyToAll({ fontFamily: f })}
                            style={{
                                padding: "2px 6px",
                                borderRadius: 6,
                                fontSize: 11,
                                fontFamily: f,
                                cursor: "pointer",
                                backgroundColor:
                                    fontFamilyValue !== "mixed" &&
                                    fontFamilyValue === f
                                        ? "var(--accent)"
                                        : "transparent",
                                color: "var(--card-foreground)",
                                border: "1.5px solid var(--card-foreground)",
                            }}
                        >
                            Aa
                        </button>
                    ))}
                </div>
            )}

            {/* Bold */}
            {sharedProps.has("bold") && (
                <button
                    title="Bold"
                    onClick={() =>
                        applyToAll({
                            bold: boldValue === "mixed" ? true : !boldValue,
                        })
                    }
                    style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        fontSize: 13,
                        fontWeight: "bold",
                        cursor: "pointer",
                        backgroundColor:
                            boldValue === true
                                ? "var(--accent)"
                                : "transparent",
                        color: "var(--card-foreground)",
                        border: "1.5px solid var(--card-foreground)",
                    }}
                >
                    {boldValue === "mixed" ? "—" : "B"}
                </button>
            )}

            {/* Italic */}
            {sharedProps.has("italic") && (
                <button
                    title="Italic"
                    onClick={() =>
                        applyToAll({
                            italic:
                                italicValue === "mixed" ? true : !italicValue,
                        })
                    }
                    style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        fontSize: 13,
                        fontStyle: "italic",
                        cursor: "pointer",
                        backgroundColor:
                            italicValue === true
                                ? "var(--accent)"
                                : "transparent",
                        color: "var(--card-foreground)",
                        border: "1.5px solid var(--card-foreground)",
                    }}
                >
                    {italicValue === "mixed" ? "—" : "I"}
                </button>
            )}

            {/* Divider + Delete */}
            {divider}
            <button
                title="Delete"
                onClick={() => onDelete(selectedObjects.map((obj) => obj.id))}
                style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    backgroundColor: "transparent",
                    color: "#f87171",
                    border: "none",
                }}
                onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor =
                        "rgba(248,113,113,0.1)")
                }
                onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "transparent")
                }
            >
                <Trash2 size={15} />
            </button>
        </div>
    );
}
