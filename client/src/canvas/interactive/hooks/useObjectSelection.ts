import React, { useContext, useEffect, useRef, useState } from "react";
import {
    MultipleObjectSelectionBoxInteraction,
    SelectedObjectDragInteraction,
    SelectedObjectResizeInteraction,
} from "./useMouseEvents";
import { CanvasContext } from "../../../types/context/CanvasContext";
import { TextObject, Vec2, WorldObject } from "../../../types/canvas";
import { screenToWorld } from "../utils/canvasCoords";
import { findObjectsInArea, getBoundingBox } from "../utils/canvasHitTesting";
import { getMinTextBoxSize } from "../utils/canvasTextBoxMeasurement";

interface UseObjectSelectionProps {
    updateOrAddObject: (object: WorldObject) => void;
    commitObjectChanges: (
        updatedOrNewObjects?: WorldObject[],
        deletedObjectIds?: string[]
    ) => void;
}

/**
 * Object selection interactions
 */
export function useObjectSelection({
    updateOrAddObject,
    commitObjectChanges,
}: UseObjectSelectionProps) {
    const canvasContext = useContext(CanvasContext);
    const camera = canvasContext.updatedCamera;

    const [selectedObjectIds, setSelectedObjectIds] = useState<Set<string>>(
        new Set()
    );
    const [multipleObjectSelectionBox, setMultipleObjectSelectionBox] =
        useState<{
            start: Vec2;
            end: Vec2;
        } | null>(null);

    function handleMultipleObjectSelectionBoxInteraction_MouseMove(
        e: React.MouseEvent<HTMLCanvasElement>,
        interaction: React.RefObject<MultipleObjectSelectionBoxInteraction>
    ) {
        const mouseWorldCoords: Vec2 = screenToWorld(e, camera);

        if (interaction.current.boxStart === null) {
            interaction.current.boxStart = mouseWorldCoords;
        }
        interaction.current.boxEnd = mouseWorldCoords;
        setMultipleObjectSelectionBox({
            start: interaction.current.boxStart,
            end: interaction.current.boxEnd,
        });
    }

    function handleMultipleObjectSelectionBoxInteraction_MouseUp(
        e: React.MouseEvent<HTMLCanvasElement>,
        interaction: React.RefObject<MultipleObjectSelectionBoxInteraction>
    ) {
        setMultipleObjectSelectionBox(null);

        if (!interaction.current.boxStart || !interaction.current.boxEnd)
            return;

        const allObjects = [...canvasContext.allObjects.values()];

        const selectionMin: Vec2 = {
            x: Math.min(
                interaction.current.boxStart.x,
                interaction.current.boxEnd.x
            ),
            y: Math.min(
                interaction.current.boxStart.y,
                interaction.current.boxEnd.y
            ),
        };
        const selectionMax: Vec2 = {
            x: Math.max(
                interaction.current.boxStart.x,
                interaction.current.boxEnd.x
            ),
            y: Math.max(
                interaction.current.boxStart.y,
                interaction.current.boxEnd.y
            ),
        };

        const objectsInSelectionBox = new Set<string>(
            findObjectsInArea(allObjects, selectionMin, selectionMax).map(
                (obj) => obj.id
            )
        );

        // select all objects including previously selected ones
        setSelectedObjectIds(
            (prev) => new Set([...prev, ...objectsInSelectionBox])
        );
    }

    function handleSelectedObjectDragInteraction_MouseMove(
        e: React.MouseEvent<HTMLCanvasElement>,
        interaction: React.RefObject<SelectedObjectDragInteraction>
    ) {
        const currentMouseWorldPos = screenToWorld(e, camera);
        const dx = currentMouseWorldPos.x - interaction.current.startMousePos.x;
        const dy = currentMouseWorldPos.y - interaction.current.startMousePos.y;

        // We translate based on the ORIGINAL position of the object, so originalObjects never changes for the duration of the interaction.
        interaction.current.originalObjects.forEach((obj) => {
            updateOrAddObject(translateObject(obj, dx, dy));
        });
    }

    function handleSelectedObjectDragInteraction_MouseUp(
        e: React.MouseEvent<HTMLCanvasElement>,
        interaction: React.RefObject<SelectedObjectDragInteraction>
    ) {
        const currentMouseWorldPos = screenToWorld(e, camera);
        const dx = currentMouseWorldPos.x - interaction.current.startMousePos.x;
        const dy = currentMouseWorldPos.y - interaction.current.startMousePos.y;

        const updated = interaction.current.originalObjects.map((obj) =>
            translateObject(obj, dx, dy)
        );
        commitObjectChanges(updated, undefined);
    }

    function handleSelectedObjectResizeInteraction_MouseMove(
        e: React.MouseEvent<HTMLCanvasElement>,
        interaction: React.RefObject<SelectedObjectResizeInteraction>
    ) {
        const currentMouseWorldPos = screenToWorld(e, camera);
        const dx = currentMouseWorldPos.x - interaction.current.startMousePos.x;
        const dy = currentMouseWorldPos.y - interaction.current.startMousePos.y;

        const original = interaction.current.originalObject;
        if (original.type !== "text") return; // only text supported for resizing for now.

        const text = original as TextObject;
        const minSize = getMinTextBoxSize(text.text, text);

        let newX = text.boxPosition.x;
        let newY = text.boxPosition.y;
        let newW = text.boxSize.x;
        let newH = text.boxSize.y;

        const corner = interaction.current.corner;
        if (corner === "br") {
            newW = text.boxSize.x + dx;
            newH = text.boxSize.y + dy;
        } else if (corner === "tr") {
            newW = text.boxSize.x + dx;
            newH = text.boxSize.y - dy;
            newY = text.boxPosition.y + dy;
        } else if (corner === "bl") {
            newW = text.boxSize.x - dx;
            newH = text.boxSize.y + dy;
            newX = text.boxPosition.x + dx;
        } else if (corner === "tl") {
            newW = text.boxSize.x - dx;
            newH = text.boxSize.y - dy;
            newX = text.boxPosition.x + dx;
            newY = text.boxPosition.y + dy;
        }

        // clamp dimensions
        if (newW < minSize.x) {
            newW = minSize.x;
            if (corner === "tl" || corner === "bl") {
                newX = text.boxPosition.x + text.boxSize.x - newW;
            }
        }
        if (newH < minSize.y) {
            newH = minSize.y;
            if (corner === "tl" || corner === "tr") {
                newY = text.boxPosition.y + text.boxSize.y - newH;
            }
        }

        updateOrAddObject({
            ...text,
            boxPosition: { x: newX, y: newY },
            boxSize: { x: newW, y: newH },
        });
    }

    function handleSelectedObjectResizeInteraction_MouseUp(
        e: React.MouseEvent<HTMLCanvasElement>,
        interaction: React.RefObject<SelectedObjectResizeInteraction>
    ) {
        const latest = canvasContext.allObjects.get(
            interaction.current.objectId
        );
        if (latest) {
            commitObjectChanges([latest], undefined);
        }
    }

    function translateObject(
        obj: WorldObject,
        dx: number,
        dy: number
    ): WorldObject {
        switch (obj.type) {
            case "path":
            case "eraser-path":
                return {
                    ...obj,
                    points: obj.points.map((p) => ({
                        x: p.x + dx,
                        y: p.y + dy,
                    })),
                };
            case "line":
                return {
                    ...obj,
                    point1: { x: obj.point1.x + dx, y: obj.point1.y + dy },
                    point2: { x: obj.point2.x + dx, y: obj.point2.y + dy },
                };
            case "rect":
            case "ellipse":
                return {
                    ...obj,
                    position: {
                        x: obj.position.x + dx,
                        y: obj.position.y + dy,
                    },
                };
            case "text":
                return {
                    ...obj,
                    boxPosition: {
                        x: obj.boxPosition.x + dx,
                        y: obj.boxPosition.y + dy,
                    },
                };
            default:
                return obj;
        }
    }

    function handleSingleObjectSelected(object: WorldObject) {
        setSelectedObjectIds(new Set([object.id]));
    }

    // This is for shift clicking objects
    function handleAdditionalSingleObjectSelected(object: WorldObject) {
        setSelectedObjectIds((prev) => {
            const next = new Set(prev);
            // If already selected, deselect it
            if (next.has(object.id)) {
                next.delete(object.id);
            } else {
                next.add(object.id);
            }
            return next;
        });
    }

    function handleDeselectAllObjects() {
        setSelectedObjectIds(new Set());
    }

    return {
        handleMultipleObjectSelectionBoxInteraction_MouseMove,
        handleMultipleObjectSelectionBoxInteraction_MouseUp,
        handleSelectedObjectDragInteraction_MouseMove,
        handleSelectedObjectDragInteraction_MouseUp,
        handleSelectedObjectResizeInteraction_MouseMove,
        handleSelectedObjectResizeInteraction_MouseUp,
        handleSingleObjectSelected,
        handleAdditionalSingleObjectSelected,
        handleDeselectAllObjects,
        selectedObjectIds,
        multipleObjectSelectionBox,
    };
}
