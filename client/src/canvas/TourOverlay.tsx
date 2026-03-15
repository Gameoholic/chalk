import { useContext, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { FirstTimeVisitorContext } from "../types/context/FirstTimeVisitorContext";

const TOUR_STEPS = [
    {
        id: "menu-button",
        title: "Main Menu",
        description:
            "Everything you need is in here — your account, boards, and settings.",
        target: "menu-button",
        autoAdvanceOn: "menu-open",
        requiresMenuOpen: false,
    },
    {
        id: "menu-login-boards",
        title: "Login & My Boards",
        description:
            "Log in to save your boards forever and access them from any device. My Boards lets you manage all your whiteboards.",
        target: "menu-login-boards",
        autoAdvanceOn: null,
        requiresMenuOpen: true,
    },
    {
        id: "menu-manage-board",
        title: "Manage This Board",
        description: "Rename your board, clear it, or delete it entirely.",
        target: "menu-item-manage-board",
        autoAdvanceOn: null,
        requiresMenuOpen: true,
    },
    {
        id: "menu-share",
        title: "Share Board",
        description:
            "Soon you'll be able to share your whiteboard with others in real time. This feature is still under development.",
        target: "menu-item-share",
        autoAdvanceOn: null,
        requiresMenuOpen: true,
    },
    {
        id: "canvas-pan",
        title: "Moving Around",
        description:
            "Hold middle mouse button and drag to pan around the canvas. You can also use the cursor tool.",
        target: "canvas",
        autoAdvanceOn: "camera-moved",
        requiresMenuOpen: false,
    },
    {
        id: "canvas-zoom",
        title: "Zooming in and Out",
        description: "Use the scroll wheel to zoom in and out of the canvas.",
        target: "canvas",
        autoAdvanceOn: "camera-moved",
        requiresMenuOpen: false,
    },
    {
        id: "toolbox",
        title: "Your Toolbox",
        description:
            "Draw, erase, and add shapes. Each tool has its own options like color and stroke width — explore them!",
        target: "toolbox",
        autoAdvanceOn: null,
        requiresMenuOpen: false,
    },
    {
        id: "start-drawing",
        title: "Start Drawing",
        description:
            "You're all set! Click anywhere on the canvas to start drawing. Dismiss this tour to begin creating your masterpiece!",
        target: "canvas",
        autoAdvanceOn: null,
        requiresMenuOpen: false,
    },
];

interface TourOverlayProps {
    onDone: () => void;
    menuOpen: boolean;
    setMenuOpen: (open: boolean) => void;
    cameraMoveCount: number;
    onRequiresMenuOpenChange: (value: boolean) => void;
}

export default function TourOverlay({
    onDone,
    menuOpen,
    setMenuOpen,
    cameraMoveCount,
    onRequiresMenuOpenChange,
}: TourOverlayProps) {
    const firstTimeVisitorContext = useContext(FirstTimeVisitorContext);
    const [currentStep, setCurrentStep] = useState(0);
    const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);

    const currentStepData = TOUR_STEPS[currentStep];

    const stepEntryCountRef = useRef(cameraMoveCount);

    // Handle menu open/close, requiresMenuOpen signal, and reset entry ref on step change
    useEffect(() => {
        onRequiresMenuOpenChange(TOUR_STEPS[currentStep].requiresMenuOpen);
        if (currentStep === 1) setMenuOpen(true);
        if (currentStep === 4) setMenuOpen(false);
        stepEntryCountRef.current = cameraMoveCount;
    }, [currentStep, setMenuOpen]);

    // Auto-advance on camera movement (steps 4, 5 and 7)
    // Step 7 dismisses on click as well — handled by the useEffect below
    useEffect(() => {
        if (cameraMoveCount <= stepEntryCountRef.current) return;
        if (currentStep === 4) {
            stepEntryCountRef.current = cameraMoveCount;
            setCurrentStep(5);
        } else if (currentStep === 5) {
            stepEntryCountRef.current = cameraMoveCount;
            setCurrentStep(6);
        } else if (currentStep === 7) {
            stepEntryCountRef.current = cameraMoveCount;
            onDone();
        }
    }, [cameraMoveCount]);

    // Update spotlight position when step target changes
    useEffect(() => {
        const updateSpotlight = () => {
            const element = document.querySelector(
                `[data-tour-id="${currentStepData.target}"]`
            );
            if (element) {
                const rect = element.getBoundingClientRect();
                setSpotlightRect(rect);
            }
        };

        // Delay to allow animations to complete
        const timeoutId = setTimeout(updateSpotlight, 350);
        window.addEventListener("resize", updateSpotlight);
        return () => {
            clearTimeout(timeoutId);
            window.removeEventListener("resize", updateSpotlight);
        };
    }, [currentStepData.target]);

    // Auto-advance step 0 when menu opens
    useEffect(() => {
        if (currentStep === 0 && menuOpen) {
            setCurrentStep(1);
        }
    }, [menuOpen]);

    // On the final step, listen for any click to dismiss — with a 1s delay so
    // residual camera movements from step 5 don't immediately trigger it
    useEffect(() => {
        if (currentStep !== 7) return;

        let handleClick: () => void;

        const timeoutId = setTimeout(() => {
            handleClick = () => onDone();
            window.addEventListener("click", handleClick);
        }, 1000);

        return () => {
            clearTimeout(timeoutId);
            if (handleClick) window.removeEventListener("click", handleClick);
        };
    }, [currentStep]);

    const nextStep = () => {
        if (currentStep < TOUR_STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            onDone();
        }
    };

    const skipTour = () => {
        firstTimeVisitorContext.setValue("false");
    };

    if (!spotlightRect) return null;

    const tooltipHeight = 200;
    const spaceBelow = window.innerHeight - spotlightRect.bottom;
    const spaceAbove = spotlightRect.top;

    let tooltipTop: number;
    let tooltipLeft: number;
    if (currentStepData.target === "canvas") {
        // Special case for canvas: position at bottom center
        tooltipTop = window.innerHeight - tooltipHeight;
        tooltipLeft = Math.max(16, (window.innerWidth - 280) / 2);
    } else {
        tooltipLeft = (() => {
            const preferredLeft = Math.max(
                16,
                Math.min(
                    window.innerWidth - 300,
                    spotlightRect.left + spotlightRect.width / 2 - 140
                )
            );
            const tooltipRight = preferredLeft + 280;
            if (tooltipRight > window.innerWidth - 16) {
                return Math.max(16, window.innerWidth - 280 - 16);
            }
            return preferredLeft;
        })();
        if (spaceBelow >= tooltipHeight + 16) {
            tooltipTop = spotlightRect.bottom + 16;
        } else if (spaceAbove >= tooltipHeight + 16) {
            tooltipTop = spotlightRect.top - 16 - tooltipHeight;
        } else {
            tooltipTop = Math.max(
                16,
                Math.min(
                    window.innerHeight - tooltipHeight - 16,
                    spotlightRect.bottom + 16
                )
            );
        }
    }

    return (
        <div className="pointer-events-none fixed inset-0 z-[200] bg-black/30">
            <motion.div
                className="pointer-events-none absolute rounded-2xl border-2 border-[#ff8ca5]"
                style={{
                    top: spotlightRect.top - 4,
                    left: spotlightRect.left - 4,
                    width: spotlightRect.width + 8,
                    height: spotlightRect.height + 8,
                    boxShadow: `0 0 0 9999px rgba(0,0,0,0.4)`,
                }}
                animate={{
                    top: spotlightRect.top - 4,
                    left: spotlightRect.left - 4,
                    width: spotlightRect.width + 8,
                    height: spotlightRect.height + 8,
                }}
                transition={{ duration: 0.3 }}
            />

            <div
                className="pointer-events-auto absolute min-w-[280px] rounded-3xl border border-[#ff8ca5] bg-[#1a1a1a] p-4 shadow-lg"
                style={{
                    top: tooltipTop,
                    left: tooltipLeft,
                }}
            >
                <div className="mb-2 flex items-center gap-2">
                    <img src="/chalk.png" alt="Chalk" className="h-5 w-5" />
                    <span className="font-semibold text-[#ffa4b8]">Chalk</span>
                    <span className="ml-auto text-xs text-[#666]">
                        {currentStep + 1} / {TOUR_STEPS.length}
                    </span>
                </div>
                <h3 className="mb-1 text-base font-bold text-white">
                    {currentStepData.title}
                </h3>
                <p className="mb-4 text-sm text-[#a0a0a0]">
                    {currentStepData.description}
                </p>
                <div className="flex items-center justify-between">
                    <button
                        onClick={skipTour}
                        className="text-xs text-[#666] transition-colors hover:text-[#a0a0a0]"
                    >
                        Skip tour
                    </button>
                    <button
                        onClick={nextStep}
                        className="rounded-lg bg-[#ff8ca5] px-4 py-2 font-medium text-black transition-colors hover:bg-[#ffa4b8]"
                    >
                        {currentStep === TOUR_STEPS.length - 1
                            ? "Finish"
                            : "Next"}
                    </button>
                </div>
            </div>

            <button
                onClick={skipTour}
                className="pointer-events-auto absolute bottom-4 left-4 text-xs text-[#666] transition-colors hover:text-[#a0a0a0]"
            >
                Skip tour
            </button>
        </div>
    );
}
