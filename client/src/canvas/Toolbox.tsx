import React, {
    JSX,
    useState,
    useRef,
    useEffect,
    useContext,
    useMemo,
} from "react";
import { MousePointer, Square, Circle, Slash, Pen, Eraser } from "lucide-react";
import ColorPicker from "../components/ColorPicker";
import { CanvasContext } from "../types/context/CanvasContext";
import {
    EllipseTool,
    SelectTool,
    EraserTool,
    LineTool,
    PencilTool,
    RectTool,
    Tool,
    ToolType,
} from "../types/tool";

type ToolsData = {
    select: { tool: SelectTool; displayName: string; icon: JSX.Element };
    pencil: { tool: PencilTool; displayName: string; icon: JSX.Element };
    eraser: { tool: EraserTool; displayName: string; icon: JSX.Element };
    ellipse: { tool: EllipseTool; displayName: string; icon: JSX.Element };
    line: { tool: LineTool; displayName: string; icon: JSX.Element };
    rect: { tool: RectTool; displayName: string; icon: JSX.Element };
};

const Toolbox = ({
    className,
    ...props
}: {
    className: string;
    [key: string]: any;
}) => {
    const canvasContext = useContext(CanvasContext);

    const TOOLS_DEFAULTS = {
        select: {
            tool: { type: "select" } satisfies SelectTool,
            displayName: "Select Objects",
            icon: <MousePointer size={20} />,
        },
        pencil: {
            tool: {
                type: "pencil",
                color: canvasContext.local_cachedColor,
                stroke: canvasContext.local_cachedStroke,
            } satisfies PencilTool,
            displayName: "Pencil",
            icon: <Pen size={20} />,
        },
        eraser: {
            tool: {
                type: "eraser",
                stroke: canvasContext.local_cachedStroke,
                eraserMode: "object",
            } satisfies EraserTool,
            displayName: "Eraser",
            icon: <Eraser size={20} />,
        },
        ellipse: {
            tool: {
                type: "ellipse",
                hollow: true,
                hollowStroke: 1,
                color: canvasContext.local_cachedColor,
            } satisfies EllipseTool,
            displayName: "Draw Ellipse",
            icon: <Circle size={20} />,
        },
        line: {
            tool: {
                type: "line",
                color: canvasContext.local_cachedColor,
                stroke: canvasContext.local_cachedStroke,
            } satisfies LineTool,
            displayName: "Draw Line",
            icon: <Slash size={20} />,
        },
        rect: {
            tool: {
                type: "rect",
                hollow: true,
                hollowStroke: 1,
                color: canvasContext.local_cachedColor,
            } satisfies RectTool,
            displayName: "Draw Rectangle",
            icon: <Square size={20} />,
        },
    } as const;

    // Tool options are stored so switching from one tool to another will keep its previous "extra" properties (e.g. rect hollow / eraser mode).
    const [tools, setTools] = useState<ToolsData>(TOOLS_DEFAULTS);

    // Whenever cached color or stroke changes, rebuild the tools (because the original value is in constructor it is called once will not update even on re-render)
    useEffect(() => {
        setTools((prev) => ({
            ...prev,
            pencil: {
                ...prev.pencil,
                tool: {
                    ...prev.pencil.tool,
                    color: canvasContext.local_cachedColor,
                    stroke: canvasContext.local_cachedStroke,
                },
            },
            eraser: {
                ...prev.eraser,
                tool: {
                    ...prev.eraser.tool,
                    stroke: canvasContext.local_cachedStroke,
                },
            },
            ellipse: {
                ...prev.ellipse,
                tool: {
                    ...prev.ellipse.tool,
                    color: canvasContext.local_cachedColor,
                },
            },
            line: {
                ...prev.line,
                tool: {
                    ...prev.line.tool,
                    color: canvasContext.local_cachedColor,
                    stroke: canvasContext.local_cachedStroke,
                },
            },
            rect: {
                ...prev.rect,
                tool: {
                    ...prev.rect.tool,
                    color: canvasContext.local_cachedColor,
                },
            },
        }));
    }, [canvasContext.local_cachedColor, canvasContext.local_cachedStroke]);

    const handleToolClick = (toolType: ToolType) => {
        canvasContext.setLocalTool(tools[toolType].tool);
    };

    const handleColorChange = (newColor: string) => {
        canvasContext.setLocalTool((prevTool) => {
            return { ...prevTool, color: newColor };
        });
        canvasContext.setLocalCachedColor(newColor);
    };

    const handleStrokeChange = (newStroke: number) => {
        canvasContext.setLocalTool((prevTool) => {
            return { ...prevTool, stroke: newStroke };
        });
        canvasContext.setLocalCachedStroke(newStroke);
    };

    const showOptionsPanel =
        tools[canvasContext.local_tool.type]?.tool.type === "rect" ||
        tools[canvasContext.local_tool.type]?.tool.type === "ellipse" ||
        tools[canvasContext.local_tool.type]?.tool.type === "eraser";

    return (
        <div className={`absolute ${className}`} {...props}>
            {/* Extra options panel for tools that need it */}
            {showOptionsPanel && <OptionsPanel setTools={setTools} />}

            {/* Toolbox  */}
            <div
                className="flex w-20 flex-col items-center space-y-4 p-3"
                style={{
                    backgroundColor: "var(--card)",
                    color: "var(--card-foreground)",
                    borderRadius: "12px",
                }}
            >
                <h2 className="mb-2 text-sm font-bold">Tools</h2>

                {/* Tool buttons */}
                <ToolButtonsSection
                    tools={tools}
                    selectedToolType={canvasContext.local_tool.type}
                    onToolClick={handleToolClick}
                />

                {/* Color Picker */}
                <ColorPickerSection
                    cachedColor={canvasContext.local_cachedColor}
                    isEnabled={"color" in canvasContext.local_tool}
                    onColorChange={handleColorChange}
                />

                {/* Stroke selector */}
                <StrokeSection
                    cachedStroke={canvasContext.local_cachedStroke}
                    isEnabled={"stroke" in canvasContext.local_tool}
                    onStrokeChange={handleStrokeChange}
                />
            </div>
        </div>
    );
};

