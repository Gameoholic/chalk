import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

interface WelcomeScreenProps {
    onDismiss: () => void;
    onLoginSignUp: () => void;
}

export default function WelcomeScreen({
    onDismiss,
    onLoginSignUp,
}: WelcomeScreenProps) {
    const [exiting, setExiting] = useState(false);

    const handleStartDrawing = () => {
        setExiting(true);
    };

    return (
        <AnimatePresence onExitComplete={onDismiss}>
            {!exiting && (
                <motion.div
                    key="welcome-overlay"
                    className="fixed inset-0 z-[200] flex items-center justify-center backdrop-blur-sm"
                    style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                >
                    <motion.div
                        key="welcome-card"
                        className="flex w-full max-w-lg flex-col items-center overflow-hidden rounded-3xl text-center shadow-2xl"
                        style={{
                            backgroundColor: "#1a1a1a",
                            color: "#f5f5f5",
                        }}
                        initial={{ opacity: 0, scale: 0.95, y: 12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 1.06, y: -8 }}
                        transition={{ duration: 0.4, ease: "easeInOut" }}
                    >
                        {/* Hero image */}
                        <div className="flex h-42 w-full items-center justify-center overflow-hidden">
                            <motion.img
                                src="/chalk.png"
                                alt="Chalk icon"
                                className="h-full w-auto object-contain"
                                animate={{
                                    y: [0, -10, 0],
                                    rotate: [-3, 3, -3],
                                }}
                                transition={{
                                    duration: 4,
                                    ease: "easeInOut",
                                    repeat: Infinity,
                                }}
                            />
                        </div>

                        {/* Content */}
                        <div className="flex flex-col items-center gap-5 p-8">
                            {/* Headline */}
                            <div className="flex flex-col gap-2">
                                <h1 className="text-4xl leading-tight font-bold tracking-tight text-white">
                                    Your canvas{" "}
                                    <span style={{ color: "#ffa4b8" }}>
                                        awaits.
                                    </span>
                                </h1>
                                <p
                                    className="text-base"
                                    style={{ color: "#a0a0a0" }}
                                >
                                    Draw, sketch and brainstorm instantly.
                                    <br />
                                    Infinite drawing boards. No sign-up
                                    required.
                                </p>
                            </div>

                            {/* CTAs */}
                            <div className="flex w-full flex-col gap-3">
                                <button
                                    onClick={handleStartDrawing}
                                    className="w-full rounded-2xl py-3 text-base font-semibold shadow transition active:scale-95"
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
                                    Start drawing
                                </button>

                                {/* Free account advertisement */}
                                <div
                                    className="mt-7 w-full rounded-2xl px-4 py-3 text-left text-sm"
                                    style={{
                                        backgroundColor: "#2a2a2a",
                                        borderLeft: "3px solid #ff8ca5",
                                        color: "#c0c0c0",
                                    }}
                                >
                                    <span
                                        style={{ color: "#ffa4b8" }}
                                        className="font-semibold"
                                    >
                                        Want more?
                                    </span>{" "}
                                    Create a free account to unlock multiple
                                    boards, persistent saves across devices, and
                                    more features.
                                </div>

                                <button
                                    onClick={() => {
                                        setExiting(true);
                                        onLoginSignUp();
                                    }}
                                    className="w-full rounded-2xl border py-3 text-base font-medium transition active:scale-95"
                                    style={{
                                        borderColor: "#ff8ca5",
                                        backgroundColor: "transparent",
                                        color: "#ffa4b8",
                                    }}
                                    onMouseEnter={(e) =>
                                        (e.currentTarget.style.backgroundColor =
                                            "#ff8ca520")
                                    }
                                    onMouseLeave={(e) =>
                                        (e.currentTarget.style.backgroundColor =
                                            "transparent")
                                    }
                                >
                                    Log in / Sign up
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
