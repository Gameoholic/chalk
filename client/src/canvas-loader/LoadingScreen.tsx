import { motion, AnimatePresence } from "motion/react";

interface LoadingScreenProps {
    isReady: boolean;
    onDone?: () => void;
}

export default function LoadingScreen({ isReady, onDone }: LoadingScreenProps) {
    return (
        <AnimatePresence onExitComplete={onDone}>
            {!isReady && (
                <motion.div
                    key="loading-screen"
                    className="fixed inset-0 z-[300] flex items-center justify-center overflow-hidden"
                    style={{ backgroundColor: "#1a1a1a" }}
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                >
                    {/* Subtle grid background — matches the canvas grid */}
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

                    {/* Center content */}
                    <motion.div
                        className="relative z-10 flex flex-col items-center gap-5"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                    >
                        {/* Logo — same float animation as WelcomeScreen */}
                        <motion.img
                            src="/chalk.png"
                            alt="Chalk"
                            className="h-20 w-20 object-contain"
                            animate={{
                                y: [0, -10, 0],
                                rotate: [-3, 3, -3],
                            }}
                            transition={{
                                duration: 3,
                                ease: "easeInOut",
                                repeat: Infinity,
                            }}
                        />

                        {/* Wordmark — matches WelcomeScreen h1 style */}
                        <div className="flex flex-col items-center gap-1.5">
                            <h1 className="text-4xl leading-tight font-bold tracking-tight text-white">
                                chalk
                            </h1>
                            <span
                                className="text-sm"
                                style={{ color: "#a0a0a0" }}
                            >
                                loading your canvas…
                            </span>
                        </div>

                        {/* Pink progress bar */}
                        <div
                            className="h-0.5 w-40 overflow-hidden rounded-full"
                            style={{ backgroundColor: "#2a2a2a" }}
                        >
                            <motion.div
                                className="h-full rounded-full"
                                style={{ backgroundColor: "#ff8ca5" }}
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
                </motion.div>
            )}
        </AnimatePresence>
    );
}