function ToolButtonsSection({
    tools,
    selectedToolType,
    onToolClick,
}: {
    tools: ToolsData;
    selectedToolType: ToolType;
    onToolClick: (toolType: ToolType) => void;
}) {
    return (
        <div className="flex flex-col space-y-2">
            {Object.entries(tools).map(([toolType, { displayName, icon }]) => {
                const active = selectedToolType === toolType;
                return (
                    <button
                        key={toolType}
                        onClick={() => onToolClick(toolType as ToolType)}
                        className="rounded p-2 transition"
                        title={displayName}
                        style={{
                            backgroundColor: active
                                ? "var(--accent)"
                                : "var(--card)",
                            color: active
                                ? "var(--accent-foreground)"
                                : "var(--card-foreground)",
                            cursor: "pointer",
                        }}
                        onMouseEnter={(e) => {
                            (
                                e.currentTarget as HTMLButtonElement
                            ).style.backgroundColor = "var(--accent)";
                            (e.currentTarget as HTMLButtonElement).style.color =
                                "var(--accent-foreground)";
                        }}
                        onMouseLeave={(e) => {
                            (
                                e.currentTarget as HTMLButtonElement
                            ).style.backgroundColor = active
                                ? "var(--accent)"
                                : "var(--card)";
                            (e.currentTarget as HTMLButtonElement).style.color =
                                active
                                    ? "var(--accent-foreground)"
                                    : "var(--card-foreground)";
                        }}
                    >
                        {icon}
                    </button>
                );
            })}
        </div>
    );
}

function ColorPickerSection({
    cachedColor,
    isEnabled,
    onColorChange,
}: {
    cachedColor: string;
    isEnabled: boolean;
    onColorChange: (color: string) => void;
}) {
    const [showColorPicker, setShowColorPicker] = useState(false);
    const pickerRef = useRef<HTMLDivElement>(null);

    // Click outside to close color picker
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                pickerRef.current &&
                !pickerRef.current.contains(event.target as Node)
            ) {
                setShowColorPicker(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Checkerboard background to indicate transparency in color
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
            <div
                className="absolute inset-0 grid grid-cols-4 grid-rows-4"
                style={{ width: "100%", height: "100%" }}
            >
                {squares}
            </div>
        );
    };

    return (
        <div className="relative mt-4 flex w-full flex-col items-center">
            <label className="mb-1 text-sm">Color</label>
            <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                disabled={!isEnabled}
                title={
                    isEnabled
                        ? "Select drawing color"
                        : "Color not available for this tool"
                }
                className="border-card-foreground relative h-8 w-full cursor-pointer overflow-hidden rounded border transition disabled:cursor-not-allowed disabled:opacity-50"
            >
                {renderCheckerboard()}
                <div
                    className="absolute inset-0"
                    style={{ backgroundColor: cachedColor }}
                />
            </button>

            {showColorPicker && (
                <div
                    ref={pickerRef}
                    className="absolute top-0 right-full z-50 mr-4 flex flex-col items-center rounded-xl border border-gray-700 p-4 shadow-xl backdrop-blur-md"
                    style={{ backgroundColor: "var(--card)" }}
                >
                    <ColorPicker value={cachedColor} onChange={onColorChange} />
                    <button
                        onClick={() => setShowColorPicker(false)}
                        className="mt-4 rounded px-3 py-1 text-xs font-medium transition hover:brightness-110"
                        style={{
                            backgroundColor: "var(--secondary)",
                            color: "var(--secondary-foreground)",
                        }}
                    >
                        Close
                    </button>
                </div>
            )}
        </div>
    );
}

