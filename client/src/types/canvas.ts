export type Tool = "pencil" | "select" | "line" | "rect" | "ellipse" | "none";

export interface Vec2 {
    x: number;
    y: number;
}

export type ObjectType =
    | "path"
    | "line"
    | "rect"
    | "ellipse"
    | "text"
    | "image";

export interface BaseObject {
    id: string;
    type: ObjectType;
}

export interface ShapeObject extends BaseObject {
    color: string;
    stroke: number;
}

export interface PathObject extends ShapeObject {
    type: "path";
    points: Vec2[];
}

export interface LineObject extends ShapeObject {
    type: "line";
    point1: Vec2;
    point2: Vec2;
}

export interface RectObject extends ShapeObject {
    type: "rect";
    position: Vec2; // top left coordinate (unless size is negative)
    size: Vec2; // Can be negative (for reverse)
}

export interface EllipseObject extends ShapeObject {
    type: "ellipse";
    position: Vec2; // top left coordinate
    size: Vec2; // Can be negative (for reverse)
}

export type WorldObject = PathObject | LineObject | RectObject | EllipseObject;

export interface Camera {
    position: Vec2; // top-left world coordinate
    size: Vec2; // size of the canvas in pixels
    zoom: number; // 1 = default, 2 = zoom in, 0.5 = zoom out
}
