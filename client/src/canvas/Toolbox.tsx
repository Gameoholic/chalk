import React, { JSX, useState, useRef, useEffect, useContext } from "react";
import { MousePointer, Square, Circle, Slash, Pen, Eraser } from "lucide-react";
import { Tool } from "../types/canvas";
import ColorPicker from "../components/ColorPicker";
import { CanvasContext } from "../types/context/CanvasContext";

const Toolbox = ({ className }: { className: string }) => {
    const canvasContext = useContext(CanvasContext);

    const [showColorPicker, setShowColorPicker] = useState<boolean>(false);

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

    const tools: { name: Tool; displayName: string; icon: JSX.Element }[] = [
        {
            name: "select",
            displayName: "Select Objects",
            icon: <MousePointer size={20} />,
        },
        { name: "pencil", displayName: "Pencil", icon: <Pen size={20} /> },
        { name: "eraser", displayName: "Eraser", icon: <Eraser size={20} /> },

        {
            name: "ellipse",
            displayName: "Draw Ellipse",
            icon: <Circle size={20} />,
        },
        { name: "line", displayName: "Draw Line", icon: <Slash size={20} /> },
        {
            name: "rect",
            displayName: "Draw Rectangle",
            icon: <Square size={20} />,
        },
    ];

    const handleToolClick = (tool: Tool) => {
        if (canvasContext.local_selectedTool === tool) tool = "none";
        canvasContext.setLocalTool(tool);
    };

    const handleColorChange = (newColor: string) => {
        canvasContext.setLocalColor(newColor);
    };

    const toolsWithoutStroke: Tool[] = ["rect", "ellipse"];
    const isStrokeSettingEnabled = !toolsWithoutStroke.includes(
        canvasContext.local_selectedTool
    );

    const toolsWithoutColor: Tool[] = ["eraser"];
    const isColorSettingEnabled = !toolsWithoutColor.includes(
        canvasContext.local_selectedTool
    );

    // Checkerboard grid for transparent color preview
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
        <div
            className={`absolute flex w-20 flex-col items-center space-y-4 p-3 ${className}`}
            style={{
                backgroundColor: "var(--card)",
                color: "var(--card-foreground)",
            }}
        >
            <h2 className="mb-2 text-sm font-bold">Tools</h2>

            {/* Tool buttons */}
            <div className="flex flex-col space-y-2">
                {tools.map((tool) => (
                    <button
                        key={tool.name}
                        onClick={() => handleToolClick(tool.name)}
                        className="rounded p-2 transition"
                        title={tool.displayName}
                        style={{
                            backgroundColor:
                                canvasContext.local_selectedTool === tool.name
                                    ? "var(--accent)"
                                    : "var(--card)",
                            color:
                                canvasContext.local_selectedTool === tool.name
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
                            (
                                e.currentTarget as HTMLButtonElement
                            ).style.cursor = "pointer";
                        }}
                        onMouseLeave={(e) => {
                            (
                                e.currentTarget as HTMLButtonElement
                            ).style.backgroundColor =
                                canvasContext.local_selectedTool === tool.name
                                    ? "var(--accent)"
                                    : "var(--card)";
                            (e.currentTarget as HTMLButtonElement).style.color =
                                canvasContext.local_selectedTool === tool.name
                                    ? "var(--accent-foreground)"
                                    : "var(--card-foreground)";
                            (
                                e.currentTarget as HTMLButtonElement
                            ).style.cursor = "default";
                        }}
                    >
                        {tool.icon}
                    </button>
                ))}
            </div>

            {/* Color Picker */}
            <div className="relative mt-4 flex w-full flex-col items-center">
                <label className="mb-1 text-sm">Color</label>
                <button
                    onClick={() => {
                        if (!isColorSettingEnabled) return;
                        setShowColorPicker(!showColorPicker);
                    }}
                    disabled={!isColorSettingEnabled}
                    title={
                        isColorSettingEnabled
                            ? "Select drawing color"
                            : "Color not available for this tool"
                    }
                    className="relative h-8 w-full overflow-hidden rounded border transition"
                    style={{
                        borderColor: "var(--card-foreground)",
                        opacity: isColorSettingEnabled ? 1 : 0.5,
                        cursor: isColorSettingEnabled
                            ? "pointer"
                            : "not-allowed",
                    }}
                >
                    {renderCheckerboard()}
                    <div
                        className="absolute inset-0"
                        style={{
                            backgroundColor: canvasContext.local_selectedColor,
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
                            value={canvasContext.local_selectedColor}
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
                    value={canvasContext.local_selectedStroke}
                    disabled={!isStrokeSettingEnabled}
                    title={
                        isStrokeSettingEnabled
                            ? "Adjust stroke width"
                            : "Stroke not available for this tool"
                    }
                    onChange={(e) => {
                        const newWidth = Number(e.target.value);
                        canvasContext.setLocalStroke(newWidth);
                    }}
                    className="w-full"
                    style={{
                        accentColor: "var(--accent)",
                        opacity: isStrokeSettingEnabled ? 1 : 0.5,
                        cursor: isStrokeSettingEnabled
                            ? "pointer"
                            : "not-allowed",
                    }}
                />
                <span className="text-center text-xs">
                    {canvasContext.local_selectedStroke}px
                </span>
            </div>
        </div>
    );
};

export default Toolbox;
