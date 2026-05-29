import Toolbox from "./components/Toolbox";
import { useContext, useEffect, useRef, useState } from "react";
import {
    Menu,
    User,
    LayoutDashboard,
    Share2,
    Settings2,
    SlidersHorizontal,
} from "lucide-react";
import { updateBoardName } from "../../api/boards";
import ManageThisBoardModal from "./components/ManageThisBoardModal";
import CreateAccountModal from "./components/CreateAccountModal";
import LoginModal from "./components/LoginModal";
import CanvasInteractive from "../interactive/CanvasInteractive";
import { motion } from "motion/react";
import { CanvasContext } from "../../types/context/CanvasContext";
import { SessionContext } from "../../types/context/SessionContext";
import ManageAccountModal from "./components/ManageAccountModal";
import { logout } from "../../api/auth";
import { updateUserDisplayName } from "../../api/me";
import { ShowDebugInfoContext } from "../../types/context/ShowDebugInfoContext";
import AdvancedOptionsModal from "./components/AdvancedOptionsModal";
import { useSaveBoard } from "./hooks/useSaveBoard";
import { Vec2 } from "../../types/canvas";
import FatalErrorOverlay from "../../components/FatalSaveErrorOverlay";
import SaveErrorBanner from "../../components/SaveErrorBanner";

interface CanvasEditorProps {
    openMyBoards: () => void;
    tourMenuOpen?: boolean;
    setTourMenuOpen?: (open: boolean) => void;
    onTourCameraMoved?: () => void;
    keepMenuOpen?: boolean;
    openLoginOnMount?: boolean;
    onLoginOpened?: () => void;
}

