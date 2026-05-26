import { TextObject, Vec2 } from "../../../types/canvas";

export function makeCtxForObject(
    obj: TextObject
): { ctx: CanvasRenderingContext2D; maxWidth: number } {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    ctx.font = [
        obj.italic ? "italic" : "",
        obj.bold ? "bold" : "",
        `${obj.fontSize}px`,
        obj.fontFamily,
    ]
        .filter(Boolean)
        .join(" ");
    return { ctx, maxWidth: obj.boxSize.x - 8 };
}

export function getMinTextBoxSize(text: string, obj: TextObject): Vec2 {
    const { ctx } = makeCtxForObject(obj);

    const lines = text.split("\n");
    const longestLine = lines.reduce((max, line) => {
        const w = ctx.measureText(line).width;
        return w > max ? w : max;
    }, 0);

    const lineHeightPx = obj.fontSize * (obj.lineHeight ?? 1.2);
    const requiredW = longestLine + 16;
    const requiredH = lines.length * lineHeightPx + 8;

    return { x: requiredW, y: requiredH };
}

// never shrink below min textbox size
export function measureTextBox(text: string, obj: TextObject): Vec2 {
    const min = getMinTextBoxSize(text, obj);
    return {
        x: Math.max(min.x, obj.boxSize.x),
        y: Math.max(min.y, obj.boxSize.y),
    };
}
