import React, {
    JSX,
    useState,
    useRef,
    useEffect,
    useContext,
    useMemo,
} from "react";
import { MousePointer, Square, Circle, Slash, Pen, Eraser } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
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

const Toolbox = ({
    className,
    ...props
}: {
    className: string;
    [key: string]: any;
}) => {
    const canvasContext = useContext(CanvasContext);

    const [showColorPicker, setShowColorPicker] = useState<boolean>(false);

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
                color: canvasContext.local_cachedColor,
            } satisfies RectTool,
            displayName: "Draw Rectangle",
            icon: <Square size={20} />,
        },
    } as const;

    const tools = useMemo(
        () => ({
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
                    color: canvasContext.local_cachedColor,
                } satisfies RectTool,
                displayName: "Draw Rectangle",
                icon: <Square size={20} />,
            },
        }),
        [canvasContext.local_cachedColor, canvasContext.local_cachedStroke]
    );

    const pickerRef = useRef<HTMLDivElement>(null);

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

    const handleToolClick = (toolType: ToolType) => {
        // If clicked on an already selected tool, unselect it (switch to default 'select' tool)
        if (canvasContext.local_tool?.type === toolType) {
            canvasContext.setLocalTool(tools.select.tool);
        } else {
            canvasContext.setLocalTool(tools[toolType].tool);
        }
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
        <div className={`absolute ${className}`} {...props}>
            {/*Options panel  */}
            {/* {showOptionsPanel && (
                <div
                    style={{
                        position: "absolute",
                        right: "calc(100% + 10px)",
                        top: 0,
                        background:
                            "linear-gradient(160deg, rgba(255,140,165,0.10) 0%, rgba(255,140,165,0.04) 100%)",
                        backgroundColor: "var(--card)",
                        borderRadius: "12px",
                        boxShadow: "-4px 0 18px rgba(255,140,165,0.12)",
                    }}
                >
                    <div className="flex w-[110px] flex-col items-start p-3">
                        <OptionsPanel
                            tool={canvasContext.local_selectedTool}
                            options={toolOptions}
                            setOptions={setToolOptions}
                        />
                    </div>
                </div>
            )} */}

            {/* Main toolbox column  */}
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
                <div className="flex flex-col space-y-2">
                    {Object.entries(tools).map(
                        ([toolType, { displayName, icon }]) => (
                            <button
                                key={toolType}
                                onClick={() =>
                                    handleToolClick(toolType as ToolType)
                                }
                                className="rounded p-2 transition"
                                title={displayName}
                                style={{
                                    backgroundColor:
                                        canvasContext.local_tool.type ===
                                        toolType
                                            ? "var(--accent)"
                                            : "var(--card)",
                                    color:
                                        canvasContext.local_tool.type ===
                                        toolType
                                            ? "var(--accent-foreground)"
                                            : "var(--card-foreground)",
                                    cursor: "pointer",
                                }}
                                onMouseEnter={(e) => {
                                    (
                                        e.currentTarget as HTMLButtonElement
                                    ).style.backgroundColor = "var(--accent)";
                                    (
                                        e.currentTarget as HTMLButtonElement
                                    ).style.color = "var(--accent-foreground)";
                                }}
                                onMouseLeave={(e) => {
                                    (
                                        e.currentTarget as HTMLButtonElement
                                    ).style.backgroundColor =
                                        canvasContext.local_tool.type ===
                                        toolType
                                            ? "var(--accent)"
                                            : "var(--card)";
                                    (
                                        e.currentTarget as HTMLButtonElement
                                    ).style.color =
                                        canvasContext.local_tool.type ===
                                        toolType
                                            ? "var(--accent-foreground)"
                                            : "var(--card-foreground)";
                                }}
                            >
                                {icon}
                            </button>
                        )
                    )}
                </div>

                {/* Color Picker */}
                <div className="relative mt-4 flex w-full flex-col items-center">
                    <label className="mb-1 text-sm">Color</label>
                    <button
                        onClick={() => {
                            setShowColorPicker(!showColorPicker);
                        }}
                        disabled={!("color" in canvasContext.local_tool)}
                        title={
                            "color" in canvasContext.local_tool
                                ? "Select drawing color"
                                : "Color not available for this tool"
                        }
                        className="border-card-foreground relative h-8 w-full cursor-pointer overflow-hidden rounded border transition disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {renderCheckerboard()}
                        <div
                            className="absolute inset-0"
                            style={{
                                backgroundColor:
                                    canvasContext.local_cachedColor,
                            }}
                        />
                    </button>

                    {showColorPicker && (
                        <div
                            ref={pickerRef}
                            className="absolute top-0 right-full z-50 mr-4 flex flex-col items-center rounded-xl border border-gray-700 p-4 shadow-xl backdrop-blur-md"
                            style={{ backgroundColor: "var(--card)" }}
                        >
                            <ColorPicker
                                value={canvasContext.local_cachedColor}
                                onChange={handleColorChange}
                            />
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

                {/* Stroke selector */}
                <div className="mt-4 flex w-full flex-col space-y-1">
                    <label className="text-sm">Width</label>
                    <input
                        type="range"
                        min="1"
                        max="20"
                        value={canvasContext.local_cachedStroke}
                        disabled={!("stroke" in canvasContext.local_tool)}
                        title={
                            "stroke" in canvasContext.local_tool
                                ? "Adjust stroke width"
                                : "Stroke not available for this tool"
                        }
                        onChange={(e) => {
                            handleStrokeChange(Number(e.target.value));
                        }}
                        className="w-full"
                        style={{
                            accentColor: "var(--accent)",
                            opacity: !("stroke" in canvasContext.local_tool)
                                ? 0.5
                                : 1,
                            cursor:
                                "stroke" in canvasContext.local_tool
                                    ? "pointer"
                                    : "not-allowed",
                        }}
                    />
                    <span className="text-center text-xs">
                        {canvasContext.local_cachedStroke}px
                    </span>
                </div>
            </div>
        </div>
    );
};

// function ShapeFillOptions({
//     tool,
//     options,
//     setOptions,
// }: ToolOptionsPanelProps) {
//     const isRect = tool === "rect";

//     const FilledIcon = () =>
//         isRect ? (
//             <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
//                 <rect
//                     x="2"
//                     y="2"
//                     width="20"
//                     height="20"
//                     rx="2"
//                     fill="currentColor"
//                 />
//             </svg>
//         ) : (
//             <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
//                 <circle cx="12" cy="12" r="10" fill="currentColor" />
//             </svg>
//         );

//     const HollowIcon = () =>
//         isRect ? (
//             <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
//                 <rect
//                     x="2"
//                     y="2"
//                     width="20"
//                     height="20"
//                     rx="2"
//                     fill="none"
//                     stroke="currentColor"
//                     strokeWidth="2.5"
//                 />
//             </svg>
//         ) : (
//             <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
//                 <circle
//                     cx="12"
//                     cy="12"
//                     r="10"
//                     fill="none"
//                     stroke="currentColor"
//                     strokeWidth="2.5"
//                 />
//             </svg>
//         );

//     const choices: {
//         label: string;
//         hollow: boolean;
//         Icon: () => JSX.Element;
//     }[] = [
//         { label: "Hollow", hollow: true, Icon: HollowIcon },
//         { label: "Filled", hollow: false, Icon: FilledIcon },
//     ];

//     return (
//         <div className="flex w-full flex-col gap-1">
//             <span
//                 className="text-center text-xs font-bold"
//                 style={{ color: "var(--card-foreground)" }}
//             >
//                 Fill
//             </span>
//             <div className="flex flex-row gap-1">
//                 {choices.map(({ label, hollow, Icon }) => {
//                     const active = options.isHollow === hollow;
//                     return (
//                         <button
//                             key={label}
//                             onClick={() =>
//                                 setOptions((prev) => ({
//                                     ...prev,
//                                     isHollow: hollow,
//                                 }))
//                             }
//                             title={label}
//                             className="flex flex-1 flex-col items-center gap-1 rounded-lg px-1 py-2 transition"
//                             style={{
//                                 backgroundColor: active
//                                     ? "var(--accent)"
//                                     : "transparent",
//                                 color: active
//                                     ? "var(--accent-foreground)"
//                                     : "var(--card-foreground)",
//                                 cursor: "pointer",
//                                 border: `1.5px solid ${active ? "var(--accent-foreground)" : "transparent"}`,
//                             }}
//                             onMouseEnter={(e) => {
//                                 if (!active)
//                                     (
//                                         e.currentTarget as HTMLButtonElement
//                                     ).style.backgroundColor = "var(--accent)";
//                             }}
//                             onMouseLeave={(e) => {
//                                 if (!active)
//                                     (
//                                         e.currentTarget as HTMLButtonElement
//                                     ).style.backgroundColor = "transparent";
//                             }}
//                         >
//                             <Icon />
//                             <span className="text-xs">{label}</span>
//                         </button>
//                     );
//                 })}
//             </div>
//         </div>
//     );
// }

// // ── Eraser Mode Options ───────────────────────────────────────────────────────

// function EraserModeOptions({ options, setOptions }: ToolOptionsPanelProps) {
//     const choices: {
//         label: string;
//         mode: "draw" | "object";
//         Icon: () => JSX.Element;
//     }[] = [
//         {
//             label: "Object",
//             mode: "object",
//             Icon: () => (
//                 <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
//                     <rect
//                         x="3"
//                         y="3"
//                         width="18"
//                         height="18"
//                         rx="3"
//                         stroke="currentColor"
//                         strokeWidth="2"
//                         fill="none"
//                     />
//                     <line
//                         x1="7"
//                         y1="7"
//                         x2="17"
//                         y2="17"
//                         stroke="currentColor"
//                         strokeWidth="2"
//                         strokeLinecap="round"
//                     />
//                     <line
//                         x1="17"
//                         y1="7"
//                         x2="7"
//                         y2="17"
//                         stroke="currentColor"
//                         strokeWidth="2"
//                         strokeLinecap="round"
//                     />
//                 </svg>
//             ),
//         },
//         {
//             label: "Precise",
//             mode: "draw",
//             Icon: () => (
//                 <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
//                     <path
//                         d="M4 18 Q8 6 12 12 Q16 18 20 6"
//                         stroke="currentColor"
//                         strokeWidth="2.5"
//                         strokeLinecap="round"
//                         strokeLinejoin="round"
//                         fill="none"
//                     />
//                     <line
//                         x1="3"
//                         y1="20"
//                         x2="21"
//                         y2="20"
//                         stroke="currentColor"
//                         strokeWidth="1.5"
//                         strokeLinecap="round"
//                     />
//                 </svg>
//             ),
//         },
//     ];

//     return (
//         <div className="flex w-full flex-col gap-1">
//             <span
//                 className="text-center text-xs font-bold"
//                 style={{ color: "var(--card-foreground)" }}
//             >
//                 Mode
//             </span>
//             <div className="flex flex-row gap-1">
//                 {choices.map(({ label, mode, Icon }) => {
//                     const active = options.eraserMode === mode;
//                     return (
//                         <button
//                             key={label}
//                             onClick={() =>
//                                 setOptions((prev) => ({
//                                     ...prev,
//                                     eraserMode: mode,
//                                 }))
//                             }
//                             title={label}
//                             className="flex flex-1 flex-col items-center gap-1 rounded-lg px-1 py-2 transition"
//                             style={{
//                                 backgroundColor: active
//                                     ? "var(--accent)"
//                                     : "transparent",
//                                 color: active
//                                     ? "var(--accent-foreground)"
//                                     : "var(--card-foreground)",
//                                 cursor: "pointer",
//                                 border: `1.5px solid ${active ? "var(--accent-foreground)" : "transparent"}`,
//                             }}
//                             onMouseEnter={(e) => {
//                                 if (!active)
//                                     (
//                                         e.currentTarget as HTMLButtonElement
//                                     ).style.backgroundColor = "var(--accent)";
//                             }}
//                             onMouseLeave={(e) => {
//                                 if (!active)
//                                     (
//                                         e.currentTarget as HTMLButtonElement
//                                     ).style.backgroundColor = "transparent";
//                             }}
//                         >
//                             <Icon />
//                             <span className="text-xs">{label}</span>
//                         </button>
//                     );
//                 })}
//             </div>
//         </div>
//     );
// }

export default Toolbox;