// Handles saving and uploading data, as well as tool selection and all overlays
function CanvasEditor({
    openMyBoards,
    tourMenuOpen,
    setTourMenuOpen,
    onTourCameraMoved,
    keepMenuOpen,
    openLoginOnMount,
    onLoginOpened,
}: CanvasEditorProps) {
    const showDebugInfoContext = useContext(ShowDebugInfoContext);
    const canvasContext = useContext(CanvasContext);
    const sessionContext = useContext(SessionContext);

    const {
        saveObjectsError,
        handleResetBoard,
        handleDeleteBoard,
        requestNavigateToMyBoards,
        requestForceSaveBoardNow,
        requestSaveBoard,
    } = useSaveBoard(openMyBoards, onTourCameraMoved);

    // FPS
    const [fps, setFps] = useState(0);
    const frames = useRef(0);
    const lastTime = useRef(performance.now());
    // Calculate FPS
    useEffect(() => {
        let rafId: number;

        const loop = () => {
            frames.current++;
            const now = performance.now();

            if (now - lastTime.current >= 1000) {
                setFps(frames.current);
                frames.current = 0;
                lastTime.current = now;
            }

            rafId = requestAnimationFrame(loop);
        };

        rafId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rafId);
    }, []);

    // Menu
    const [menuOpen, setMenuOpen] = useState(false);
    const [showManageThisBoardModal, setShowManageThisBoardModal] =
        useState(false);
    const [showAdvancedOptionsModal, setShowAdvancedOptionsModal] =
        useState(false);
    const [authView, setAuthView] = useState<
        "login" | "forgot-password" | "create-account" | "manage-user" | null
    >(null);

    // Open login modal when requested from welcome screen
    useEffect(() => {
        if (tourMenuOpen !== undefined && setTourMenuOpen) {
            setMenuOpen(tourMenuOpen);
        }
    }, [tourMenuOpen, setTourMenuOpen]);

    // Open login modal when requested from welcome screen
    useEffect(() => {
        if (openLoginOnMount) {
            setAuthView("login");
            onLoginOpened?.();
        }
    }, [openLoginOnMount, onLoginOpened]);

    const handleRenameBoard = async (newName: string) => {
        await updateBoardName(canvasContext.getCurrentBoard().id, newName);
        canvasContext.getCurrentBoard().name = newName;
    };

    const handleUserLogout = async () => {
        await logout();
    };

    const handleUserChangeDisplayName = async (displayName: string) => {
        await updateUserDisplayName(displayName);
        sessionContext.updateUserDisplayName(displayName);
    };

    // Animation for smoothly zooming out
    const handleResetCameraZoom = () => {
        const DURATION = 500;
        const startTime = performance.now();
        const {
            zoom: startZoom,
            position: startPos,
            size,
        } = canvasContext.updatedCamera;

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

    // ================================================
    // REQUEST METHODS FROM CanvasInteractive - Called by canvasinteractive whenever
    // ================================================

    function canvasInteractive_saveBoard() {
        requestSaveBoard();
    }

    // ================================================
    // END REQUEST METHODS FROM CanvasInteractive
    // ================================================
    return (
        <div className="relative h-screen w-screen">
            {/* Canvas */}
            <div className="h-full w-full" data-tour-id="canvas">
                <CanvasInteractive
                    key={canvasContext.local_currentBoardId}
                    saveBoard={canvasInteractive_saveBoard}
                />
            </div>

            {/* FATAL SAVE ERROR OVERLAY */}
            {saveObjectsError.retryCooldownSecondsOrStatus ===
                "fatal-error" && <FatalErrorOverlay />}

            {/* OK/NETWORK SAVE ERROR BANNER */}
            {saveObjectsError.error &&
                saveObjectsError.retryCooldownSecondsOrStatus !==
                    "fatal-error" && (
                    <SaveErrorBanner
                        error={saveObjectsError.error}
                        retryCooldownSecondsOrStatus={
                            saveObjectsError.retryCooldownSecondsOrStatus
                        }
                    />
                )}

            <motion.div {...fadeInAnimation}>
                {/* Top-left menu container */}
                <div
                    className={`absolute top-4 left-4 z-3 ${!menuOpen ? "pointer-events-none" : ""}`}
                    onMouseLeave={() => {
                        if (!keepMenuOpen) {
                            setMenuOpen(false);
                        }
                    }}
                >
                    {/* Menu burger icon — opens menu */}
                    <button
                        onMouseEnter={() => {
                            setMenuOpen(true);
                            if (setTourMenuOpen) setTourMenuOpen(true);
                        }}
                        className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full shadow-md transition-colors"
                        style={{
                            backgroundColor: "var(--card)",
                            color: "var(--card-foreground)",
                        }}
                        data-tour-id="menu-button"
                    >
                        <Menu size={22} />
                    </button>

                    {/* Dropdown */}
                    <div
                        className={`mt-2 w-56 origin-top-left rounded-xl p-2 shadow-xl transition-all duration-300 ease-out ${
                            menuOpen
                                ? "translate-y-0 scale-100 opacity-100"
                                : "pointer-events-none -translate-y-2 scale-95 opacity-0"
                        }`}
                        style={{ backgroundColor: "var(--card)" }}
                    >
                        <div data-tour-id="menu-login-boards">
                            {sessionContext.userData.role === "guest" && (
                                <MenuItem
                                    icon={<User size={18} />}
                                    label="Login"
                                    onClick={() => setAuthView("login")}
                                />
                            )}
                            {sessionContext.userData.role === "user" && (
                                <MenuItem
                                    icon={<User size={18} />}
                                    label={
                                        "Manage account: " +
                                        sessionContext.userData.displayName
                                    }
                                    onClick={() => setAuthView("manage-user")}
                                />
                            )}
                            <MenuItem
                                icon={<LayoutDashboard size={18} />}
                                label="My Boards"
                                disabled={
                                    sessionContext.userData.role === "guest"
                                }
                                disabledTooltip="You must be logged in to access additional boards."
                                onClick={requestNavigateToMyBoards}
                            />
                        </div>

                        <div data-tour-id="menu-item-manage-board">
                            <MenuItem
                                icon={<Settings2 size={18} />}
                                label="Manage This Board"
                                onClick={() => {
                                    setShowManageThisBoardModal(true);
                                }}
                            />
                        </div>

                        <div data-tour-id="menu-item-share">
                            <MenuItem
                                icon={<Share2 size={18} />}
                                label="Share Board"
                                disabled={true}
                                disabledTooltip="This feature is not available yet."
                            />
                        </div>

                        <MenuItem
                            icon={<SlidersHorizontal size={18} />}
                            label="Advanced Options"
                            onClick={() => setShowAdvancedOptionsModal(true)}
                        />
                    </div>
                </div>
            </motion.div>

            <motion.div {...fadeInAnimation}>
                {/* Debug */}
                {showDebugInfoContext.value && (
                    <div
                        className="absolute bottom-4 left-4 w-110 rounded-lg p-3 font-mono text-sm shadow-md"
                        style={{
                            backgroundColor: "var(--card)",
                            color: "var(--card-foreground)",
                        }}
                    >
                        <p className="font-bold">Debug</p>
                        <p>
                            Camera Pos: {canvasContext.updatedCamera.position.x}
                            , {canvasContext.updatedCamera.position.y}
                        </p>
                        <p>
                            Camera Zoom:{" "}
                            {canvasContext.updatedCamera.zoom.toFixed(2)}
                        </p>
                        <p>FPS: {fps}</p>
                        <p>Objects: {canvasContext.allObjects.size} total</p>
                        <p>
                            Server:{" "}
                            {canvasContext.getCurrentBoard().objects.length} |
                            Local unsaved:{" "}
                            {canvasContext.unsaved_objects.length} | Local
                            deleting:{" "}
                            {canvasContext.unsaved_deletedObjectIds.size}
                        </p>
                        <p>
                            Pending unsaved:{" "}
                            {canvasContext.pending_objects.length} | Pending
                            deleting:{" "}
                            {canvasContext.pending_deletedObjectIds.size}
                        </p>
                        <p>
                            Camera:{" "}
                            {canvasContext.updatedCamera.position.x !==
                                canvasContext.getCurrentBoard()
                                    .lastCameraPosition.x ||
                            canvasContext.updatedCamera.position.y !==
                                canvasContext.getCurrentBoard()
                                    .lastCameraPosition.y ||
                            canvasContext.updatedCamera.zoom !==
                                canvasContext.getCurrentBoard().lastCameraZoom
                                ? "Unsaved."
                                : "Saved."}
                        </p>
                    </div>
                )}
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
                            canvasContext.updatedCamera.zoom * 100
                        ).toLocaleString("en-US")}
                        {/* display commas instead of periods */}%
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
            {/* Manage Board Modal */}
            {showManageThisBoardModal && (
                <ManageThisBoardModal
                    onRename={handleRenameBoard}
                    onReset={handleResetBoard}
                    onDelete={handleDeleteBoard}
                    onClose={() => {
                        setShowManageThisBoardModal(false);
                    }}
                />
            )}

            {/* Advanced Options Modal */}
            {showAdvancedOptionsModal && (
                <AdvancedOptionsModal
                    onClose={() => setShowAdvancedOptionsModal(false)}
                />
            )}

            {/* Login Modal */}
            {authView === "login" && (
                <LoginModal
                    onCreateAccount={() => setAuthView("create-account")}
                    onForgotPassword={() => setAuthView("forgot-password")}
                    onClose={() => setAuthView(null)}
                />
            )}

            {/* Create Account Modal */}
            {authView === "create-account" && (
                <CreateAccountModal
                    onLogin={() => setAuthView("login")}
                    onClose={() => setAuthView(null)}
                />
            )}

            {/* Create Account Modal */}
            {authView === "manage-user" && (
                <ManageAccountModal
                    onLogout={handleUserLogout}
                    onUpdateDisplayName={handleUserChangeDisplayName}
                    onClose={() => setAuthView(null)}
                />
            )}
        </div>
    );
}

