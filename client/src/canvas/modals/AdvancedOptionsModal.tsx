import { useContext } from "react";
import { X, Moon, Sun, Blend, RotateCcw, Bug } from "lucide-react";
import { ThemeContext } from "../../types/context/ThemeContext";
import { AntiAliasingContext } from "../../types/context/AntiAliasingContext";
import { FirstTimeVisitorContext } from "../../types/context/FirstTimeVisitorContext";
import { ShowDebugInfoContext } from "../../types/context/ShowDebugInfoContext";

interface AdvancedOptionsModalProps {
    onClose: () => void;
}

export default function AdvancedOptionsModal({
    onClose,
}: AdvancedOptionsModalProps) {
    const themeContext = useContext(ThemeContext);
    const antiAliasingContext = useContext(AntiAliasingContext);
    const firstTimeVisitorContext = useContext(FirstTimeVisitorContext);
    const showDebugInfoContext = useContext(ShowDebugInfoContext);

    const handleRestartTour = () => {
        firstTimeVisitorContext.setValue("welcome");
        onClose();
        window.location.reload();
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                className="relative w-full max-w-sm rounded-2xl p-6 shadow-2xl"
                style={{
                    backgroundColor: "var(--card)",
                    color: "var(--card-foreground)",
                }}
            >
                {/* Header */}
                <div className="mb-5 flex items-center justify-between">
                    <h2 className="text-base font-semibold">
                        Advanced Options
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1 transition hover:brightness-110"
                        style={{ color: "var(--muted-foreground)" }}
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="flex flex-col gap-3">
                    {/* Theme */}
                    <OptionRow
                        icon={
                            themeContext.theme === "light" ? (
                                <Moon size={18} />
                            ) : (
                                <Sun size={18} />
                            )
                        }
                        label="Theme"
                        description="Currently unstable, recommended to use dark mode for best results"
                    >
                        <Toggle
                            checked={themeContext.theme === "dark"}
                            onChange={(val) =>
                                themeContext.updateTheme(val ? "dark" : "light")
                            }
                            labelOff="Light"
                            labelOn="Dark"
                        />
                    </OptionRow>

                    {/* Anti-aliasing */}
                    <OptionRow
                        icon={<Blend size={18} />}
                        label="Anti-Aliasing"
                        description="Objects smaller than 1px will fade out when zooming out"
                    >
                        <Toggle
                            checked={antiAliasingContext.value}
                            onChange={(val) =>
                                antiAliasingContext.setValue(val)
                            }
                            labelOff="Off"
                            labelOn="On"
                        />
                    </OptionRow>

                    {/* Debug info */}
                    <OptionRow
                        icon={<Bug size={18} />}
                        label="Debug Info"
                        description="Show camera, FPS, and object stats on the canvas"
                    >
                        <Toggle
                            checked={showDebugInfoContext.value}
                            onChange={(val) =>
                                showDebugInfoContext.setValue(() => val)
                            }
                            labelOff="Off"
                            labelOn="On"
                        />
                    </OptionRow>

                    {/* Restart tour */}
                    <OptionRow
                        icon={<RotateCcw size={18} />}
                        label="Restart Tour"
                        description="Re-run the welcome walkthrough"
                    >
                        <button
                            onClick={handleRestartTour}
                            className="rounded-lg px-3 py-1.5 text-xs font-medium transition active:scale-95"
                            style={{
                                backgroundColor: "#ff8ca5",
                                color: "#1a1a1a",
                            }}
                            onMouseEnter={(e) =>
                                (e.currentTarget.style.backgroundColor =
                                    "#ffa4b8")
                            }
                            onMouseLeave={(e) =>
                                (e.currentTarget.style.backgroundColor =
                                    "#ff8ca5")
                            }
                        >
                            Restart
                        </button>
                    </OptionRow>
                </div>
            </div>
        </div>
    );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function OptionRow({
    icon,
    label,
    description,
    children,
}: {
    icon: React.ReactNode;
    label: string;
    description?: string;
    children: React.ReactNode;
}) {
    return (
        <div
            className="flex items-center justify-between gap-4 rounded-xl px-4 py-3"
            style={{ backgroundColor: "var(--accent)" }}
        >
            <div className="flex items-center gap-3">
                <span style={{ color: "var(--accent-foreground)" }}>
                    {icon}
                </span>
                <div className="flex flex-col">
                    <span
                        className="text-sm font-medium"
                        style={{ color: "var(--accent-foreground)" }}
                    >
                        {label}
                    </span>
                    {description && (
                        <span
                            className="text-xs"
                            style={{ color: "var(--muted-foreground)" }}
                        >
                            {description}
                        </span>
                    )}
                </div>
            </div>
            {children}
        </div>
    );
}

function Toggle({
    checked,
    onChange,
    labelOff,
    labelOn,
}: {
    checked: boolean;
    onChange: (val: boolean) => void;
    labelOff: string;
    labelOn: string;
}) {
    return (
        <div className="flex items-center gap-2">
            <span
                className="min-w-[2rem] text-right text-xs"
                style={{ color: "var(--muted-foreground)" }}
            >
                {checked ? labelOn : labelOff}
            </span>
            <button
                role="switch"
                aria-checked={checked}
                onClick={() => onChange(!checked)}
                className="relative h-6 w-11 rounded-full transition-colors duration-200 focus:outline-none"
                style={{
                    backgroundColor: checked
                        ? "#ff8ca5"
                        : "rgba(255,255,255,0.15)",
                }}
            >
                <span
                    className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full shadow-md transition-transform duration-200"
                    style={{
                        backgroundColor: checked
                            ? "#1a1a1a"
                            : "rgba(255,255,255,0.7)",
                        transform: checked
                            ? "translateX(1.25rem)"
                            : "translateX(0)",
                    }}
                />
            </button>
        </div>
    );
}
