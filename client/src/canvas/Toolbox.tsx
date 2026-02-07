import React, { JSX, useState, useRef, useEffect } from "react";
import { MousePointer, Square, Circle, Slash, Pen } from "lucide-react";
import { SketchPicker, ColorResult } from "react-color";
import { Tool } from "../types/canvas";

const Toolbox = ({
    onToolChange,
    onColorChange,
    onWidthChange,
    className,
}: {
    onToolChange: (tool: Tool) => void;
    onColorChange: (color: string) => void;
    onWidthChange: (width: number) => void;
    className: string;
}) => {
    const [selectedTool, setSelectedTool] = useState<Tool>("none");
    const [color, setColor] = useState<string>("rgba(0,0,0,1)");
    const [width, setWidth] = useState<number>(1);
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

    const tools: { name: Tool; icon: JSX.Element }[] = [
        { name: "select", icon: <MousePointer size={20} /> },
        { name: "pencil", icon: <Pen size={20} /> },
        { name: "ellipse", icon: <Circle size={20} /> },
        { name: "line", icon: <Slash size={20} /> },
        { name: "rect", icon: <Square size={20} /> },
    ];

    const handleToolClick = (tool: Tool) => {
        if (selectedTool === tool) tool = "none";
        setSelectedTool(tool);
        onToolChange(tool);
    };

    const handleColorChange = (updatedColor: ColorResult) => {
        const rgba = `rgba(${updatedColor.rgb.r}, ${updatedColor.rgb.g}, ${updatedColor.rgb.b}, ${updatedColor.rgb.a})`;
        setColor(rgba);
        onColorChange(rgba);
    };

    // Checkerboard grid (kept exactly the same)
    const renderCheckerboard = () => {
        const squares = [];
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
                        style={{
                            backgroundColor:
                                selectedTool === tool.name
                                    ? "var(--accent)"
                                    : "var(--card)",
                            color:
                                selectedTool === tool.name
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
                                selectedTool === tool.name
                                    ? "var(--accent)"
                                    : "var(--card)";
                            (e.currentTarget as HTMLButtonElement).style.color =
                                selectedTool === tool.name
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
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    className="relative h-8 w-full overflow-hidden rounded border transition"
                    style={{
                        borderColor: "var(--card-foreground)",
                    }}
                >
                    {renderCheckerboard()}
                    <div
                        className="absolute inset-0"
                        style={{ backgroundColor: color }}
                    />
                </button>

                {showColorPicker && (
                    <div
                        ref={pickerRef}
                        className="absolute z-50 mt-2 flex flex-col items-center rounded p-2 shadow-lg"
                        style={{ backgroundColor: "var(--card)" }}
                    >
                        <SketchPicker
                            color={color}
                            onChange={handleColorChange}
                        />
                        <button
                            onClick={() => setShowColorPicker(false)}
                            className="mt-2 rounded px-3 py-1 text-sm transition"
                            style={{
                                backgroundColor: "var(--secondary)",
                                color: "var(--secondary-foreground)",
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
                                ).style.backgroundColor = "var(--secondary)";
                                (
                                    e.currentTarget as HTMLButtonElement
                                ).style.color = "var(--secondary-foreground)";
                            }}
                        >
                            Close
                        </button>
                    </div>
                )}
            </div>

            {/* Width selector */}
            <div className="mt-4 flex w-full flex-col space-y-1">
                <label className="text-sm">Width</label>
                <input
                    type="range"
                    min="1"
                    max="20"
                    value={width}
                    onChange={(e) => {
                        const newWidth = Number(e.target.value);
                        setWidth(newWidth);
                        onWidthChange(newWidth);
                    }}
                    className="w-full"
                    style={{
                        accentColor: "var(--accent)",
                    }}
                />
                <span className="text-center text-xs">{width}px</span>
            </div>
        </div>
    );
};

export default Toolbox;