function MenuItem({
    icon,
    label,
    onClick,
    disabled = false,
    disabledTooltip,
}: {
    icon: React.ReactNode;
    label: string;
    onClick?: () => void;
    disabled?: boolean;
    disabledTooltip?: string;
}) {
    const [isHover, setIsHover] = useState(false);

    return (
        <div className="group relative">
            <button
                onClick={disabled ? undefined : onClick}
                disabled={disabled}
                onMouseEnter={() => setIsHover(true)}
                onMouseLeave={() => setIsHover(false)}
                className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition"
                style={{
                    color: disabled
                        ? "var(--muted-foreground)"
                        : isHover
                          ? "var(--accent-foreground)"
                          : "var(--card-foreground)",
                    backgroundColor: disabled
                        ? "transparent"
                        : isHover
                          ? "var(--accent)"
                          : "var(--card)",
                    cursor: disabled
                        ? "not-allowed"
                        : isHover
                          ? "pointer"
                          : "default",
                }}
            >
                {icon}
                <span>{label}</span>
            </button>

            {disabled && disabledTooltip && (
                <div
                    className="pointer-events-none absolute top-1/2 left-full ml-2 -translate-y-1/2 rounded-md px-2 py-1 text-xs whitespace-nowrap opacity-0 transition-opacity group-hover:opacity-100"
                    style={{
                        backgroundColor: "var(--card-muted)",
                        color: "var(--card-foreground)",
                    }}
                >
                    {disabledTooltip}
                </div>
            )}
        </div>
    );
}

export default CanvasEditor;