function StrokeSection({
    cachedStroke,
    isEnabled,
    onStrokeChange,
}: {
    cachedStroke: number;
    isEnabled: boolean;
    onStrokeChange: (stroke: number) => void;
}) {
    return (
        <div className="mt-4 flex w-full flex-col space-y-1">
            <label className="text-sm">Width</label>
            <input
                type="range"
                min="1"
                max="20"
                value={cachedStroke}
                disabled={!isEnabled}
                title={
                    isEnabled
                        ? "Adjust stroke width"
                        : "Stroke not available for this tool"
                }
                onChange={(e) => onStrokeChange(Number(e.target.value))}
                className="w-full"
                style={{
                    accentColor: "var(--accent)",
                    opacity: isEnabled ? 1 : 0.5,
                    cursor: isEnabled ? "pointer" : "not-allowed",
                }}
            />
            <span className="text-center text-xs">{cachedStroke}px</span>
        </div>
    );
}

function OptionsPanel({
    setTools,
}: {
    setTools: React.Dispatch<React.SetStateAction<ToolsData>>;
}) {
    const canvasContext = useContext(CanvasContext);

    const tool = canvasContext.local_tool as Tool;

    if (tool.type === "rect" || tool.type === "ellipse") {
        const isRect = tool.type === "rect";
        const currentTool = tool as RectTool | EllipseTool;

        const FilledIcon = () =>
            isRect ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <rect
                        x="2"
                        y="2"
                        width="20"
                        height="20"
                        rx="2"
                        fill="currentColor"
                    />
                </svg>
            ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" fill="currentColor" />
                </svg>
            );

        const HollowIcon = () =>
            isRect ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <rect
                        x="2"
                        y="2"
                        width="20"
                        height="20"
                        rx="2"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                    />
                </svg>
            ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <circle
                        cx="12"
                        cy="12"
                        r="10"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                    />
                </svg>
            );

        const choices = [
            { label: "Hollow", hollow: true, Icon: HollowIcon },
            { label: "Filled", hollow: false, Icon: FilledIcon },
        ];

        return (
            <div
                style={{
                    position: "absolute",
                    right: "calc(100% + 10px)",
                    top: 0,
                    backgroundColor: "var(--card)",
                    borderRadius: "12px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                }}
            >
                <div className="flex w-[110px] flex-col items-start gap-3 p-3">
                    {/* Fill */}
                    <div className="flex w-full flex-col gap-1">
                        <span
                            className="text-center text-xs font-bold"
                            style={{ color: "var(--card-foreground)" }}
                        >
                            Fill
                        </span>
                        <div className="flex flex-row gap-1">
                            {choices.map(({ label, hollow, Icon }) => {
                                const active = currentTool.hollow === hollow;
                                return (
                                    <button
                                        key={label}
                                        onClick={() => {
                                            canvasContext.setLocalTool(
                                                (prev) => ({ ...prev, hollow })
                                            );
                                            setTools((prev) => ({
                                                ...prev,
                                                [tool.type]: {
                                                    ...prev[tool.type],
                                                    tool: {
                                                        ...prev[tool.type].tool,
                                                        hollow,
                                                    },
                                                },
                                            }));
                                        }}
                                        title={label}
                                        className="flex flex-1 flex-col items-center gap-1 rounded-lg px-1 py-2 transition"
                                        style={{
                                            backgroundColor: active
                                                ? "var(--accent)"
                                                : "transparent",
                                            color: active
                                                ? "var(--accent-foreground)"
                                                : "var(--card-foreground)",
                                            cursor: "pointer",
                                            border: `1.5px solid ${active ? "var(--accent-foreground)" : "transparent"}`,
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!active)
                                                (
                                                    e.currentTarget as HTMLButtonElement
                                                ).style.backgroundColor =
                                                    "var(--accent)";
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!active)
                                                (
                                                    e.currentTarget as HTMLButtonElement
                                                ).style.backgroundColor =
                                                    "transparent";
                                        }}
                                    >
                                        <Icon />
                                        <span className="text-xs">{label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Hollow stroke — only shown when hollow is true */}
                    {currentTool.hollow && (
                        <div className="flex w-full flex-col space-y-1">
                            <span
                                className="text-center text-xs font-bold"
                                style={{ color: "var(--card-foreground)" }}
                            >
                                Width
                            </span>
                            <input
                                type="range"
                                min="1"
                                max="20"
                                value={currentTool.hollowStroke ?? 1}
                                onChange={(e) => {
                                    const hollowStroke = Number(e.target.value);
                                    canvasContext.setLocalTool((prev) => ({
                                        ...prev,
                                        hollowStroke,
                                    }));
                                    setTools((prev) => ({
                                        ...prev,
                                        [tool.type]: {
                                            ...prev[tool.type],
                                            tool: {
                                                ...prev[tool.type].tool,
                                                hollowStroke,
                                            },
                                        },
                                    }));
                                }}
                                className="w-full"
                                style={{
                                    accentColor: "var(--accent)",
                                    cursor: "pointer",
                                }}
                            />
                            <span
                                className="text-center text-xs"
                                style={{ color: "var(--card-foreground)" }}
                            >
                                {currentTool.hollowStroke ?? 1}px
                            </span>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (tool.type === "eraser") {
        const eraserTool = tool as EraserTool;

        const choices: {
            label: string;
            mode: "draw" | "object";
            Icon: () => JSX.Element;
        }[] = [
            {
                label: "Object",
                mode: "object",
                Icon: () => (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <rect
                            x="3"
                            y="3"
                            width="18"
                            height="18"
                            rx="3"
                            stroke="currentColor"
                            strokeWidth="2"
                            fill="none"
                        />
                        <line
                            x1="7"
                            y1="7"
                            x2="17"
                            y2="17"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                        />
                        <line
                            x1="17"
                            y1="7"
                            x2="7"
                            y2="17"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                        />
                    </svg>
                ),
            },
            {
                label: "Precise",
                mode: "draw",
                Icon: () => (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path
                            d="M4 18 Q8 6 12 12 Q16 18 20 6"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            fill="none"
                        />
                        <line
                            x1="3"
                            y1="20"
                            x2="21"
                            y2="20"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                        />
                    </svg>
                ),
            },
        ];

        return (
            <div
                style={{
                    position: "absolute",
                    right: "calc(100% + 10px)",
                    top: 0,
                    backgroundColor: "var(--card)",
                    borderRadius: "12px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                }}
            >
                <div className="flex w-[110px] flex-col items-start p-3">
                    <div className="flex w-full flex-col gap-1">
                        <span
                            className="text-center text-xs font-bold"
                            style={{ color: "var(--card-foreground)" }}
                        >
                            Mode
                        </span>
                        <div className="flex flex-row gap-1">
                            {choices.map(({ label, mode, Icon }) => {
                                const active = eraserTool.eraserMode === mode;
                                return (
                                    <button
                                        key={label}
                                        onClick={() => {
                                            canvasContext.setLocalTool(
                                                (prev) => ({
                                                    ...prev,
                                                    eraserMode: mode,
                                                })
                                            );

                                            setTools((prev) => ({
                                                ...prev,
                                                [tool.type]: {
                                                    ...prev[tool.type],
                                                    tool: {
                                                        ...prev[tool.type].tool,
                                                        eraserMode: mode,
                                                    },
                                                },
                                            }));
                                        }}
                                        title={label}
                                        className="flex flex-1 flex-col items-center gap-1 rounded-lg px-1 py-2 transition"
                                        style={{
                                            backgroundColor: active
                                                ? "var(--accent)"
                                                : "transparent",
                                            color: active
                                                ? "var(--accent-foreground)"
                                                : "var(--card-foreground)",
                                            cursor: "pointer",
                                            border: `1.5px solid ${active ? "var(--accent-foreground)" : "transparent"}`,
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!active)
                                                (
                                                    e.currentTarget as HTMLButtonElement
                                                ).style.backgroundColor =
                                                    "var(--accent)";
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!active)
                                                (
                                                    e.currentTarget as HTMLButtonElement
                                                ).style.backgroundColor =
                                                    "transparent";
                                        }}
                                    >
                                        <Icon />
                                        <span className="text-xs">{label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}

export default Toolbox;
