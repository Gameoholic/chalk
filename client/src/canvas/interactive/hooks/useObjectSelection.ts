import React, { useContext, useEffect, useRef, useState } from "react";
import { MultipleObjectSelectionInteraction } from "./useMouseEvents";
import { CanvasContext } from "../../../types/context/CanvasContext";
import { Vec2, WorldObject } from "../../../types/canvas";
import { screenToWorld } from "../utils/canvasCoords";
import { findObjectsInArea, getBoundingBox } from "../utils/canvasHitTesting";

// interface useMultipleObjectSelectionProps {

// }

/**
 * Multiple object selection interactions
 */
export function useMultipleObjectSelection() {
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

    function handleMultipleObjectSelectionInteraction_MouseMove(
        e: React.MouseEvent<HTMLCanvasElement>,
        interaction: React.RefObject<MultipleObjectSelectionInteraction>
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

    function handleMultipleObjectSelectionInteraction_MouseUp(
        e: React.MouseEvent<HTMLCanvasElement>,
        interaction: React.RefObject<MultipleObjectSelectionInteraction>
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

    function handleSingleObjectSelected(object: WorldObject) {
        if (selectedObjectIds.has(object.id)) {
            // if already selected, deselect it
            setSelectedObjectIds(new Set());
        } else {
            setSelectedObjectIds(new Set([object.id]));
        }
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
        handleMultipleObjectSelectionInteraction_MouseMove,
        handleMultipleObjectSelectionInteraction_MouseUp,
        handleSingleObjectSelected,
        handleAdditionalSingleObjectSelected,
        handleDeselectAllObjects,
        selectedObjectIds,
        multipleObjectSelectionBox,
    };
}
