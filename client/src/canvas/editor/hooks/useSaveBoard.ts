import { useContext, useEffect, useRef, useState } from "react";
import { deleteBoard, resetBoard } from "../../../api/boards";
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

    // Timers
    const cooldownTimerRef = useRef<number | null>(null);
    const retryTimerRef = useRef<number | null>(null);
    useEffect(() => {
        return () => {
            if (cooldownTimerRef.current)
                clearTimeout(cooldownTimerRef.current);
            if (retryTimerRef.current) clearInterval(retryTimerRef.current);
        };
    }, []);

    // Increment every time we want to push our changes, to trigger the tryToPushChanges effect
    const [pushSignal, setPushSignal] = useState(0);

    // Save Error
    type SaveError =
        | {
              error: string;
              retryCooldownSecondsOrStatus: number | "retrying" | "fatal-error";
          }
        | { error: null; retryCooldownSecondsOrStatus: null };
    const [saveError, setSaveError] = useState<SaveError>({
        error: null,
        retryCooldownSecondsOrStatus: null,
    });

    // ================================================
    // END LOCAL VARIABLES, STATE AND DATA
    // ================================================

    // ================================================
    // MAIN SAVING LOGIC, METHODS, AND EFFECTS
    // ================================================

    // Effect 1: (effects run after render, so context states are always fresh)
    useEffect(() => {
        if (pushSignal === 0) return; // skip initial
        tryToPushChanges();
    }, [pushSignal]);

    function tryToPushChanges() {
        if (!hasLocalChanges()) {
            console.warn("No changes to push.");
            return;
        }
        if (hasPendingChanges()) {
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
        if (!hasPendingChanges()) return;

        pushPendingChanges();
    }, [
        canvasContext.pending_objects,
        canvasContext.pending_deletedObjectIds,
        canvasContext.pending_cameraPosition,
        canvasContext.pending_cameraZoom,
    ]);

    async function pushPendingChanges() {
        startCooldown();

        const upsertObjects = canvasContext.pending_objects;
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

            // Cleanup retry timer and error state in case this was a retry attempt
            if (retryTimerRef.current !== null) {
                clearInterval(retryTimerRef.current);
                retryTimerRef.current = null;
            }
            setSaveError({
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
            setPushSignal((n) => n + 1);
        } catch (err) {
            console.error("Failed to push changes", err);

            const message = err instanceof Error ? err.message : String(err);
            // TODO: This is not ideal, ideally we make a custom error class for expected errors
            const isNetworkError = message.includes("NetworkError");

            if (isNetworkError) {
                scheduleRetry();
            } else {
                setSaveError({
                    error: "A fatal error occurred. Please refresh the page.",
                    retryCooldownSecondsOrStatus: "fatal-error",
                });
            }
        }
    }

    function startCooldown() {
        if (cooldownTimerRef.current !== null) {
            return;
        }

        if (env.VITE_SAVE_REQUEST_COOLDOWN > 0) {
            cooldownTimerRef.current = window.setTimeout(() => {
                console.log("Cooldown finished.");
                cooldownTimerRef.current = null;
                setPushSignal((n) => n + 1); // trigger effect to check if we have changes to push after cooldown. Can't call function directly due to stale closure from inside timeout
            }, env.VITE_SAVE_REQUEST_COOLDOWN);
        }
    }

    function scheduleRetry() {
        // Clear any existing countdown before starting a new one
        if (retryTimerRef.current !== null) {
            clearInterval(retryTimerRef.current);
            retryTimerRef.current = null;
        }

        const retryDelaySecs = env.VITE_SAVE_RETRY_COOLDOWN;
        setSaveError({
            error: "Failed to save. Check your connection.",
            retryCooldownSecondsOrStatus: retryDelaySecs,
        });

        let remaining = retryDelaySecs;
        retryTimerRef.current = window.setInterval(() => {
            remaining -= 1;
            if (remaining <= 0) {
                clearInterval(retryTimerRef.current!);
                retryTimerRef.current = null;

                setSaveError((prev) =>
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
                setSaveError((prev) =>
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
            console.log("Requested a force save, cancelling cooldown.");
        }

        tryToPushChanges();
    }

    function hasPendingChanges() {
        return (
            canvasContext.pending_objects.length > 0 ||
            canvasContext.pending_deletedObjectIds.size > 0 ||
            canvasContext.pending_cameraPosition !== null ||
            canvasContext.pending_cameraZoom !== null
        );
    }

    function hasLocalChanges() {
        return (
            canvasContext.unsaved_objects.length > 0 ||
            canvasContext.unsaved_deletedObjectIds.size > 0 ||
            canvasContext.unsaved_cameraPosition !== null ||
            canvasContext.unsaved_cameraZoom !== null
        );
    }

    // ================================================
    // END MAIN SAVING LOGIC, METHODS, AND EFFECTS
    // ================================================

    // ================================================
    // OTHER
    // ================================================

    // Prevent refreshing or leaving page if objects are currently being saved / awaiting save (allow refreshing if fatal error occurred)
    const hasUnsavedWorkRef = useRef<() => boolean>(() => false);
    const requestForceSaveBoardNowRef = useRef<() => void>(() => {});
    const saveObjectsErrorRef = useRef<SaveError>(saveError);
    useEffect(() => {
        hasUnsavedWorkRef.current = hasUnsavedWork;
        requestForceSaveBoardNowRef.current = requestForceSaveBoardNow;
        saveObjectsErrorRef.current = saveError;
    });
    useEffect(() => {
        const preventLeaving = (e: BeforeUnloadEvent) => {
            if (
                !hasUnsavedWorkRef.current() ||
                saveObjectsErrorRef.current.retryCooldownSecondsOrStatus ===
                    "fatal-error"
            )
                return;
            e.preventDefault();
            e.returnValue = "";
            requestForceSaveBoardNowRef.current();
        };
        window.addEventListener("beforeunload", preventLeaving);
        return () => window.removeEventListener("beforeunload", preventLeaving);
    }, []);

    // Used if a save operation is currently undergoing and user asked to go my boards
    const [queued_navigateToMyBoards, setQueued_navigateToMyBoards] =
        useState(false);
    useEffect(() => {
        if (queued_navigateToMyBoards && !hasUnsavedWork()) {
            handleOpenMyBoards();
            setQueued_navigateToMyBoards(false);
        }
    }, [
        canvasContext.unsaved_objects,
        canvasContext.unsaved_deletedObjectIds,
        canvasContext.unsaved_cameraPosition,
        canvasContext.unsaved_cameraZoom,
        canvasContext.pending_objects,
        canvasContext.pending_deletedObjectIds,
        canvasContext.pending_cameraPosition,
        canvasContext.pending_cameraZoom,
    ]);

    // Used if a save operation is currently undergoing and user requested to reset board
    const resetResolveRef = useRef<(() => void) | null>(null);
    const [queued_resetBoard, setQueued_ResetBoard] = useState(false);
    useEffect(() => {
        if (queued_resetBoard && !hasUnsavedWork()) {
            setQueued_ResetBoard(false);
            requestResetBoard();
        }
    }, [
        canvasContext.unsaved_objects,
        canvasContext.unsaved_deletedObjectIds,
        canvasContext.unsaved_cameraPosition,
        canvasContext.unsaved_cameraZoom,
        canvasContext.pending_objects,
        canvasContext.pending_deletedObjectIds,
        canvasContext.pending_cameraPosition,
        canvasContext.pending_cameraZoom,
    ]);

    // Used if a save operation is currently undergoing and user requested to delete board
    const [queued_deleteBoard, setQueued_deleteBoard] = useState(false);
    useEffect(() => {
        if (queued_deleteBoard && !hasUnsavedWork()) {
            setQueued_deleteBoard(false);
            requestDeleteBoard();
        }
    }, [
        canvasContext.unsaved_objects,
        canvasContext.unsaved_deletedObjectIds,
        canvasContext.unsaved_cameraPosition,
        canvasContext.unsaved_cameraZoom,
        canvasContext.pending_objects,
        canvasContext.pending_deletedObjectIds,
        canvasContext.pending_cameraPosition,
        canvasContext.pending_cameraZoom,
    ]);

    function hasUnsavedWork() {
        return hasLocalChanges() || hasPendingChanges();
    }

    // ================================================
    // END OTHER
    // ================================================

    // ================================================
    // PUBLIC API — these are the only exported methods
    // ================================================

    function requestSaveBoard() {
        setPushSignal((n) => n + 1);
    }

    function requestNavigateToMyBoards() {
        if (hasUnsavedWork()) {
            setQueued_navigateToMyBoards(true);
            requestForceSaveBoardNow();
            return;
        }

        openMyBoards();
    }

    async function requestResetBoard() {
        if (hasUnsavedWork()) {
            setQueued_ResetBoard(true);
            requestForceSaveBoardNow();
            // Return a promise that resolves only after the queued reset actually completes,
            // so the caller's loading state stays active while waiting for the reset to finish.
            return new Promise<void>((resolve) => {
                resetResolveRef.current = resolve;
            });
        }

        try {
            await resetBoard(canvasContext.local_currentBoardId);
            canvasContext.onBoardReset();
            setSaveError({
                error: null,
                retryCooldownSecondsOrStatus: null,
            });
        } finally {
            resetResolveRef.current?.();
            resetResolveRef.current = null;
        }
    }

    async function requestDeleteBoard() {
        if (hasUnsavedWork()) {
            setQueued_deleteBoard(true);
            requestForceSaveBoardNow();
            return;
        }
        await deleteBoard(canvasContext.local_currentBoardId);
        window.location.reload();
    }

    function handleOpenMyBoards() {
        openMyBoards();
    }

    // ================================================
    // END PUBLIC API
    // ================================================

    return {
        saveError,
        requestResetBoard,
        requestDeleteBoard,
        requestNavigateToMyBoards,
        requestSaveBoard,
    };
}
