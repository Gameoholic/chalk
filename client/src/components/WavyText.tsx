import React, { useEffect } from "react";
import { useAnimate, stagger } from "motion/react";

interface WavyTextProps {
    text: string;
    movement?: number;
    duration?: number;
    staggerDuration?: number;
    staggerStartDelay?: number;
    className?: string;
}

export const WavyText: React.FC<WavyTextProps> = ({
    text,
    movement = -10,
    duration = 2.5,
    staggerDuration = 0.1,
    staggerStartDelay = 0.5,
    className = "",
}) => {
    const [scope, animate] = useAnimate();

    useEffect(() => {
        animate(
            ".letter",
            { y: [0, movement, 0] }, // The wave motion (up 15px then back down)
            {
                duration: duration, // "Slowly"
                repeat: Infinity,
                repeatType: "loop",
                ease: "easeInOut", // Smooth sine-wave feel
                delay: stagger(staggerDuration, {
                    startDelay: staggerStartDelay,
                }), // The "Wave" effect
            }
        );
    }, [animate]);

    const words = text.split(" ");

    return (
        <div ref={scope} className={`flex flex-wrap ${className}`}>
            {words.map((word, wordIndex) => (
                <span
                    key={wordIndex}
                    className="mr-[0.25em] inline-block whitespace-nowrap" // Handle word spacing
                >
                    {word.split("").map((char, charIndex) => (
                        <span
                            key={`${wordIndex}-${charIndex}`}
                            className="letter inline-block" // "inline-block" is required for transform animations
                        >
                            {char}
                        </span>
                    ))}
                </span>
            ))}
        </div>
    );
};
