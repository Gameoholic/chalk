import { RefObject, useContext, useEffect, useRef, useState } from "react";
import isDeepEqual from "fast-deep-equal";
import {
    deleteBoard,
    deleteBoardObjects,
    resetBoard,
    updateBoardCamera,
    upsertBoardObjects,
} from "../../../api/boards";
import { Vec2, WorldObject } from "../../../types/canvas";
import { CanvasContext } from "../../../types/context/CanvasContext";
import { env } from "../../../env";
import { pushBoardChangesToServer } from "../utils/saveBoardToServer";

export function useSaveBoard(
    openMyBoards: () => void,
    onTourCameraMoved: (() => void) | undefined
) {
    // ================================================
    // LOCAL VARIABLES, STATE AND DATA
    // ================================================
    const canvasContext = useContext(CanvasContext);
    // Use this whenever after we run code async, otherwise we get stale closure
    const canvasContextRef = useRef(canvasContext);
    useEffect(() => {
        canvasContextRef.current = canvasContext;
    });

    // All changes to the board that are pending to be saved on the database
    const changes = useRef({
        // Objects to "SET" (upsert) on the database - overriding previous changes if they existed (objects mapped to their id's)
        objectUpsert: new Map<string, WorldObject>(),
        // Ids of objects to delete
        objectDelete: new Set<string>(),
        camera: null as { position: Vec2; zoom: number } | null,
    });

    // Changes currently being pushed to server
    const pendingChanges = useRef({
        objectUpsert: new Map<string, WorldObject>(),
        objectDelete: new Set<string>(),
        camera: null as { position: Vec2; zoom: number } | null,
    });

    const cooldownTimerRef = useRef<number | null>(null);
    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (cooldownTimerRef.current)
                clearTimeout(cooldownTimerRef.current);
        };
    }, []);

    // ================================================
    // END LOCAL VARIABLES, STATE AND DATA
    // ================================================

    // ================================================
    // LOCAL METHODS, LOGIC AND HELPERS
    // ================================================
    function tryToPushChanges() {
        console.log("Trying to push changes...");
        if (!areThereChangesToPush()) {
            console.warn("No changes to push.");
            return;
        }

        if (areTherePendingChanges()) {
            console.warn("Waiting on pending requests to complete.");
            return;
        }

        if (waitingOnCooldownTimer()) {
            console.warn("Waiting on cooldown timer.");
            return;
        }

        pushChanges();
    }

    function requestForceSaveBoardNow() {
        // Cancel current cooldown timer
        if (cooldownTimerRef.current !== null) {
            clearTimeout(cooldownTimerRef.current);
            cooldownTimerRef.current = null;
        }

        tryToPushChanges();
    }

    async function pushChanges() {
        pendingChanges.current = {
            objectUpsert: new Map(changes.current.objectUpsert),
            objectDelete: new Set(changes.current.objectDelete),
            camera: changes.current.camera,
        };

        clearChanges();

        startCooldown();

        console.log(
            `Pushing changes: ${pendingChanges.current.objectUpsert.size} upserts, ${pendingChanges.current.objectDelete.size} deletes, camera: ${pendingChanges.current.camera !== null}`
        );

        try {
            await pushBoardChangesToServer(
                canvasContext.local_currentBoardId,
                pendingChanges.current
            );

            console.log("Successfully pushed changes.");

            if (pendingChanges.current.objectUpsert.size > 0) {
                canvasContextRef.current.commitSavedObjects(
                    Array.from(pendingChanges.current.objectUpsert.values())
                );
            }
            if (pendingChanges.current.objectDelete.size > 0) {
                canvasContextRef.current.commitDeletedObjects(
                    pendingChanges.current.objectDelete
                );
            }
            if (pendingChanges.current.camera) {
                canvasContextRef.current.commitSavedCamera(
                    pendingChanges.current.camera.position,
                    pendingChanges.current.camera.zoom
                );
            }

            clearPendingChanges();
        } catch (err) {
            console.error("Failed to push changes!", err);
        }
    }

    // Future note on why we use so many utility functions:
    // Answer: These little snippets and make the code less readable
    // For complex code like this, it was hard to read before, even if the logic was simple

    function clearChanges() {
        changes.current.objectUpsert.clear();
        changes.current.objectDelete.clear();
        changes.current.camera = null;
    }

    function clearPendingChanges() {
        pendingChanges.current.objectUpsert.clear();
        pendingChanges.current.objectDelete.clear();
        pendingChanges.current.camera = null;
    }

    function areThereChangesToPush() {
        return (
            changes.current.objectUpsert.size > 0 ||
            changes.current.camera !== null ||
            changes.current.objectDelete.size > 0
        );
    }

    function areTherePendingChanges() {
        return (
            pendingChanges.current.objectUpsert.size > 0 ||
            pendingChanges.current.camera !== null ||
            pendingChanges.current.objectDelete.size > 0
        );
    }

    function waitingOnCooldownTimer() {
        return cooldownTimerRef.current !== null;
    }

    function startCooldown() {
        if (waitingOnCooldownTimer()) {
            return;
        }

        if (env.VITE_SAVE_REQUEST_COOLDOWN > 0) {
            cooldownTimerRef.current = window.setTimeout(() => {
                console.log("Cooldown finished.");
                cooldownTimerRef.current = null;
                tryToPushChanges();
            }, env.VITE_SAVE_REQUEST_COOLDOWN);
        }
    }

    // ================================================
    // END LOCAL METHODS, LOGIC AND HELPERS
    // ================================================

    // ================================================
    // PUBLIC API — these are the only exported methods
    // ================================================
    function requestAddObjects(objects: WorldObject[]) {
        objects.forEach((obj) => {
            changes.current.objectUpsert.set(obj.id, obj);
            // Sanity check - if the object was marked for deletion somehow first, stop it from being deleted.
            if (changes.current.objectDelete.has(obj.id)) {
                changes.current.objectDelete.delete(obj.id);
            }
        });
        tryToPushChanges();
    }

    function requestEditObjects(objects: WorldObject[]) {
        // same logic as add objects, only exists as an alias for readability purposes
        requestAddObjects(objects);
    }

    function requestDeleteObjects(objectIds: string[]) {
        objectIds.forEach((id) => {
            changes.current.objectUpsert.delete(id);
            changes.current.objectDelete.add(id);
        });
        tryToPushChanges();
    }

    function requestUpdateCamera(position: Vec2, zoom: number) {
        changes.current.camera = { position, zoom };
        tryToPushChanges();
    }
    // ================================================
    // END PUBLIC API
    // ================================================

    // Used if a save operation is currently undergoing and user asked to go my boards
    const [queued_navigateToMyBoards, setQueued_navigateToMyBoards] =
        useState(false);
    useEffect(() => {
        if (queued_navigateToMyBoards && !hasPendingSaveOperations()) {
            openMyBoards();
            setQueued_navigateToMyBoards(false);
        }
    }, [canvasContext.local_unsavedObjects]);

    // Used if a save operation is currently undergoing and user requested to reset board
    const [queued_resetBoard, setQueued_ResetBoard] = useState(false);
    useEffect(() => {
        if (queued_resetBoard && !hasPendingSaveOperations()) {
            handleResetBoard();
            setQueued_ResetBoard(false);
        }
    }, [canvasContext.local_unsavedObjects]);

    // Used if a save operation is currently undergoing and user requested to reset board
    const [queued_deleteBoard, setQueued_deleteBoard] = useState(false);
    useEffect(() => {
        if (queued_deleteBoard && !hasPendingSaveOperations()) {
            handleDeleteBoard();
            setQueued_deleteBoard(false);
        }
    }, [canvasContext.local_unsavedObjects]);

    // // Saving objects
    // // Objects that are currently being saved (mid-fetch request)
    // const objectsBeingSavedOnDatabase: RefObject<WorldObject[]> = useRef([]);
    // // Objects that are currently being deleted (mid-fetch request)
    // const objectsBeingDeletedOnDatabase = useRef<Set<string>>(new Set());
    // // Error data if couldn't save board
    const [saveObjectsError, setSaveObjectsError] = useState<
        | { error: null }
        | {
              error: string;
              retryCooldownSecondsOrStatus: "retrying" | number;
              lastRetryCooldown: number;
          }
    >({ error: null });

    // // Fix for state closure
    // const saveObjectsErrorRef = useRef(saveObjectsError);
    // useEffect(() => {
    //     saveObjectsErrorRef.current = saveObjectsError;
    // }, [saveObjectsError]);

    // // COOLDOWN FOR SAVING BOARD OBJECTS (CLIENT SIDE "RATE LIMITING")
    // const saveCooldownTimeoutRef = useRef<number | null>(null);
    // const saveObjectsRequestOnCooldown = useRef(false);

    // const startCooldownTimeout = (forceTimeoutNow = false) => {
    //     // If we need to force the timeout to happen now (such as when going to my boards or reseting/deleting board)
    //     if (forceTimeoutNow) {
    //         saveObjectsRequestOnCooldown.current = false;
    //         requestSaveObjectsOnDatabaseFunction.current(); // Use the ref to avoid stale closure
    //         saveObjectsRequestOnCooldown.current = true;
    //         return;
    //     }
    //     if (env.VITE_SAVE_REQUEST_COOLDOWN === 0) {
    //         // If we don't want a cooldown timer, immediately execute the save
    //         if (
    //             saveObjectsErrorRef.current.error === null && // Use the ref to avoid stale closure
    //             objectsBeingSavedOnDatabase.current.length === 0 &&
    //             (objectsToSaveOnDatabase.current.size > 0 ||
    //                 wasCameraUpdatedSinceLastSave())
    //         ) {
    //             console.log(
    //                 "Requesting to save " +
    //                     objectsToSaveOnDatabase.current.size +
    //                     " objects on database (request likely originated because objects accumulated during a prior save)."
    //             );
    //             requestSaveObjectsOnDatabaseFunction.current(); // Use the ref to avoid stale closure
    //         }
    //         return;
    //     }

    //     if (saveCooldownTimeoutRef.current !== null) {
    //         return;
    //     }

    //     saveCooldownTimeoutRef.current = window.setTimeout(() => {
    //         saveCooldownTimeoutRef.current = null;
    //         saveObjectsRequestOnCooldown.current = false;

    //         // In case we have objects that are waiting to be saved (previously failed because of our cooldown), try to save now
    //         if (
    //             saveObjectsErrorRef.current.error === null && // Use the ref to avoid stale closure
    //             objectsBeingSavedOnDatabase.current.length === 0 &&
    //             objectsBeingDeletedOnDatabase.current.size === 0 &&
    //             (objectsToSaveOnDatabase.current.size > 0 ||
    //                 objectsToDeleteOnDatabase.current.size > 0 ||
    //                 wasCameraUpdatedSinceLastSave())
    //         ) {
    //             console.log(
    //                 "Cooldown expired! Requesting to save " +
    //                     objectsToSaveOnDatabase.current.size +
    //                     " objects and delete " +
    //                     objectsToDeleteOnDatabase.current.size +
    //                     " objects on database."
    //             );
    //             requestSaveObjectsOnDatabaseFunction.current(); // Use the ref to avoid stale closure
    //         }
    //     }, env.VITE_SAVE_REQUEST_COOLDOWN);
    // };
    // // Cleanup on unmount
    // useEffect(() => {
    //     return () => {
    //         if (saveCooldownTimeoutRef.current)
    //             clearTimeout(saveCooldownTimeoutRef.current);
    //     };
    // }, []);

    // // When objects are ready to be saved to database (user released left click, for example).
    // // Generally, only one object will be in objectsBeingUpdatedButNotReadyForSaving when this method is called,
    // // but our code should be able to support cases where there's multiple objects at once.
    // function requestCommitObjectChanges(
    //     updatedObjects?: WorldObject[],
    //     deletedObjectIds?: string[]
    // ) {
    //     console.log(
    //         "Commit: Requesting to save " +
    //             (canvasContext.local_unsavedObjects.length -
    //                 objectsBeingSavedOnDatabase.current.length) +
    //             " objects and delete " +
    //             (canvasContext.local_deletedObjectIds.size -
    //                 objectsBeingDeletedOnDatabase.current.size) +
    //             " objects to database."
    //     );

    //     // As soon as objects start saving - objectsToSaveOnDatabase becomes irrelevant, it'll get overwritten when it finished saving. So this is ok even if this line executes mid-save.
    //     updatedObjects?.forEach((object) => {
    //         objectsToSaveOnDatabase.current.set(object.id, object);
    //     });

    //     deletedObjectIds?.forEach((objectId) => {
    //         objectsToDeleteOnDatabase.current.add(objectId);
    //     });
    //     requestSaveBoard();
    // }

    // // When camera is ready to be saved to database (camera finished dragging or zoom changed).
    // function requestCommitCamera() {
    //     console.log("Requesting to commit camera state to database.");

    //     if (onTourCameraMoved) {
    //         onTourCameraMoved();
    //     }

    //     requestSaveBoard();
    // }

    // // Avoid stale closure in timer effect hooks
    // const requestSaveObjectsOnDatabaseFunction = useRef(requestSaveBoard);
    // // Keep the ref constantly updated on every single render
    // useEffect(() => {
    //     requestSaveObjectsOnDatabaseFunction.current = requestSaveBoard;
    // });

    // // Objects that are ready to be saved on the database
    // const objectsToSaveOnDatabase: RefObject<Map<string, WorldObject>> = useRef(
    //     new Map()
    // );
    // // Object ids that are ready to be deleted on the database
    // const objectsToDeleteOnDatabase: RefObject<Set<string>> = useRef(new Set());

    // function wasCameraUpdatedSinceLastSave() {
    //     const cameraPosOnClient =
    //         canvasContextRef.current.local_camera.position;
    //     const cameraZoomOnClient = canvasContextRef.current.local_camera.zoom;
    //     return (
    //         cameraPosOnClient.x !==
    //             canvasContextRef.current.getCurrentBoard().lastCameraPosition
    //                 .x ||
    //         cameraPosOnClient.y !==
    //             canvasContextRef.current.getCurrentBoard().lastCameraPosition
    //                 .y ||
    //         cameraZoomOnClient !==
    //             canvasContextRef.current.getCurrentBoard().lastCameraZoom
    //     );
    // }

    // // Main method to save the board on database
    // async function requestSaveBoard(asErrorRetry: boolean = false) {
    //     // Sanity check.
    //     const saveObjects = objectsToSaveOnDatabase.current.size > 0;
    //     const deleteObjects = objectsToDeleteOnDatabase.current.size > 0;
    //     const saveCamera = wasCameraUpdatedSinceLastSave();
    //     if (!saveObjects && !saveCamera && !deleteObjects) {
    //         console.warn(
    //             "Request to save objects+camera ignored because object save/delete length is 0 and camera hasn't updated since last save."
    //         );
    //         return;
    //     }

    //     if (saveObjectsErrorRef.current.error && !asErrorRetry) {
    //         console.warn(
    //             "Request to save/delete objects+camera (length " +
    //                 (objectsToSaveOnDatabase.current.size +
    //                     objectsToDeleteOnDatabase.current.size) +
    //                 ") ignored because waiting for error retry."
    //         );
    //         return;
    //     }

    //     // todo: um what about if it's just a camera request? why dont we check that too?
    //     // todo
    //     //to do/
    //     // todo
    //     if (
    //         objectsBeingSavedOnDatabase.current.length > 0 ||
    //         objectsBeingDeletedOnDatabase.current.size > 0
    //     ) {
    //         console.warn(
    //             "Request to save objects+camera (length " +
    //                 (canvasContext.local_unsavedObjects.length -
    //                     objectsBeingSavedOnDatabase.current.length) +
    //                 ") ignored because waiting on existing request."
    //         );
    //         return;
    //     }

    //     if (saveObjectsRequestOnCooldown.current && !asErrorRetry) {
    //         console.warn(
    //             "Request to save objects+camera (length " +
    //                 objectsToSaveOnDatabase.current.size +
    //                 ") ignored because waiting for cooldown to expire."
    //         );
    //         return;
    //     }

    //     objectsBeingSavedOnDatabase.current = Array.from(
    //         objectsToSaveOnDatabase.current.values()
    //     );
    //     objectsBeingDeletedOnDatabase.current = new Set(
    //         objectsToDeleteOnDatabase.current
    //     );

    //     if (saveObjects) {
    //         console.log(
    //             "Saving " +
    //                 objectsBeingSavedOnDatabase.current.length +
    //                 " board objects on database."
    //         );
    //     }
    //     if (deleteObjects) {
    //         console.log(
    //             "Deleting " +
    //                 objectsBeingDeletedOnDatabase.current.size +
    //                 " board objects on database."
    //         );
    //     }
    //     if (saveCamera) {
    //         console.log("Saving camera properties on database.");
    //     }

    //     if (env.VITE_SAVE_REQUEST_COOLDOWN > 0) {
    //         saveObjectsRequestOnCooldown.current = true;
    //         startCooldownTimeout();
    //     }

    //     const cameraPosOnClient =
    //         canvasContextRef.current.local_camera.position;
    //     const cameraZoomOnClient = canvasContextRef.current.local_camera.zoom;
    //     try {
    //         const savesToExecute: Promise<void>[] = [];

    //         if (saveCamera) {
    //             savesToExecute.push(
    //                 updateBoardCamera(
    //                     canvasContext.getCurrentBoard().id,
    //                     cameraPosOnClient,
    //                     cameraZoomOnClient
    //                 )
    //             );
    //         }

    //         if (saveObjects) {
    //             savesToExecute.push(
    //                 upsertBoardObjects(
    //                     canvasContext.local_currentBoardId,
    //                     objectsBeingSavedOnDatabase.current
    //                 )
    //             );
    //         }

    //         await Promise.all(savesToExecute);
    //         // Todo: For now I'm hesitant to put this along with the Promise.all() because I want to avoid a situation where
    //         // an object was added/modified and also deleted in the same save operation, and then server-side it's deleted first and then re-created
    //         // I'm not sure if this can happen, probably not, if I'm 100% that not then we can put this along with the Promise.all above
    //         if (deleteObjects) {
    //             await deleteBoardObjects(
    //                 canvasContext.local_currentBoardId,
    //                 objectsBeingDeletedOnDatabase.current
    //             );
    //         }
    //     } catch (err) {
    //         console.error("Failure to save the objects+camera!");

    //         objectsBeingSavedOnDatabase.current = [];
    //         objectsBeingDeletedOnDatabase.current = new Set();
    //         setSaveObjectsError((prev) => {
    //             const accumulatedCooldown = prev.error
    //                 ? prev.lastRetryCooldown
    //                 : 0; // Add delay from previous attempts
    //             const updatedCooldown =
    //                 accumulatedCooldown + env.VITE_SAVE_RETRY_COOLDOWN;
    //             const finalCooldown =
    //                 env.VITE_SAVE_RETRY_MAX_COOLDOWN === 0 // If max cooldown is 0, we ignore it
    //                     ? updatedCooldown
    //                     : Math.min(
    //                           updatedCooldown,
    //                           env.VITE_SAVE_RETRY_MAX_COOLDOWN
    //                       );
    //             return {
    //                 error: "Failed to save changes. Your work is out of sync.",
    //                 retryCooldownSecondsOrStatus: finalCooldown,
    //                 lastRetryCooldown: finalCooldown,
    //             };
    //         });
    //         return;
    //     }

    //     console.log("Successfully saved the objects+camera.");

    //     setSaveObjectsError({ error: null });
    //     // Iterate over all objects we saved, remove them from localUnsavedObjects, UNLESS they were modified since the save started (unlikely but possible)
    //     // Since this is all happening after an await asynchrounsly, the context is stale, so we use the ref to read it here
    //     const remainingUnsavedObjects =
    //         canvasContextRef.current.local_unsavedObjects.filter(
    //             (objectLocal) => {
    //                 const savedVersion =
    //                     objectsBeingSavedOnDatabase.current.find(
    //                         (s) => s.id === objectLocal.id
    //                     );

    //                 // If it wasn't in the save batch, keep it.
    //                 if (!savedVersion) return true;

    //                 // If it WAS in the batch, check if it has changed since then.
    //                 // If isDeepEqual is true, they are identical -> Return false, removes it.
    //                 // If isDeepEqual is false, the user modified it mid-save -> Return true, keeps it.
    //                 return !isDeepEqual(objectLocal, savedVersion);
    //             }
    //         );
    //     // Update the server-synced context properties
    //     canvasContextRef.current.onCurrentBoardSaved(
    //         // we do this so if the object was saved but modified stays then, it stays only in localunsavedobjects and not in both buffers
    //         objectsBeingSavedOnDatabase.current.filter(
    //             (x) => !remainingUnsavedObjects.includes(x)
    //         ),
    //         objectsBeingDeletedOnDatabase.current,
    //         cameraPosOnClient,
    //         cameraZoomOnClient
    //     );

    //     canvasContextRef.current.setLocalUnsavedObjects(
    //         remainingUnsavedObjects
    //     );
    //     const remainingUndeletedObjectIds = new Set(
    //         [...canvasContext.local_deletedObjectIds].filter(
    //             (id) => !objectsBeingDeletedOnDatabase.current.has(id)
    //         )
    //     );
    //     canvasContextRef.current.setLocalDeletedObjectIds(
    //         remainingUndeletedObjectIds
    //     );

    //     objectsBeingSavedOnDatabase.current = [];
    //     objectsBeingDeletedOnDatabase.current = new Set();

    //     objectsToSaveOnDatabase.current = new Map();
    //     remainingUnsavedObjects.forEach((object) => {
    //         objectsToSaveOnDatabase.current.set(object.id, object);
    //     });
    //     objectsToDeleteOnDatabase.current = remainingUndeletedObjectIds;

    //     // Save any objects that were piling up as this request was processed
    //     if (objectsToSaveOnDatabase.current.size > 0) {
    //         console.log(
    //             objectsToSaveOnDatabase.current.size +
    //                 " objects accumulated while processing the request. Attempting to save them once cooldown expires."
    //         );
    //         console.log(
    //             objectsToDeleteOnDatabase.current.size +
    //                 " object deletions accumulated while processing the request. Attempting to save them once cooldown expires."
    //         );
    //         startCooldownTimeout();
    //     }

    //     // Save camera again if it changed while this request was being processed
    //     if (
    //         canvasContextRef.current.local_camera.position.x !==
    //             cameraPosOnClient.x ||
    //         canvasContextRef.current.local_camera.position.y !==
    //             cameraPosOnClient.y ||
    //         canvasContextRef.current.local_camera.zoom !== cameraZoomOnClient
    //     ) {
    //         console.log(
    //             "Camera properties updated while processing the request. Attempting to save once cooldown expires."
    //         );
    //         startCooldownTimeout();
    //     }
    // }

    // // Handle object save error retry
    // useEffect(() => {
    //     if (!saveObjectsError.error) return;

    //     const secondsLeft = saveObjectsError.retryCooldownSecondsOrStatus;
    //     if (secondsLeft === "retrying") return;

    //     // If we've hit 0, trigger the retry
    //     if (secondsLeft <= 0) {
    //         setSaveObjectsError((prev) => ({
    //             ...prev,
    //             retryCooldownSecondsOrStatus: "retrying",
    //         }));
    //         console.log("Retrying to save objects.");
    //         requestSaveObjectsOnDatabaseFunction.current(true);
    //         return;
    //     }

    //     // If we are actively counting down, tick down by 1 every second
    //     const timer = setTimeout(() => {
    //         setSaveObjectsError((prev) => {
    //             if (
    //                 prev.error === null ||
    //                 prev.retryCooldownSecondsOrStatus === "retrying"
    //             )
    //                 return prev;

    //             return {
    //                 ...prev,
    //                 retryCooldownSecondsOrStatus:
    //                     prev.retryCooldownSecondsOrStatus - 1,
    //             };
    //         });
    //     }, 1000);

    //     return () => clearTimeout(timer);
    // }, [saveObjectsError]);

    const handleResetBoard = async () => {
        // if (hasPendingSaveOperations()) {
        //     // Will quicken the ongoing save processes and reset the board as soon as save is done
        //     setQueued_ResetBoard(true);
        //     startCooldownTimeout(true);
        //     return;
        // }
        // await resetBoard(canvasContext.local_currentBoardId);
        // canvasContext.updateCurrentBoardObjects([]);
        // setSaveObjectsError({ error: null });
        // objectsBeingSavedOnDatabase.current = [];
        // canvasContext.local_unsavedObjects = [];
        // objectsToSaveOnDatabase.current.clear();
    };

    const handleDeleteBoard = async () => {
        // if (hasPendingSaveOperations()) {
        //     // Will quicken the ongoing save processes and reset the board as soon as save is done
        //     setQueued_deleteBoard(true);
        //     startCooldownTimeout(true);
        //     return;
        // }
        // await deleteBoard(canvasContext.local_currentBoardId);
        // window.location.reload();
    };

    function hasPendingSaveOperations() {
        const cameraPosOnClient =
            canvasContextRef.current.local_camera.position;
        const cameraZoomOnClient = canvasContextRef.current.local_camera.zoom;
        const wasCameraUpdatedSinceLastSave =
            cameraPosOnClient.x !==
                canvasContextRef.current.getCurrentBoard().lastCameraPosition
                    .x ||
            cameraPosOnClient.y !==
                canvasContextRef.current.getCurrentBoard().lastCameraPosition
                    .y ||
            cameraZoomOnClient !==
                canvasContextRef.current.getCurrentBoard().lastCameraZoom;

        return (
            areThereChangesToPush() ||
            areTherePendingChanges() ||
            wasCameraUpdatedSinceLastSave ||
            canvasContext.local_unsavedObjects.length !== 0 ||
            canvasContext.local_deletedObjectIds.size !== 0
        );
    }

    function requestNavigateToMyBoards() {
        // if (!hasPendingSaveOperations()) {
        //     openMyBoards();
        // } else {
        //     // quicken the save process and queue the navigate to my boards until save finishes
        //     setQueued_navigateToMyBoards(true);
        //     startCooldownTimeout(true);
        // }
    }

    return {
        hasPendingSaveOperations,
        saveObjectsError,
        handleResetBoard,
        handleDeleteBoard,
        requestNavigateToMyBoards,
        requestAddObjects,
        requestEditObjects,
        requestDeleteObjects,
        requestUpdateCamera,
        requestForceSaveBoardNow,
    };
}
