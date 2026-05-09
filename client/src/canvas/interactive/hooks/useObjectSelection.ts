import React, { useContext, useEffect, useRef, useState } from "react";
import {
    MultipleObjectSelectionBoxInteraction,
    SelectedObjectDragInteraction,
} from "./useMouseEvents";
import { CanvasContext } from "../../../types/context/CanvasContext";
import { Vec2, WorldObject } from "../../../types/canvas";
import { screenToWorld } from "../utils/canvasCoords";
import { findObjectsInArea, getBoundingBox } from "../utils/canvasHitTesting";

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
    const camera = canvasContext.local_camera;

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

        const allObjects = [
            ...canvasContext.getCurrentBoard().objects,
            ...canvasContext.local_unsavedObjects,
        ]; // hikakin todo fix - we should have more centralized way of getting all UPDATED object states...

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
        handleSingleObjectSelected,
        handleAdditionalSingleObjectSelected,
        handleDeselectAllObjects,
        selectedObjectIds,
        multipleObjectSelectionBox,
    };
}
