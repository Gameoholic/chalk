import React, { useContext, useEffect, useMemo, useState } from "react";
import useDimensions from "react-cool-dimensions";
import CanvasRenderer from "../renderer/CanvasRenderer";
import { TextObject, WorldObject } from "../../types/canvas";
import { CanvasContext } from "../../types/context/CanvasContext";
import { useTextEditing } from "./hooks/useTextEditing";
import { useDrawing } from "./hooks/useDrawing";
import {
    CameraDragInteraction,
    DrawingInteraction,
    useMouseEvents,
} from "./hooks/useMouseEvents";
import { useCamera } from "./hooks/useCamera";
import { useObjectSelection } from "./hooks/useObjectSelection";
import { EditObjectToolbar } from "./components/EditObjectToolbar";

interface CanvasInteractiveProps {
    commitObjectChanges: (
        updatedOrNewObjects?: WorldObject[],
        deletedObjectIds?: string[]
    ) => void;
    commitCamera: () => void;
}

/**
 * Handles all user interactions, mouse events, drawing.
 */
function CanvasInteractive({
    commitObjectChanges,
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
    function _commitObjectChanges(
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
        commitObjectChanges(updatedObjects, deletedObjectIds);
    }

    // drawingTextBoxObjectId tracks the textbox being drag-created, cleared once drawing finishes and object becomes selected
    const [drawingTextBoxObjectId, setDrawingTextBoxObjectId] = useState<
        string | null
    >(null);

    // Handle object selection hook
    const {
        handleMultipleObjectSelectionBoxInteraction_MouseMove,
        handleMultipleObjectSelectionBoxInteraction_MouseUp,
        handleSelectedObjectDragInteraction_MouseMove,
        handleSelectedObjectDragInteraction_MouseUp,
        handleSelectedObjectResizeInteraction_MouseMove,
        handleSelectedObjectResizeInteraction_MouseUp,
        selectedObjectIds,
        multipleObjectSelectionBox,
        handleSingleObjectSelected,
        handleAdditionalSingleObjectSelected,
        handleDeselectAllObjects,
    } = useObjectSelection({
        updateOrAddObject,
        commitObjectChanges: _commitObjectChanges,
    });

    const selectedObjects = useMemo(
        () =>
            [...selectedObjectIds]
                .map((id) => canvasContext.allObjects.get(id))
                .filter(Boolean) as WorldObject[],
        [selectedObjectIds, canvasContext.allObjects]
    );

    // Explicit editing state — only set on double-click (or after drawing a new text box).
    // A selected text object can be moved/resized without entering editing mode.
    const [editingTextObjectId, setEditingTextObjectId] = useState<string | null>(null);
    const [textEntryWorldPos, setTextEntryWorldPos] = useState<{ x: number; y: number } | null>(null);

    // Exit editing mode if the editing object is no longer selected
    useEffect(() => {
        if (editingTextObjectId && !selectedObjectIds.has(editingTextObjectId)) {
            setEditingTextObjectId(null);
        }
    }, [selectedObjectIds]);

    const editingTextObject = useMemo<TextObject | null>(() => {
        if (!editingTextObjectId) return null;
        const obj = canvasContext.allObjects.get(editingTextObjectId);
        return obj?.type === "text" ? (obj as TextObject) : null;
    }, [editingTextObjectId, canvasContext.allObjects]);

    // Handle text editing
    const {
        cursorVisible,
        cursorIndex,
        selectionAnchor,
        handleTextMouseDown,
        handleTextMouseMove,
    } = useTextEditing({
        editingTextObject,
        entryWorldPos: textEntryWorldPos,
        updateOrAddObject,
        removeObject,
        commitChanges: _commitObjectChanges,
        deselectAllObjects: handleDeselectAllObjects,
    });

    // Handle drawing interactions hook
    const {
        handleDrawingInteraction_MouseMove,
        handleDrawingInteraction_MouseUp,
    } = useDrawing({
        updateOrAddObject,
        removeObject,
        commitObjectChanges: _commitObjectChanges,
        setDrawingTextBoxObjectId,
        selectTextObjectForEditing: (object) => {
            handleSingleObjectSelected(object);
            setDrawingTextBoxObjectId(null);
            setTextEntryWorldPos(null);
            setEditingTextObjectId(object.id);
        },
    });

    // Handle camera drag interactions hook
    const {
        handleCameraDragInteraction_MouseMove,
        handleCameraDragInteraction_MouseUp,
        handleCamera_Wheel,
    } = useCamera({
        commitCamera,
    });

    // Handle mouse events hook - main method which will handle the interactions from before
    const {
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        handleWheel,
        handleContextMenu,
        handleDoubleClick,
        // what to display as the cursor mouse (resize text object corners)
        cursor,
    } = useMouseEvents({
        handleDrawingInteraction_MouseMove,
        handleDrawingInteraction_MouseUp,
        handleCameraDragInteraction_MouseMove,
        handleCameraDragInteraction_MouseUp,
        handleCamera_Wheel,
        handleSingleObjectSelected,
        handleAdditionalSingleObjectSelected,
        handleDeselectAllObjects,
        handleMultipleObjectSelectionBoxInteraction_MouseMove,
        handleMultipleObjectSelectionBoxInteraction_MouseUp,
        handleSelectedObjectDragInteraction_MouseMove,
        handleSelectedObjectDragInteraction_MouseUp,
        handleSelectedObjectResizeInteraction_MouseMove,
        handleSelectedObjectResizeInteraction_MouseUp,
        selectedObjectIds,
        selectedObjects,
        editingTextObjectId: editingTextObject?.id ?? null,
        onTextCursorMouseDown: handleTextMouseDown,
        onTextCursorMouseMove: handleTextMouseMove,
        onTextObjectDoubleClick: (id, worldPos) => {
            setTextEntryWorldPos(worldPos);
            setEditingTextObjectId(id);
        },
    });

    return (
        <div ref={observe} className="h-full w-full touch-none">
            <CanvasRenderer
                camera={canvasContext.local_camera}
                objects={canvasContext.allObjects}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onWheel={handleWheel}
                onContextMenu={handleContextMenu}
                onDoubleClick={handleDoubleClick}
                textCursor={
                    editingTextObject
                        ? {
                              objectId: editingTextObject.id,
                              index: cursorIndex,
                              visible: cursorVisible,
                              selectionStart:
                                  selectionAnchor !== null
                                      ? Math.min(selectionAnchor, cursorIndex)
                                      : undefined,
                              selectionEnd:
                                  selectionAnchor !== null
                                      ? Math.max(selectionAnchor, cursorIndex)
                                      : undefined,
                          }
                        : undefined
                }
                drawingTextBoxObjectId={drawingTextBoxObjectId}
                multipleObjectSelectionBox={multipleObjectSelectionBox}
                selectedObjectIds={selectedObjectIds}
                cursor={cursor}
            />

            {selectedObjects.length > 0 && (
                <EditObjectToolbar
                    selectedObjects={selectedObjects}
                    camera={canvasContext.local_camera}
                    onUpdate={(updated) => {
                        updated.forEach(updateOrAddObject);
                        _commitObjectChanges(updated, undefined);
                    }}
                    onDelete={(ids) => {
                        ids.forEach(removeObject);
                        _commitObjectChanges(undefined, ids);
                        handleDeselectAllObjects();
                    }}
                />
            )}
        </div>
    );
}

export default CanvasInteractive;
