export interface Vec2 {
    x: number;
    y: number;
}

export type ObjectType =
    | "path"
    | "eraser-path"
    | "line"
    | "rect"
    | "ellipse"
    | "text"
    | "image";

export interface BaseObject {
    id: string;
    type: ObjectType;
}

export interface ColorableObject extends BaseObject {
    color: string;
}

export interface StrokableObject {
    stroke: number;
}

export interface PathObject extends ColorableObject, StrokableObject {
    type: "path";
    points: Vec2[];
}

export interface EraserPathObject extends BaseObject, StrokableObject {
    type: "eraser-path";
    points: Vec2[];
}

export interface LineObject extends ColorableObject, StrokableObject {
    type: "line";
    point1: Vec2;
    point2: Vec2;
}

export interface ShapeObject extends ColorableObject {
    hollow: boolean;
    hollowStroke: number; // only relevant if hollow is true, otherwise will be set to 0
    position: Vec2; // top left coordinate (unless size is negative)
    size: Vec2; // Can be negative (for reverse)
}

export interface RectObject extends ShapeObject {
    type: "rect";
}

export interface EllipseObject extends ShapeObject {
    type: "ellipse";
}

export interface TextObject extends ColorableObject {
    type: "text";
}

export type WorldObject =
    | PathObject
    | EraserPathObject
    | LineObject
    | RectObject
    | EllipseObject
    | TextObject;

export interface Camera {
    position: Vec2; // top-left world coordinate
    size: Vec2; // size of the canvas in pixels
    zoom: number; // 1 = default, 2 = zoom in, 0.5 = zoom out
}
