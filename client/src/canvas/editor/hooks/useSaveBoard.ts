import { RefObject, useContext, useEffect, useRef, useState } from "react";
import isDeepEqual from "fast-deep-equal";
import {
    deleteBoard,
    deleteBoardObjects,
    resetBoard,
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

    const cooldownTimerRef = useRef<number | null>(null);
    // Cleanup timers on unmount
    useEffect(() => {
        return () => {
            if (cooldownTimerRef.current)
                clearTimeout(cooldownTimerRef.current);
            if (retryCountdownRef.current)
                clearInterval(retryCountdownRef.current);
        };
    }, []);

    // Increment every time we make changes to trigger the tryToPushChanges effect
    const [commitSignal, setCommitSignal] = useState(0);

    type SaveError =
        | {
              error: string;
              retryCooldownSecondsOrStatus: number | "retrying" | null;
          }
        | { error: null; retryCooldownSecondsOrStatus: null };

    const [saveObjectsError, setSaveObjectsError] = useState<SaveError>({
        error: null,
        retryCooldownSecondsOrStatus: null,
    });

    // Interval handle for the retry countdown tick
    const retryCountdownRef = useRef<number | null>(null);

    // ================================================
    // END LOCAL VARIABLES, STATE AND DATA
    // ================================================

    // ================================================
    // LOCAL METHODS, LOGIC
    // ================================================

    // Effect 1: (effects run after render, so context states are always fresh)
    useEffect(() => {
        if (commitSignal === 0) return; // skip initial
        tryToPushChanges(); // reads fresh local_ from context, snapshots → pending
    }, [commitSignal]);

    function tryToPushChanges() {
        const hasChanges =
            canvasContext.local_unsavedObjects.length > 0 ||
            canvasContext.local_deletedObjectIds.size > 0 ||
            canvasContext.local_cameraPosition !== null ||
            canvasContext.local_cameraZoom !== null;

        if (!hasChanges) {
            console.warn("No changes to push.");
            return;
        }
        if (
            canvasContext.pending_cameraPosition !== null ||
            canvasContext.pending_cameraZoom !== null ||
            canvasContext.pending_unsavedObjects.length > 0 ||
            canvasContext.pending_deletedObjectIds.size > 0
        ) {
            console.warn("Waiting on existing request.");
            return;
        }
        if (cooldownTimerRef.current !== null) {
            console.warn("Waiting on cooldown.");
            return;
        }

        // Convert all local changes -> pending, which will trigger effect 2 to push to the server
        canvasContext.moveLocalChangesToPendingChanges();
    }

    // Effect 2:
    useEffect(() => {
        const hasPendingChanges =
            canvasContext.pending_unsavedObjects.length > 0 ||
            canvasContext.pending_deletedObjectIds.size > 0 ||
            canvasContext.pending_cameraPosition !== null ||
            canvasContext.pending_cameraZoom !== null;

        if (!hasPendingChanges) return;

        pushPendingChanges();
    }, [
        canvasContext.pending_unsavedObjects,
        canvasContext.pending_deletedObjectIds,
        canvasContext.pending_cameraPosition,
        canvasContext.pending_cameraZoom,
    ]);

    async function pushPendingChanges() {
        startCooldown();

        const upsertObjects = canvasContext.pending_unsavedObjects;
        const deleteIds = canvasContext.pending_deletedObjectIds;
        const cameraPosition = canvasContext.pending_cameraPosition;
        const cameraZoom = canvasContext.pending_cameraZoom;

        console.log(
            `Pushing: ${upsertObjects.length} upserts, ${deleteIds.size} deletes, cameraPosition: ${JSON.stringify(cameraPosition)}, cameraZoom: ${cameraZoom}`
        );

        try {
            await pushBoardChangesToServer(canvasContext.local_currentBoardId, {
                objectUpsert: new Map(upsertObjects.map((o) => [o.id, o])),
                objectDelete: deleteIds,
                cameraPosition,
                cameraZoom,
            });

            console.log("Successfully pushed changes.");

            // Clear any active retry state on success
            if (retryCountdownRef.current !== null) {
                clearInterval(retryCountdownRef.current);
                retryCountdownRef.current = null;
            }
            setSaveObjectsError({
                error: null,
                retryCooldownSecondsOrStatus: null,
            });

            canvasContextRef.current.onSaveCompleted(
                upsertObjects,
                deleteIds,
                cameraPosition,
                cameraZoom
            );

            // Re-trigger push in case changes accumulated mid-request
            setCommitSignal((n) => n + 1);
        } catch (err) {
            console.error("Failed to push changes", err);

            const message = err instanceof Error ? err.message : String(err);
            const isFatal = message.includes("test");

            if (isFatal) {
                setSaveObjectsError({
                    error: "A fatal error occurred. Please refresh the page.",
                    retryCooldownSecondsOrStatus: null,
                });
            } else {
                scheduleRetry();
            }
        }
    }

    function scheduleRetry() {
        // Clear any existing countdown before starting a new one
        if (retryCountdownRef.current !== null) {
            clearInterval(retryCountdownRef.current);
            retryCountdownRef.current = null;
        }

        const retryDelaySecs = env.VITE_SAVE_RETRY_COOLDOWN;
        setSaveObjectsError({
            error: "Failed to save. Check your connection.",
            retryCooldownSecondsOrStatus: retryDelaySecs,
        });

        let remaining = retryDelaySecs;
        retryCountdownRef.current = window.setInterval(() => {
            remaining -= 1;
            if (remaining <= 0) {
                clearInterval(retryCountdownRef.current!);
                retryCountdownRef.current = null;

                setSaveObjectsError((prev) =>
                    prev.error !== null
                        ? {
                              error: prev.error,
                              retryCooldownSecondsOrStatus: "retrying",
                          }
                        : prev
                );

                // Absorb any local edits that accumulated during the countdown into the pending batch,
                // then let Effect 2 detect the pending state change and call pushPendingChanges with fresh state.
                canvasContextRef.current.mergeLocalIntoPendingChanges();
            } else {
                setSaveObjectsError((prev) =>
                    prev.error !== null
                        ? {
                              error: prev.error,
                              retryCooldownSecondsOrStatus: remaining,
                          }
                        : prev
                );
            }
        }, 1000);
    }

    function requestForceSaveBoardNow() {
        // Cancel current cooldown timer
        if (cooldownTimerRef.current !== null) {
            clearTimeout(cooldownTimerRef.current);
            cooldownTimerRef.current = null;
        }

        tryToPushChanges();
    }

    function startCooldown() {
        if (cooldownTimerRef.current !== null) {
            return;
        }

        if (env.VITE_SAVE_REQUEST_COOLDOWN > 0) {
            cooldownTimerRef.current = window.setTimeout(() => {
                console.log("Cooldown finished.");
                cooldownTimerRef.current = null;
                setCommitSignal((n) => n + 1); // trigger effect to check if we have changes to push after cooldown. Can't call function directly due to stale closure from inside timeout
            }, env.VITE_SAVE_REQUEST_COOLDOWN);
        }
    }

    // ================================================
    // END LOCAL METHODS, LOGIC
    // ================================================

    // ================================================
    // PUBLIC API — these are the only exported methods
    // ================================================

    function requestSaveBoard() {
        setCommitSignal((n) => n + 1);
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
        return (
            // areThereChangesToPush() ||
            // areTherePendingChanges() ||
            // wasCameraUpdatedSinceLastSave ||
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
        requestForceSaveBoardNow,
        requestSaveBoard,
    };
}
