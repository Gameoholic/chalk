import Toolbox from "./components/Toolbox";
import { useContext } from "react";
import CanvasInteractive from "../interactive/CanvasInteractive";
import { motion } from "motion/react";
import { CanvasContext } from "../../types/context/CanvasContext";
import { ShowDebugInfoContext } from "../../types/context/ShowDebugInfoContext";
import { useSaveBoard } from "./hooks/useSaveBoard";
import FatalErrorOverlay from "../../components/FatalSaveErrorOverlay";
import SaveErrorBanner from "../../components/SaveErrorBanner";
import EditorMenu from "./components/EditorMenu";
import DebugPanel from "./components/DebugPanel";

interface CanvasEditorProps {
    openMyBoards: () => void;
    tourMenuOpen?: boolean;
    setTourMenuOpen?: (open: boolean) => void;
    keepMenuOpen?: boolean;
    openLoginOnMount?: boolean;
    onLoginOpened?: () => void;
}

// Handles saving and uploading data, as well as tool selection and all overlays
function CanvasEditor({
    openMyBoards,
    tourMenuOpen,
    setTourMenuOpen,
    keepMenuOpen,
    openLoginOnMount,
    onLoginOpened,
}: CanvasEditorProps) {
    const showDebugInfoContext = useContext(ShowDebugInfoContext);
    const canvasContext = useContext(CanvasContext);

    const {
        saveError,
        requestResetBoard,
        requestDeleteBoard,
        requestNavigateToMyBoards,
        requestSaveBoard,
    } = useSaveBoard(openMyBoards);

    // Animation for smoothly zooming out
    const handleResetCameraZoom = () => {
        const DURATION = 500;
        const startTime = performance.now();
        const {
            zoom: startZoom,
            position: startPos,
            size,
        } = canvasContext.camera;

        // The world-space point at the center of the viewport — kept locked throughout the animation
        const centerX = size.x / 2;
        const centerY = size.y / 2;
        const worldAnchorX = startPos.x + centerX / startZoom;
        const worldAnchorY = startPos.y + centerY / startZoom;

        const animate = (currentTime: number) => {
            const progress = Math.min((currentTime - startTime) / DURATION, 1);
            const ease = 1 - Math.pow(1 - progress, 3); // ease-out cubic

            const zoom = startZoom + (1.0 - startZoom) * ease;

            // Derive position from zoom directly — interpolating them separately causes drift
            canvasContext.setUnsavedCameraZoom(zoom);
            canvasContext.setUnsavedCameraPosition({
                x: worldAnchorX - centerX / zoom,
                y: worldAnchorY - centerY / zoom,
            });

            if (progress < 1) requestAnimationFrame(animate);
        };

        requestAnimationFrame(animate);
    };

    // Used upon loading from my boards. Used for toolbox, burger menu, debug panel etc.
    const fadeInAnimation = {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: { duration: 0.5, ease: "easeOut" },
    } as const;

    return (
        <div className="relative h-screen w-screen">
            {/* Canvas */}
            <div className="h-full w-full" data-tour-id="canvas">
                <CanvasInteractive
                    key={canvasContext.local_currentBoardId}
                    saveBoard={requestSaveBoard}
                />
            </div>

            {/* FATAL SAVE ERROR OVERLAY */}
            {saveError.retryCooldownSecondsOrStatus === "fatal-error" && (
                <FatalErrorOverlay />
            )}

            {/* OK/NETWORK SAVE ERROR BANNER */}
            {saveError.error &&
                saveError.retryCooldownSecondsOrStatus !== "fatal-error" && (
                    <SaveErrorBanner
                        error={saveError.error}
                        retryCooldownSecondsOrStatus={
                            saveError.retryCooldownSecondsOrStatus
                        }
                    />
                )}

            <motion.div {...fadeInAnimation}>
                <EditorMenu
                    keepMenuOpen={keepMenuOpen}
                    tourMenuOpen={tourMenuOpen}
                    setTourMenuOpen={setTourMenuOpen}
                    openLoginOnMount={openLoginOnMount}
                    onLoginOpened={onLoginOpened}
                    requestNavigateToMyBoards={requestNavigateToMyBoards}
                    requestResetBoard={requestResetBoard}
                    requestDeleteBoard={requestDeleteBoard}
                />
            </motion.div>

            <motion.div {...fadeInAnimation}>
                {showDebugInfoContext.value && <DebugPanel />}
            </motion.div>

            <motion.div {...fadeInAnimation}>
                <div className="absolute right-6 bottom-6 flex items-center justify-center">
                    <button
                        onClick={handleResetCameraZoom}
                        className="border-border text-card-foreground bg-card rounded-full border px-3 py-1.5 text-xs font-bold shadow-lg backdrop-blur-md transition-all select-none hover:brightness-110 active:scale-95"
                        title="Reset Zoom"
                        data-tour-id="zoom-reset-button"
                    >
                        {Math.round(
                            canvasContext.camera.zoom * 100
                        ).toLocaleString("en-US")}
                        %
                    </button>
                </div>
            </motion.div>

            <motion.div {...fadeInAnimation}>
                {/* Toolbox */}
                <Toolbox
                    className="absolute top-4 right-4 rounded-lg"
                    data-tour-id="toolbox"
                />
            </motion.div>
        </div>
    );
}

export default CanvasEditor;
