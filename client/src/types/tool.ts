export type ToolType =
    | "pencil"
    | "eraser"
    | "select"
    | "line"
    | "rect"
    | "ellipse"
    | "text";

interface BaseTool {
    type: ToolType;
}

export interface ColorTool extends BaseTool {
    color: string;
}

export interface StrokeTool extends BaseTool {
    stroke: number;
}

export interface PencilTool extends ColorTool, StrokeTool {
    type: "pencil";
}

export interface EraserTool extends StrokeTool {
    type: "eraser";
    eraserMode: "draw" | "object";
}

export interface SelectTool extends BaseTool {
    type: "select";
}

export interface LineTool extends StrokeTool, ColorTool {
    type: "line";
}

export interface RectTool extends ColorTool {
    type: "rect";
    hollow: boolean;
    hollowStroke: number;
}

export interface EllipseTool extends ColorTool {
    type: "ellipse";
    hollow: boolean;
    hollowStroke: number;
}

export interface TextTool extends ColorTool {
    type: "text";
    fontSize: number;
    fontFamily: string;
    lineHeight: number; // multiplier, e.g. 1.2 = 120% of fontSize
    bold: boolean;
    italic: boolean;
}

export type Tool =
    | PencilTool
    | EraserTool
    | SelectTool
    | LineTool
    | RectTool
    | EllipseTool
    | TextTool;
