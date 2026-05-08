import { Camera } from "../../../types/canvas";

/**
 * Draws a grid that scales with the world, but adjusts its density
 * so cells always appear roughly the same size on screen.
 */
export function drawGrid(ctx: CanvasRenderingContext2D, camera: Camera) {
    // These thresholds control the "Screen Size" of the tiles.
    const MIN_TILE_SIZE = 50; // Tiles won't get smaller than this value on screen
    const MAX_TILE_SIZE = 200; // Tiles won't get bigger than this value on screen
    let adaptiveGridSize = MAX_TILE_SIZE;

    while (adaptiveGridSize * camera.zoom < MIN_TILE_SIZE) {
        adaptiveGridSize *= 2;
    }
    while (adaptiveGridSize * camera.zoom > MAX_TILE_SIZE) {
        adaptiveGridSize /= 2;
    }

    ctx.beginPath();
    ctx.strokeStyle = "#e2e8f0"; // Light gray
    ctx.lineWidth = 1 / camera.zoom; // Always 1px on screen

    const left = camera.position.x;
    const top = camera.position.y;
    const width = camera.size.x / camera.zoom;
    const height = camera.size.y / camera.zoom;

    // Snap start positions to the grid to prevent "drifting"
    const startX = Math.floor(left / adaptiveGridSize) * adaptiveGridSize;
    const startY = Math.floor(top / adaptiveGridSize) * adaptiveGridSize;

    for (
        let x = startX;
        x < left + width + adaptiveGridSize;
        x += adaptiveGridSize
    ) {
        ctx.moveTo(x - camera.position.x, 0);
        ctx.lineTo(x - camera.position.x, height);
    }

    for (
        let y = startY;
        y < top + height + adaptiveGridSize;
        y += adaptiveGridSize
    ) {
        ctx.moveTo(0, y - camera.position.y);
        ctx.lineTo(width, y - camera.position.y);
    }

    ctx.stroke();
}
