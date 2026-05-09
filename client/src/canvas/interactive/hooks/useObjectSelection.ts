import React, { useContext, useEffect, useRef, useState } from "react";
import { MultipleObjectSelectionInteraction } from "./useMouseEvents";
import { CanvasContext } from "../../../types/context/CanvasContext";
import { Vec2, WorldObject } from "../../../types/canvas";
import { screenToWorld } from "../utils/canvasCoords";
import { getBoundingBox } from "../utils/canvasHitTesting";

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

        // GET ALL OBJECTS INSIDE THE SELECTION BOX
        const minX = Math.min(
            interaction.current.boxStart.x,
            interaction.current.boxEnd.x
        );
        const minY = Math.min(
            interaction.current.boxStart.y,
            interaction.current.boxEnd.y
        );
        const maxX = Math.max(
            interaction.current.boxStart.x,
            interaction.current.boxEnd.x
        );
        const maxY = Math.max(
            interaction.current.boxStart.y,
            interaction.current.boxEnd.y
        );

        const allObjects = [
            ...canvasContext.getCurrentBoard().objects,
            ...canvasContext.local_unsavedObjects,
        ]; // hikakin todo fix - we should have more centralized way of getting all UPDATED object states...

        const ids = new Set<string>(
            allObjects
                .filter((obj) => {
                    const bb = getBoundingBox(obj);
                    if (!bb) return false;
                    // Check if bounding boxes overlap
                    return (
                        bb.min.x <= maxX &&
                        bb.max.x >= minX &&
                        bb.min.y <= maxY &&
                        bb.max.y >= minY
                    );
                })
                .map((obj) => obj.id)
        );

        // select all objects including the already selected ones
        setSelectedObjectIds((prev) => new Set([...prev, ...ids]));
    }

    function handleSingleObjectSelected(object: WorldObject) {
        setSelectedObjectIds(new Set([object.id]));
    }

    function handleAdditionalSingleObjectSelected(object: WorldObject) {
        setSelectedObjectIds((prev) => new Set([...prev, object.id]));
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
