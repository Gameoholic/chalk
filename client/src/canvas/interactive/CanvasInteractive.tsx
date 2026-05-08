import React, { useContext, useMemo, useState } from "react";
import useDimensions from "react-cool-dimensions";
import CanvasRenderer from "../renderer/CanvasRenderer";
import { WorldObject } from "../../types/canvas";
import { CanvasContext } from "../../types/context/CanvasContext";
import ObjectContextMenu from "./components/ObjectContextMenu";
import { useTextEditing } from "./hooks/useTextEditing";
import {
    ContextMenuState,
    useDrawingInteractions,
} from "./hooks/useDrawingInteractions";

interface CanvasInteractiveProps {
    onObjectsCommit: (
        updatedObjects?: WorldObject[],
        deletedObjectIds?: string[]
    ) => void;
    onCameraCommit: () => void;
}

function CanvasInteractive({
    onObjectsCommit,
    onCameraCommit,
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
    function commitChanges(
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
        onObjectsCommit(updatedObjects, deletedObjectIds);
    }

    function commitCamera() {
        onCameraCommit();
    }

    const {
        editingText,
        drawingTextBoxObjectId,
        setDrawingTextBoxObjectId,
        openTextEditor,
    } = useTextEditing(updateOrAddObject, commitChanges);

    const {
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        handleWheel,
        handleContextMenu,
        handleTouchStart,
        handleTouchMove,
        handleTouchEnd,
    } = useDrawingInteractions(
        updateOrAddObject,
        removeObject,
        commitChanges,
        commitCamera,
        openTextEditor,
        setDrawingTextBoxObjectId
    );

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
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
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
