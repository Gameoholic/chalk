import React, { useContext, useRef, useState, useEffect } from "react";
import { Trash2 } from "lucide-react";
import { Camera, TextObject, WorldObject } from "../../../types/canvas";
import { getBoundingBox } from "../utils/canvasHitTesting";
import ColorPicker from "../../../components/ColorPicker";
import { measureTextBox } from "../utils/canvasTextBoxMeasurement";
import { CanvasContext } from "../../../types/context/CanvasContext";
import { InlineNumberInput } from "../../../components/InlineNumberInput";

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
    const { setLocalCachedTextProps } = useContext(CanvasContext);

    function updateTextCache(patch: Partial<Pick<TextObject, "color" | "fontSize" | "fontFamily" | "lineHeight" | "bold" | "italic">>) {
        if (selectedObjects.some((obj) => obj.type === "text")) {
            setLocalCachedTextProps((prev) => ({ ...prev, ...patch }));
        }
    }

    const [showColorPicker, setShowColorPicker] = useState(false);
    const pickerRef = useRef<HTMLDivElement>(null);
    const [showFontPicker, setShowFontPicker] = useState(false);
    const fontPickerRef = useRef<HTMLDivElement>(null);
    // use to avoid slider properties (like text size) "pop" and move during editing
    const [pinnedPosition, setPinnedPosition] = useState<{
        centerX: number;
        topY: number;
    } | null>(null);

    useEffect(() => {
        const onUp = () => {
            // Fix: when mouse up fires the toolbar position changes to the middle of the object, so if we changed the text size for example, it'll affect the slider
            // therefore it'll change the text size, which we don't want
            // this is a fix for pinnedPosition
            setTimeout(() => setPinnedPosition(null), 0);
        };
        window.addEventListener("mouseup", onUp);
        return () => window.removeEventListener("mouseup", onUp);
    }, []);

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

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                fontPickerRef.current &&
                !fontPickerRef.current.contains(e.target as Node)
            ) {
                setShowFontPicker(false);
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
    const liveCenterX = (screenMinX + screenMaxX) / 2;
    const liveTopY = screenMinY;

    const renderCenterX = pinnedPosition?.centerX ?? liveCenterX;
    const renderTopY = pinnedPosition?.topY ?? liveTopY;

    function applyToAll(patch: Partial<Record<string, any>>) {
        const updated = selectedObjects.map((obj) => {
            const next = { ...obj, ...patch };

            // If editing text, update the text box size to match the changes
            if (next.type === "text") {
                const textNext = next as TextObject;
                return {
                    ...textNext,
                    boxSize: measureTextBox(textNext.text, textNext),
                };
            }
            return next;
        });
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

    const FONTS = [
        { family: "Patrick Hand", label: "Patrick" },
        { family: "Inter", label: "Inter" },
        { family: "Cairo", label: "Cairo" },
        { family: "Roboto", label: "Roboto" },
        { family: "Open Sans", label: "Open Sans" },
        { family: "Google Sans Flex", label: "Google Sans Flex" },
    ] as const;

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
            data-edit-object-toolbar
            onMouseDown={() =>
                setPinnedPosition({ centerX: liveCenterX, topY: liveTopY })
            }
            style={{
                position: "absolute",
                left: renderCenterX,
                top: renderTopY - 56,
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
                                    updateTextCache({ color });
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
                    {strokeValue === "mixed" ? (
                        <span style={{ ...mixedLabelStyle, minWidth: 24 }}>—</span>
                    ) : (
                        <InlineNumberInput
                            value={strokeValue}
                            min={1}
                            max={20}
                            onChange={(stroke) => applyToAll({ stroke })}
                        />
                    )}
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
                    {hollowStrokeValue === "mixed" ? (
                        <span style={{ ...mixedLabelStyle, minWidth: 24 }}>—</span>
                    ) : (
                        <InlineNumberInput
                            value={hollowStrokeValue}
                            min={1}
                            max={20}
                            onChange={(hollowStroke) => applyToAll({ hollowStroke })}
                        />
                    )}
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
                        onChange={(e) => {
                            const fontSize = Number(e.target.value);
                            applyToAll({ fontSize });
                            updateTextCache({ fontSize });
                        }}
                        style={{
                            width: 64,
                            accentColor: "var(--accent)",
                            cursor: "pointer",
                        }}
                    />
                    {fontSizeValue === "mixed" ? (
                        <span style={{ ...mixedLabelStyle, minWidth: 24 }}>—</span>
                    ) : (
                        <InlineNumberInput
                            value={fontSizeValue}
                            min={8}
                            max={200}
                            onChange={(fontSize) => {
                                applyToAll({ fontSize });
                                updateTextCache({ fontSize });
                            }}
                        />
                    )}
                </div>
            )}

            {/* Font family */}
            {sharedProps.has("fontFamily") && (
                <div className="relative" ref={fontPickerRef}>
                    <button
                        title="Font"
                        onClick={() => setShowFontPicker((v) => !v)}
                        style={{
                            height: 28,
                            padding: "0 8px",
                            borderRadius: 6,
                            fontSize: 12,
                            fontFamily:
                                fontFamilyValue === "mixed"
                                    ? undefined
                                    : fontFamilyValue,
                            cursor: "pointer",
                            backgroundColor: showFontPicker
                                ? "var(--accent)"
                                : "transparent",
                            color: "var(--card-foreground)",
                            border: "1.5px solid var(--card-foreground)",
                            whiteSpace: "nowrap",
                        }}
                    >
                        {fontFamilyValue === "mixed"
                            ? "—"
                            : (FONTS.find((f) => f.family === fontFamilyValue)
                                  ?.label ?? fontFamilyValue)}{" "}
                        ▾
                    </button>
                    {showFontPicker && (
                        <div
                            style={{
                                position: "absolute",
                                top: "calc(100% + 8px)",
                                left: "50%",
                                transform: "translateX(-50%)",
                                backgroundColor: "var(--card)",
                                borderRadius: 10,
                                padding: "4px 0",
                                boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                                zIndex: 100,
                                minWidth: 130,
                            }}
                        >
                            {FONTS.map((f) => (
                                <button
                                    key={f.family}
                                    onClick={() => {
                                        applyToAll({ fontFamily: f.family });
                                        updateTextCache({ fontFamily: f.family });
                                        setShowFontPicker(false);
                                    }}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                        width: "100%",
                                        padding: "5px 12px",
                                        cursor: "pointer",
                                        backgroundColor:
                                            fontFamilyValue === f.family
                                                ? "var(--accent)"
                                                : "transparent",
                                        color: "var(--card-foreground)",
                                        border: "none",
                                        textAlign: "left",
                                    }}
                                >
                                    <span
                                        style={{
                                            fontFamily: f.family,
                                            fontSize: 15,
                                            width: 24,
                                            flexShrink: 0,
                                        }}
                                    >
                                        Aa
                                    </span>
                                    <span style={{ fontSize: 11 }}>
                                        {f.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Bold */}
            {sharedProps.has("bold") && (
                <button
                    title="Bold"
                    onClick={() => {
                        const bold = boldValue === "mixed" ? true : !boldValue;
                        applyToAll({ bold });
                        updateTextCache({ bold });
                    }}
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
                    onClick={() => {
                        const italic =
                            italicValue === "mixed" ? true : !italicValue;
                        applyToAll({ italic });
                        updateTextCache({ italic });
                    }}
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
