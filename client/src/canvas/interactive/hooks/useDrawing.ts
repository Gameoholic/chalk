import React, { useContext, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { DrawingInteraction } from "./useMouseEvents";
import { CanvasContext } from "../../../types/context/CanvasContext";
import {
    EllipseTool,
    EraserTool,
    LineTool,
    PencilTool,
    RectTool,
    TextTool,
    Tool,
} from "../../../types/tool";
import {
    Camera,
    EllipseObject,
    EraserPathObject,
    LineObject,
    PathObject,
    RectObject,
    TextObject,
    Vec2,
    WorldObject,
} from "../../../types/canvas";
import { screenToWorld } from "../utils/canvasCoords";
import { findObjectAtCoords as hitTest } from "../utils/canvasHitTesting";

interface useDrawingInteractionsProps {
    updateOrAddObject: (object: WorldObject) => void;
    removeObject: (objectId: string) => void;
    commitObjectChanges: (
        updatedObjects?: WorldObject[],
        deletedObjectIds?: string[]
    ) => void;
    setDrawingTextBoxObjectId: React.Dispatch<
        React.SetStateAction<string | null>
    >;
    openTextEditor: (object: TextObject) => void;
}

export function useDrawing({
    updateOrAddObject,
    removeObject,
    commitObjectChanges,
    setDrawingTextBoxObjectId,
    openTextEditor,
}: useDrawingInteractionsProps) {
    const canvasContext = useContext(CanvasContext);
    const camera = canvasContext.local_camera;

    function handleDrawingInteraction_MouseMove(
        e: React.MouseEvent<HTMLCanvasElement>,
        interaction: React.RefObject<DrawingInteraction>
    ) {
        if (interaction.current?.tool.type === "pencil") {
            handleMouseMovePencilDraw(e, interaction);
        } else if (interaction.current?.tool.type === "eraser") {
            handleMouseMoveEraserDraw(e, interaction);
        } else if (interaction.current?.tool.type === "line") {
            handleMouseMoveLineDraw(e, interaction);
        } else if (interaction.current?.tool.type === "rect") {
            handleMouseMoveRectDraw(e, interaction);
        } else if (interaction.current?.tool.type === "ellipse") {
            handleMouseMoveEllipseDraw(e, interaction);
        } else if (interaction.current?.tool.type === "text") {
            handleMouseMoveTextDraw(e, interaction);
        }
    }

    function handleDrawingInteraction_MouseUp(
        e: React.MouseEvent<HTMLCanvasElement>,
        interaction: React.RefObject<DrawingInteraction>
    ) {
        if (interaction.current?.tool.type === "text") {
            openTextEditor(interaction.current.latestObject as TextObject);
        }
    }

    function handleMouseMovePencilDraw(
        e: React.MouseEvent<HTMLCanvasElement>,
        interaction: React.RefObject<DrawingInteraction>
    ) {
        const pencilTool = interaction.current.tool as PencilTool;

        const mouseWorldCoords: Vec2 = screenToWorld(e, camera);
        interaction.current.path.push(mouseWorldCoords);

        const newPath: PathObject = {
            id: interaction.current.objectId,
            type: "path",
            color: pencilTool.color,
            stroke: pencilTool.stroke,
            points: interaction.current.path,
        };
        interaction.current.latestObject = newPath;
        updateOrAddObject(newPath);
    }

    function handleMouseMoveEraserDraw(
        e: React.MouseEvent<HTMLCanvasElement>,
        interaction: React.RefObject<DrawingInteraction>
    ) {
        const eraserTool = interaction.current.tool as EraserTool;

        const mouseWorldCoords: Vec2 = screenToWorld(e, camera);
        interaction.current.path.push(mouseWorldCoords);

        // hikakin todo fix - what about local_deletedObjects? we should have more centralized way of getting all UPDATED object states...
        function findObjectAtCoords(coords: Vec2): WorldObject | null {
            return hitTest([...canvasContext.getAllObjects().values()], coords);
        }

        if (eraserTool.eraserMode === "object") {
            const hoveredObject = findObjectAtCoords(mouseWorldCoords);
            if (hoveredObject) {
                removeObject(hoveredObject.id);
                commitObjectChanges(undefined, [hoveredObject.id]);
            }
        } else {
            const newPath: EraserPathObject = {
                id: interaction.current.objectId,
                type: "eraser-path",
                stroke: eraserTool.stroke,
                points: interaction.current.path,
            };
            interaction.current.latestObject = newPath;
            updateOrAddObject(newPath);
        }
    }

    function handleMouseMoveLineDraw(
        e: React.MouseEvent<HTMLCanvasElement>,
        interaction: React.RefObject<DrawingInteraction>
    ) {
        const lineTool = interaction.current.tool as LineTool;

        const mouseWorldCoords: Vec2 = screenToWorld(e, camera);
        if (interaction.current.path.length === 0) {
            interaction.current.path[0] = mouseWorldCoords;
        }
        interaction.current.path[1] = mouseWorldCoords;

        const newLine: LineObject = {
            id: interaction.current.objectId,
            type: "line",
            color: lineTool.color,
            stroke: lineTool.stroke,
            point1: interaction.current.path[0],
            point2: interaction.current.path[1],
        };
        interaction.current.latestObject = newLine;
        updateOrAddObject(newLine);
    }

    function handleMouseMoveRectDraw(
        e: React.MouseEvent<HTMLCanvasElement>,
        interaction: React.RefObject<DrawingInteraction>
    ) {
        const rectTool = interaction.current.tool as RectTool;

        const mouseWorldCoords: Vec2 = screenToWorld(e, camera);
        if (interaction.current.path.length === 0) {
            interaction.current.path[0] = mouseWorldCoords;
            // We aren't gonna be able to stroke it, so there's legit nothing to draw if user just clicks and releases without dragging
            // If it's hollow we can at least use the stroke size so we allow that
            if (!rectTool.hollow) return;
        }

        interaction.current.path[1] = mouseWorldCoords;
        const newRect: RectObject = {
            id: interaction.current.objectId,
            type: "rect",
            color: rectTool.color,
            hollow: rectTool.hollow,
            hollowStroke: rectTool.hollow ? rectTool.hollowStroke : 0,
            position: interaction.current.path[0],
            size: {
                x:
                    interaction.current.path[1].x -
                    interaction.current.path[0].x,
                y:
                    interaction.current.path[1].y -
                    interaction.current.path[0].y,
            },
        };
        interaction.current.latestObject = newRect;
        updateOrAddObject(newRect);
    }

    function handleMouseMoveEllipseDraw(
        e: React.MouseEvent<HTMLCanvasElement>,
        interaction: React.RefObject<DrawingInteraction>
    ) {
        const ellipseTool = interaction.current.tool as EllipseTool;

        const mouseWorldCoords: Vec2 = screenToWorld(e, camera);
        if (interaction.current.path.length === 0) {
            interaction.current.path[0] = mouseWorldCoords;
            // We aren't gonna be able to stroke it, so there's legit nothing to draw if user just clicks and releases without dragging
            // If it's hollow we can at least use the stroke size so we allow that
            if (!ellipseTool.hollow) return;
        }

        interaction.current.path[1] = mouseWorldCoords;
        const newEllipse: EllipseObject = {
            id: interaction.current.objectId,
            type: "ellipse",
            color: ellipseTool.color,
            hollow: ellipseTool.hollow,
            hollowStroke: ellipseTool.hollow ? ellipseTool.hollowStroke : 0,
            position: interaction.current.path[0],
            size: {
                x:
                    interaction.current.path[1].x -
                    interaction.current.path[0].x,
                y:
                    interaction.current.path[1].y -
                    interaction.current.path[0].y,
            },
        };
        interaction.current.latestObject = newEllipse;
        updateOrAddObject(newEllipse);
    }

    function handleMouseMoveTextDraw(
        e: React.MouseEvent<HTMLCanvasElement>,
        interaction: React.RefObject<DrawingInteraction>
    ) {
        const textTool = interaction.current.tool as TextTool;

        const mouseWorldCoords: Vec2 = screenToWorld(e, camera);
        if (interaction.current.path.length === 0) {
            interaction.current.path[0] = mouseWorldCoords;
        }

        const MIN_W = 20;
        const MIN_H = 10;

        interaction.current.path[1] = mouseWorldCoords;
        const newText: TextObject = {
            id: interaction.current.objectId,
            type: "text",
            text: "",
            color: textTool.color,
            bold: textTool.bold,
            italic: textTool.italic,
            fontFamily: textTool.fontFamily,
            fontSize: textTool.fontSize,
            lineHeight: textTool.lineHeight,
            boxPosition: interaction.current.path[0],
            boxSize: {
                x: Math.max(
                    interaction.current.path[1].x -
                        interaction.current.path[0].x,
                    MIN_W
                ),
                y: Math.max(
                    interaction.current.path[1].y -
                        interaction.current.path[0].y,
                    MIN_H
                ),
            },
        };
        interaction.current.latestObject = newText;
        updateOrAddObject(newText);
        setDrawingTextBoxObjectId(interaction.current.objectId);
    }

    return {
        handleDrawingInteraction_MouseMove,
        handleDrawingInteraction_MouseUp,
    };
}
