import React, { useContext, useMemo, useState } from "react";
import useDimensions from "react-cool-dimensions";
import CanvasRenderer from "../renderer/CanvasRenderer";
import { WorldObject } from "../../types/canvas";
import { CanvasContext } from "../../types/context/CanvasContext";
import ObjectContextMenu from "./components/ObjectContextMenu";
import { useTextEditing } from "./hooks/useTextEditing";
import { useDrawingInteractions } from "./hooks/useDrawingInteractions";
import {
    CameraDragInteraction,
    DrawingInteraction,
    useHandleMouseEvents,
} from "./hooks/useMouseEvents";

interface CanvasInteractiveProps {
    commitChanges: (
        updatedOrNewObjects?: WorldObject[],
        deletedObjectIds?: string[]
    ) => void;
    commitCamera: () => void;
}

/**
 * Handles all user interactions, mouse events, drawing.
 */
function CanvasInteractive({
    commitChanges,
    commitCamera,
}: CanvasInteractiveProps) {
    const canvasContext = useContext(CanvasContext);

    // Automatically set camera size to this component's MAX allocated size
    const { observe } = useDimensions({
        onResize: ({ observe, unobserve, width, height }) => {
            canvasContext.setLocalCamera((prev) => ({
                ...prev,
                size: { x: width, y: height },
            }));
            unobserve();
            observe();
        },
    });

    // Either add an entirely new object or update an existing one (based on its ID)
    function updateOrAddObject(object: WorldObject) {
        canvasContext.setLocalUnsavedObjects((prev) => [
            ...prev.filter((obj) => obj.id !== object.id),
            object,
        ]);
    }

    function removeObject(objectId: string) {
        // First, remove the object from the local objects (handles cases where the object was created, then immediately deleted before committing to server)
        canvasContext.setLocalUnsavedObjects((prev) =>
            prev.filter((obj) => obj.id !== objectId)
        );
        // Then prepare the object to be deleted
        canvasContext.setLocalDeletedObjectIds(
            (prev) => new Set([...prev, objectId])
        );
    }

    // User released left click so object should be committed to database
    function local_commitCahgnes(
        updatedObjects?: WorldObject[],
        deletedObjectIds?: string[]
    ) {
        if (
            (updatedObjects?.length === 0 && deletedObjectIds?.length === 0) ||
            (updatedObjects === undefined && deletedObjectIds === undefined)
        ) {
            console.warn(
                "Commit changes was called, but there are no changes to commit."
            );
        }
        // Explicitly tells CanvasEditor what to delete, bypassing state closure bugs caused by relying only on CanvasContext states
        commitChanges(updatedObjects, deletedObjectIds);
    }

    const {
        editingText,
        drawingTextBoxObjectId,
        setDrawingTextBoxObjectId,
        openTextEditor,
    } = useTextEditing(updateOrAddObject, local_commitCahgnes);

    const {
        handleDrawingInteraction_MouseMove,
        handleDrawingInteraction_MouseUp,
    } = useDrawingInteractions({
        updateObject: updateOrAddObject,
        removeObject,
        commitChanges,
        setDrawingTextBoxObjectId,
    });

    // Handle mouse events hook
    const {
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        handleWheel,
        handleContextMenu,
    } = useHandleMouseEvents({
        handleDrawingInteraction_MouseMove,
        handleDrawingInteraction_MouseUp,
        handleCameraDragInteraction_MouseMove,
        handleCameraDragInteraction_MouseUp,
        handleCamera_Wheel,
        handleEditObject,
    });

    function handleCameraDragInteraction_MouseMove(
        e: React.MouseEvent<HTMLCanvasElement>,
        interaction: React.RefObject<CameraDragInteraction>
    ) {
        const dx =
            (e.clientX - interaction.current.lastMousePos.x) /
            canvasContext.local_camera.zoom;
        const dy =
            (e.clientY - interaction.current.lastMousePos.y) /
            canvasContext.local_camera.zoom;

        canvasContext.setLocalCamera((prev) => ({
            ...prev,
            position: {
                x: prev.position.x - dx,
                y: prev.position.y - dy,
            },
        }));

        interaction.current.lastMousePos = {
            x: e.clientX,
            y: e.clientY,
        };
    }
    function handleCameraDragInteraction_MouseUp(
        e: React.MouseEvent<HTMLCanvasElement>,
        interaction: React.RefObject<CameraDragInteraction>
    ) {
        commitCamera();
    }

    function handleCamera_Wheel(e: React.WheelEvent<HTMLCanvasElement>) {
        e.preventDefault();
        const zoomFactor = 1.1;
        const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const newZoom =
            e.deltaY < 0
                ? canvasContext.local_camera.zoom * zoomFactor
                : canvasContext.local_camera.zoom / zoomFactor;
        const clampedZoom = Math.max(0.01, Math.min(1000, newZoom));

        const worldX =
            canvasContext.local_camera.position.x +
            mouseX / canvasContext.local_camera.zoom;
        const worldY =
            canvasContext.local_camera.position.y +
            mouseY / canvasContext.local_camera.zoom;

        canvasContext.setLocalCamera({
            ...canvasContext.local_camera,
            zoom: clampedZoom,
            position: {
                x: worldX - mouseX / clampedZoom,
                y: worldY - mouseY / clampedZoom,
            },
        });
        commitCamera();
    }

    function handleEditObject(object: WorldObject) {}

    // Server-synced objects and local unsaved objects and locally deleted objects, render all
    const allObjects = useMemo(() => {
        const map = new Map<string, WorldObject>();
        canvasContext
            .getCurrentBoard()
            .objects.forEach((obj) => map.set(obj.id, obj));
        canvasContext.local_unsavedObjects.forEach((obj) =>
            map.set(obj.id, obj)
        );
        canvasContext.local_deletedObjectIds.forEach((id) => map.delete(id));
        return map;
    }, [
        canvasContext.getCurrentBoard().objects,
        canvasContext.local_unsavedObjects,
        canvasContext.local_deletedObjectIds,
    ]);

    return (
        <div ref={observe} className="h-full w-full touch-none">
            <CanvasRenderer
                camera={canvasContext.local_camera}
                objects={allObjects}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onWheel={handleWheel}
                onContextMenu={handleContextMenu}
                textCursor={
                    editingText
                        ? {
                              objectId: editingText.object.id,
                              index: editingText.object.text.length,
                              visible: editingText.cursorVisible,
                          }
                        : undefined
                }
                drawingTextBoxObjectId={drawingTextBoxObjectId}
            />

            {/* {contextMenu && (
                <ObjectContextMenu
                    object={contextMenu.object}
                    screenX={contextMenu.screenX}
                    screenY={contextMenu.screenY}
                    onUpdate={(updated) => {
                        updateOrAddObject(updated);
                        commitChanges([updated], undefined);
                    }}
                    onDelete={() => {
                        removeObject(contextMenu.object.id);
                        commitChanges(undefined, [contextMenu.object.id]);
                        setContextMenu(null);
                    }}
                    onClose={() => setContextMenu(null)}
                />
            )} */}
        </div>
    );
}

export default CanvasInteractive;
