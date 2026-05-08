import { Vec2, WorldObject } from "../../../types/canvas";

export function getBoundingBox(
    obj: WorldObject
): { min: Vec2; max: Vec2 } | null {
    switch (obj.type) {
        case "path":
        case "eraser-path": {
            if (obj.points.length === 0) return null;
            const xs = obj.points.map((p) => p.x);
            const ys = obj.points.map((p) => p.y);
            const pad = (obj.stroke ?? 0) / 2;
            return {
                min: { x: Math.min(...xs) - pad, y: Math.min(...ys) - pad },
                max: { x: Math.max(...xs) + pad, y: Math.max(...ys) + pad },
            };
        }
        case "line": {
            const pad = (obj.stroke ?? 0) / 2;
            return {
                min: {
                    x: Math.min(obj.point1.x, obj.point2.x) - pad,
                    y: Math.min(obj.point1.y, obj.point2.y) - pad,
                },
                max: {
                    x: Math.max(obj.point1.x, obj.point2.x) + pad,
                    y: Math.max(obj.point1.y, obj.point2.y) + pad,
                },
            };
        }
        case "rect":
        case "ellipse": {
            const x0 = Math.min(obj.position.x, obj.position.x + obj.size.x);
            const y0 = Math.min(obj.position.y, obj.position.y + obj.size.y);
            return {
                min: { x: x0, y: y0 },
                max: {
                    x: x0 + Math.abs(obj.size.x),
                    y: y0 + Math.abs(obj.size.y),
                },
            };
        }
        case "text": {
            const x0 = Math.min(
                obj.boxPosition.x,
                obj.boxPosition.x + obj.boxSize.x
            );
            const y0 = Math.min(
                obj.boxPosition.y,
                obj.boxPosition.y + obj.boxSize.y
            );
            return {
                min: { x: x0, y: y0 },
                max: {
                    x: x0 + Math.abs(obj.boxSize.x),
                    y: y0 + Math.abs(obj.boxSize.y),
                },
            };
        }
        default:
            return null;
    }
}

// objects should be ordered back-to-front, returns the topmost hit
export function findObjectAtCoords(
    objects: WorldObject[],
    coords: Vec2
): WorldObject | null {
    for (const obj of [...objects].reverse()) {
        const bb = getBoundingBox(obj);
        if (!bb) continue;
        if (
            coords.x >= bb.min.x &&
            coords.x <= bb.max.x &&
            coords.y >= bb.min.y &&
            coords.y <= bb.max.y
        ) {
            return obj;
        }
    }
    return null;
}
