import { useContext, useEffect, useState } from "react";
import {
    Menu,
    User,
    LayoutDashboard,
    Share2,
    Settings2,
    SlidersHorizontal,
} from "lucide-react";
import { CanvasContext } from "../../../types/context/CanvasContext";
import { SessionContext } from "../../../types/context/SessionContext";
import { updateBoardName } from "../../../api/boards";
import { updateUserDisplayName } from "../../../api/me";
import { logout } from "../../../api/auth";
import ManageThisBoardModal from "./ManageThisBoardModal";
import CreateAccountModal from "./CreateAccountModal";
import LoginModal from "./LoginModal";
import ManageAccountModal from "./ManageAccountModal";
import AdvancedOptionsModal from "./AdvancedOptionsModal";

interface EditorMenuProps {
    keepMenuOpen?: boolean;
    tourMenuOpen?: boolean;
    setTourMenuOpen?: (open: boolean) => void;
    openLoginOnMount?: boolean;
    onLoginOpened?: () => void;
    requestNavigateToMyBoards: () => void;
    requestResetBoard: () => Promise<void>;
    requestDeleteBoard: () => Promise<void>;
}

export default function EditorMenu({
    keepMenuOpen,
    tourMenuOpen,
    setTourMenuOpen,
    openLoginOnMount,
    onLoginOpened,
    requestNavigateToMyBoards,
    requestResetBoard,
    requestDeleteBoard,
}: EditorMenuProps) {
    const canvasContext = useContext(CanvasContext);
    const sessionContext = useContext(SessionContext);

    const [menuOpen, setMenuOpen] = useState(false);
    const [showManageThisBoardModal, setShowManageThisBoardModal] =
        useState(false);
    const [showAdvancedOptionsModal, setShowAdvancedOptionsModal] =
        useState(false);
    const [authView, setAuthView] = useState<
        "login" | "forgot-password" | "create-account" | "manage-user" | null
    >(null);

    useEffect(() => {
        if (tourMenuOpen !== undefined && setTourMenuOpen) {
            setMenuOpen(tourMenuOpen);
        }
    }, [tourMenuOpen, setTourMenuOpen]);

    useEffect(() => {
        if (openLoginOnMount) {
            setAuthView("login");
            onLoginOpened?.();
        }
    }, [openLoginOnMount, onLoginOpened]);

    const handleRenameBoard = async (newName: string) => {
        await updateBoardName(canvasContext.serverBoard.id, newName);
        canvasContext.updateCurrentBoard({ name: newName });
    };

    const handleUserLogout = async () => {
        await logout();
    };

    const handleUserChangeDisplayName = async (displayName: string) => {
        await updateUserDisplayName(displayName);
        sessionContext.updateUserDisplayName(displayName);
    };

    return (
        <>
            {/* Top-left menu container */}
            <div
                className={`absolute top-4 left-4 z-3 ${!menuOpen ? "pointer-events-none" : ""}`}
                onMouseLeave={() => {
                    if (!keepMenuOpen) setMenuOpen(false);
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
                            disabled={sessionContext.userData.role === "guest"}
                            disabledTooltip="You must be logged in to access additional boards."
                            onClick={requestNavigateToMyBoards}
                        />
                    </div>

                    <div data-tour-id="menu-item-manage-board">
                        <MenuItem
                            icon={<Settings2 size={18} />}
                            label="Manage This Board"
                            onClick={() => setShowManageThisBoardModal(true)}
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

            {/* Modals spawned from menu actions */}
            {showManageThisBoardModal && (
                <ManageThisBoardModal
                    onRename={handleRenameBoard}
                    onReset={requestResetBoard}
                    onDelete={requestDeleteBoard}
                    onClose={() => setShowManageThisBoardModal(false)}
                />
            )}

            {showAdvancedOptionsModal && (
                <AdvancedOptionsModal
                    onClose={() => setShowAdvancedOptionsModal(false)}
                />
            )}

            {authView === "login" && (
                <LoginModal
                    onCreateAccount={() => setAuthView("create-account")}
                    onForgotPassword={() => setAuthView("forgot-password")}
                    onClose={() => setAuthView(null)}
                />
            )}

            {authView === "create-account" && (
                <CreateAccountModal
                    onLogin={() => setAuthView("login")}
                    onClose={() => setAuthView(null)}
                />
            )}

            {authView === "manage-user" && (
                <ManageAccountModal
                    onLogout={handleUserLogout}
                    onUpdateDisplayName={handleUserChangeDisplayName}
                    onClose={() => setAuthView(null)}
                />
            )}
        </>
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
