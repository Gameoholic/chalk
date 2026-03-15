import { useEffect, useState } from "react";
import { motion } from "motion/react";

interface LoadingScreenProps {
    isReady: boolean;
    onAnimationDone?: () => void;
}

export default function LoadingScreen({
    isReady,
    onAnimationDone: onDone,
}: LoadingScreenProps) {
    const [phase, setPhase] = useState<"loading" | "exiting" | "done">(
        "loading"
    );

    useEffect(() => {
        if (isReady && phase === "loading") setPhase("exiting");
    }, [isReady, phase]);

    if (phase === "done") return null;

    const isExiting = phase === "exiting";

    return (
        <div className="pointer-events-none fixed inset-0 z-[300] overflow-hidden">
            {/* Dark overlay — Smoothly dissolves and scales up */}
            <motion.div
                className="absolute inset-0 flex items-center justify-center bg-[#1a1a1a]"
                initial={{ opacity: 1, scale: 1 }}
                animate={
                    isExiting
                        ? { opacity: 0, scale: 1.05 }
                        : { opacity: 1, scale: 1 }
                }
                transition={{
                    duration: 0.7,
                    delay: isExiting ? 0.4 : 0,
                    ease: "easeOut",
                }}
                onAnimationComplete={() => {
                    if (isExiting) {
                        setPhase("done");
                        onDone?.();
                    }
                }}
            >
                {/* Subtle grid background */}
                <svg
                    className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.06]"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <defs>
                        <pattern
                            id="loading-grid"
                            width="40"
                            height="40"
                            patternUnits="userSpaceOnUse"
                        >
                            <path
                                d="M 40 0 L 0 0 0 40"
                                fill="none"
                                stroke="#e2e8f0"
                                strokeWidth="0.5"
                            />
                        </pattern>
                    </defs>
                    <rect
                        width="100%"
                        height="100%"
                        fill="url(#loading-grid)"
                    />
                </svg>

                {/* Subtle Chalk Dust Flash */}
                <motion.div
                    className="absolute inset-0 bg-white blur-2xl"
                    initial={{ opacity: 0 }}
                    animate={
                        isExiting ? { opacity: [0, 0.1, 0] } : { opacity: 0 }
                    }
                    transition={{
                        duration: 0.8,
                        delay: isExiting ? 0.3 : 0,
                        times: [0, 0.5, 1],
                        ease: "easeInOut",
                    }}
                />
            </motion.div>

            {/* UI Elements Wrapper */}
            <div className="absolute top-1/2 left-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center pt-24">
                <motion.div
                    className="flex flex-col items-center gap-5"
                    animate={
                        isExiting
                            ? { opacity: 0, y: 30, scale: 0.95 } // Same animation
                            : { opacity: 1, y: 0, scale: 1 }
                    }
                    transition={{ duration: 0.3, ease: "easeIn" }} // Same transition config
                >
                    <div className="flex flex-col items-center gap-1.5">
                        <h1 className="text-4xl leading-tight font-bold tracking-tight text-white">
                            chalk
                        </h1>
                        <span className="text-sm text-[#a0a0a0]">
                            loading your canvas…
                        </span>
                    </div>
                    <div className="h-0.5 w-40 overflow-hidden rounded-full bg-[#2a2a2a]">
                        <motion.div
                            className="h-full rounded-full bg-[#ff8ca5]"
                            animate={{ x: ["-100%", "0%", "100%"] }}
                            transition={{
                                duration: 1.6,
                                ease: "easeInOut",
                                repeat: Infinity,
                                repeatDelay: 0.2,
                            }}
                        />
                    </div>
                </motion.div>
            </div>

            {/* The Chalk Icon — Fully Synchronized exit with text */}
            <motion.img
                src="/chalk.png"
                alt="Chalk"
                className="absolute z-50 h-20 w-20 object-contain"
                style={{
                    left: "calc(50% - 40px)",
                    top: "calc(50% - 88px)",
                }}
                animate={
                    isExiting
                        ? {
                              opacity: 0,
                              y: 30, // Absolute same as text
                              scale: 0.95, // Absolute same as text
                          }
                        : {
                              y: ["0px", "-12px", "0px"],
                              rotate: [-3, 3, -3],
                          }
                }
                transition={
                    isExiting
                        ? {
                              duration: 0.3, // Absolute same as text wrapper transition
                              ease: "easeIn", // Absolute same as text wrapper transition
                          }
                        : {
                              duration: 3,
                              ease: "easeInOut",
                              repeat: Infinity,
                          }
                }
            />
        </div>
    );
}
