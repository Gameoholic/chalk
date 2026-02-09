"use client";

import {
    animate,
    motion,
    SpringOptions,
    useMotionValue,
    useSpring,
    useTransform,
    MotionValue,
} from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * ==============   Hooks   ================
 */

function useMouse() {
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    useEffect(() => {
        const handlePointerMove = (e: PointerEvent) => {
            x.set(e.clientX);
            y.set(e.clientY);
        };

        window.addEventListener("pointermove", handlePointerMove);
        return () =>
            window.removeEventListener("pointermove", handlePointerMove);
    }, [x, y]);

    return { x, y };
}

/**
 * ==============   Utils   ================
 */

function calculateAngle(index: number, totalInRing: number): number {
    return (index / totalInRing) * Math.PI * 2;
}

function calculateBasePosition(angle: number, radius: number) {
    return {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
    };
}

function calculateHue(angle: number): number {
    const hueDegrees = (angle * 180) / Math.PI - 90 - 180;
    return ((hueDegrees % 360) + 360) % 360;
}

interface ColorDotProps {
    ring: number;
    index: number;
    totalInRing: number;
    centerX: number;
    centerY: number;
    pointerX: MotionValue<number>;
    pointerY: MotionValue<number>;
    pushMagnitude: number;
    pushSpring: SpringOptions;
    radius: number;
    selectedColor: string | null;
    setSelectedColor: (color: string | null) => void;
}

function ColorDot({
    ring,
    index,
    totalInRing,
    centerX,
    centerY,
    pointerX,
    pointerY,
    pushMagnitude,
    pushSpring,
    radius,
    selectedColor,
    setSelectedColor,
}: ColorDotProps) {
    const baseRadius = ring * 20;
    const angle = calculateAngle(index, totalInRing);
    const { x: baseX, y: baseY } = calculateBasePosition(angle, baseRadius);

    let color = "hsl(0, 0%, 100%)";
    let normalizedHue = 0;
    if (ring !== 0) {
        normalizedHue = calculateHue(angle);
        color =
            ring === 1
                ? `hsl(${normalizedHue}, 60%, 85%)`
                : `hsl(${normalizedHue}, 90%, 60%)`;
    }

    const pushDistance = useTransform(() => {
        if (centerX === 0 || centerY === 0) return 0;

        const px = pointerX.get();
        const py = pointerY.get();

        const dx = px - centerX;
        const dy = py - centerY;
        const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);

        if (distanceFromCenter > radius + 100) return 0;

        const dotX = centerX + baseX;
        const dotY = centerY + baseY;

        const cursorToDotX = dotX - px;
        const cursorToDotY = dotY - py;
        const cursorToDotDistance = Math.sqrt(
            cursorToDotX * cursorToDotX + cursorToDotY * cursorToDotY
        );

        const minDistance = 80;
        if (cursorToDotDistance < minDistance) {
            const pushStrength = 1 - cursorToDotDistance / minDistance;
            return pushStrength * pushMagnitude;
        }

        return 0;
    });

    const pushAngle = useTransform(() => {
        if (centerX === 0 || centerY === 0) return angle;

        const px = pointerX.get();
        const py = pointerY.get();

        const dotX = centerX + baseX;
        const dotY = centerY + baseY;

        const cursorToDotX = dotX - px;
        const cursorToDotY = dotY - py;

        return Math.atan2(cursorToDotY, cursorToDotX);
    });

    const pushX = useTransform(() => {
        const distance = pushDistance.get();
        const a = pushAngle.get();
        return Math.cos(a) * distance;
    });

    const pushY = useTransform(() => {
        const distance = pushDistance.get();
        const a = pushAngle.get();
        return Math.sin(a) * distance;
    });

    const springPushX = useSpring(pushX, pushSpring);
    const springPushY = useSpring(pushY, pushSpring);

    const x = useTransform(() => baseX + springPushX.get());
    const y = useTransform(() => baseY + springPushY.get());

    const dotVariants = {
        default: {
            scale: 1,
        },
        hover: {
            scale: 1.5,
            transition: { duration: 0.13 },
        },
    };

    const ringVariants = {
        default: {
            opacity: 0,
        },
        hover: {
            opacity: 0.4,
            transition: { duration: 0.13 },
        },
    };

    return (
        <motion.div
            className="absolute top-1/2 left-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full"
            style={{
                x,
                y,
                backgroundColor: color,
                willChange: "transform, background-color",
            }}
            variants={dotVariants}
            initial="default"
            whileHover="hover"
            whileTap={{ scale: 1.2 }}
            onTap={() => {
                if (selectedColor === color) {
                    setSelectedColor(null);
                } else {
                    setSelectedColor(color);
                }
            }}
            transition={{
                scale: { type: "spring", damping: 30, stiffness: 200 },
            }}
        >
            <motion.div
                className="pointer-events-none absolute inset-0 rounded-full border-2 border-white mix-blend-overlay"
                variants={ringVariants}
            />
        </motion.div>
    );
}

interface GradientCircleProps {
    index: number;
    totalInRing: number;
    centerX: number;
    centerY: number;
    pointerX: MotionValue<number>;
    pointerY: MotionValue<number>;
    containerRadius: number;
}

function GradientCircle({
    index,
    totalInRing,
    centerX,
    centerY,
    pointerX,
    pointerY,
    containerRadius,
}: GradientCircleProps) {
    const angle = calculateAngle(index, totalInRing);
    const baseRadius = containerRadius - 40;
    const { x: baseX, y: baseY } = calculateBasePosition(angle, baseRadius);
    const normalizedHue = calculateHue(angle);

    const gradient = `radial-gradient(circle, hsla(${normalizedHue}, 90%, 60%, 1) 0%, hsla(${normalizedHue}, 90%, 60%, 0) 66%)`;

    const proximity = useTransform(() => {
        if (centerX === 0 || centerY === 0) return 0;

        const px = pointerX.get();
        const py = pointerY.get();

        const gradientX = centerX + baseX;
        const gradientY = centerY + baseY;

        const dx = px - gradientX;
        const dy = py - gradientY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const maxDistance = 100;
        const proximityValue = Math.max(0, 1 - distance / maxDistance);

        return proximityValue;
    });

    const { opacity, scale } = useTransform(proximity, [0, 1], {
        opacity: [0.15, 0.35],
        scale: [1, 1.2],
    });

    const springOpacity = useSpring(opacity, {
        damping: 30,
        stiffness: 100,
    });
    const springScale = useSpring(scale, {
        damping: 30,
        stiffness: 100,
    });

    return (
        <motion.div
            className="pointer-events-none absolute top-1/2 left-1/2 h-[150px] w-[150px] -translate-x-1/2 -translate-y-1/2 rounded-full mix-blend-color-burn"
            style={{
                x: baseX,
                y: baseY,
                opacity: springOpacity,
                scale: springScale,
                background: gradient,
                willChange: "transform, opacity",
            }}
        />
    );
}

interface TransparencySliderProps {
    opacity: number;
    setOpacity: (opacity: number) => void;
    selectedColor: string | null;
}

function TransparencySlider({
    opacity,
    setOpacity,
    selectedColor,
}: TransparencySliderProps) {
    const trackRef = useRef<SVGPathElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    // Arc parameters
    const radius = 85;
    const startAngle = 220; // degrees
    const endAngle = 320; // degrees
    const centerX = 95;
    const centerY = 95;

    // Calculate handle position based on opacity
    const normalizedOpacity = opacity / 100;
    const angle = startAngle + normalizedOpacity * (endAngle - startAngle);
    const radians = (angle * Math.PI) / 180;

    const handleX = centerX + Math.cos(radians) * radius;
    const handleY = centerY + Math.sin(radians) * radius;

    // Create arc path
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const startX = centerX + Math.cos(startRad) * radius;
    const startY = centerY + Math.sin(startRad) * radius;
    const endX = centerX + Math.cos(endRad) * radius;
    const endY = centerY + Math.sin(endRad) * radius;

    const arcPath = `M ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${endX} ${endY}`;

    // Calculate arc length for proper dash array
    const arcLength = radius * (((endAngle - startAngle) * Math.PI) / 180);
    const progressLength = arcLength * normalizedOpacity;

    const updateOpacityFromEvent = (e: React.PointerEvent | PointerEvent) => {
        if (!trackRef.current) return;

        const svg = trackRef.current.ownerSVGElement;
        if (!svg) return;

        const rect = svg.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const dx = x - centerX;
        const dy = y - centerY;
        let angle = (Math.atan2(dy, dx) * 180) / Math.PI;

        // Normalize angle to 0-360
        if (angle < 0) angle += 360;

        // Clamp to arc range
        if (angle < startAngle && angle > endAngle) {
            // Determine which end is closer
            const distToStart = Math.min(
                Math.abs(angle - startAngle),
                Math.abs(angle + 360 - startAngle)
            );
            const distToEnd = Math.min(
                Math.abs(angle - endAngle),
                Math.abs(angle + 360 - endAngle)
            );
            angle = distToStart < distToEnd ? startAngle : endAngle;
        } else if (angle < startAngle) {
            angle = startAngle;
        } else if (angle > endAngle && angle < 360) {
            angle = endAngle;
        }

        const normalizedAngle = (angle - startAngle) / (endAngle - startAngle);
        const newOpacity = Math.max(0, Math.min(100, normalizedAngle * 100));

        setOpacity(newOpacity);
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        e.stopPropagation();
        setIsDragging(true);
        updateOpacityFromEvent(e);
    };

    const handleTrackClick = (e: React.PointerEvent) => {
        e.stopPropagation();
        updateOpacityFromEvent(e);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (isDragging) {
            e.stopPropagation();
            updateOpacityFromEvent(e);
        }
    };

    const handlePointerUp = () => {
        setIsDragging(false);
    };

    useEffect(() => {
        if (isDragging) {
            const handleWindowPointerMove = (e: PointerEvent) => {
                updateOpacityFromEvent(e);
            };

            window.addEventListener("pointermove", handleWindowPointerMove);
            window.addEventListener("pointerup", handlePointerUp);

            return () => {
                window.removeEventListener(
                    "pointermove",
                    handleWindowPointerMove
                );
                window.removeEventListener("pointerup", handlePointerUp);
            };
        }
    }, [isDragging]);

    return (
        <div className="pointer-events-auto relative h-[190px] w-[190px]">
            <svg
                width="190"
                height="190"
                viewBox="0 0 190 190"
                onPointerMove={handlePointerMove}
                className="overflow-visible"
            >
                <defs>
                    <linearGradient
                        id="opacityGradient"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="0%"
                    >
                        <stop offset="0%" stopColor="white" stopOpacity="0" />
                        <stop offset="100%" stopColor="white" stopOpacity="1" />
                    </linearGradient>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Clickable background track */}
                <path
                    ref={trackRef}
                    d={arcPath}
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.1)"
                    strokeWidth="12"
                    strokeLinecap="round"
                    className="cursor-pointer"
                    onPointerDown={handleTrackClick}
                />

                {/* Gradient track */}
                <path
                    d={arcPath}
                    fill="none"
                    stroke="url(#opacityGradient)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    opacity={0.4}
                    className="pointer-events-none"
                />

                {/* Active progress */}
                <motion.path
                    d={arcPath}
                    fill="none"
                    stroke="white"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={`${progressLength} ${arcLength}`}
                    opacity={0.6}
                    animate={{
                        opacity: selectedColor ? 0.8 : 0.6,
                    }}
                    transition={{
                        duration: 0.2,
                    }}
                    className="pointer-events-none"
                />

                {/* Handle */}
                <motion.g
                    onPointerDown={handlePointerDown}
                    style={{ cursor: isDragging ? "grabbing" : "grab" }}
                >
                    <motion.circle
                        cx={handleX}
                        cy={handleY}
                        r="14"
                        fill="white"
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 1.1 }}
                        transition={{
                            type: "spring",
                            damping: 30,
                            stiffness: 200,
                        }}
                        filter={isDragging ? "url(#glow)" : undefined}
                    />
                    <motion.circle
                        cx={handleX}
                        cy={handleY}
                        r="14"
                        fill="none"
                        stroke="white"
                        strokeWidth="2"
                        opacity={0}
                        whileHover={{ opacity: 0.4, scale: 1.3 }}
                        transition={{ duration: 0.13 }}
                        className="pointer-events-none mix-blend-overlay"
                    />
                    <text
                        x={handleX}
                        y={handleY}
                        textAnchor="middle"
                        dominantBaseline="central"
                        className="pointer-events-none font-mono text-[9px] font-semibold select-none"
                        fill="#0b1011"
                    >
                        {Math.round(opacity)}
                    </text>
                </motion.g>
            </svg>
        </div>
    );
}

export interface ColorPickerProps {
    pushMagnitude?: number;
    pushSpring?: SpringOptions;
    value?: string | null;
    onChange?: (color: string) => void;
    opacity?: number;
    onOpacityChange?: (opacity: number) => void;
}

export default function ColorPicker({
    pushMagnitude = 5,
    pushSpring = {
        damping: 30,
        stiffness: 100,
    },
    value,
    onChange,
    opacity: opacityProp,
    onOpacityChange,
}: ColorPickerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [{ centerX, centerY, radius }, setContainerDimensions] = useState({
        centerX: 0,
        centerY: 0,
        radius: 200,
    });

    const pointer = useMouse();

    const [internalColor, setInternalColor] = useState<string | null>(null);
    const [internalOpacity, setInternalOpacity] = useState<number>(100);

    const selectedColor = value !== undefined ? value : internalColor;
    const opacity = opacityProp !== undefined ? opacityProp : internalOpacity;

    const handleColorSelect = (newColor: string | null) => {
        setInternalColor(newColor);
        if (onChange && newColor) {
            onChange(newColor);
        }
    };

    const handleOpacityChange = (newOpacity: number) => {
        setInternalOpacity(newOpacity);
        if (onChange) {
            // onChange(internalColor!);
        }
    };

    useLayoutEffect(() => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setContainerDimensions({
                centerX: rect.left + rect.width / 2,
                centerY: rect.top + rect.height / 2,
                radius: rect.width / 2,
            });
        }
    }, []);

    const rings = [{ count: 1 }, { count: 6 }, { count: 12 }];

    const dots: Array<{
        ring: number;
        index: number;
        totalInRing: number;
    }> = [];

    rings.forEach((ring, ringIndex) => {
        for (let i = 0; i < ring.count; i++) {
            dots.push({
                ring: ringIndex,
                index: i,
                totalInRing: ring.count,
            });
        }
    });

    const originalStopValues: string[] = [];
    for (let i = 0; i <= 360; i += 30) {
        originalStopValues.push(`hsl(${i}, 90%, 60%)`);
    }

    const stopMotionValues = originalStopValues.map((value) =>
        useMotionValue(value)
    );

    useEffect(() => {
        if (selectedColor !== null) {
            for (const stopValue of stopMotionValues) {
                animate(stopValue, selectedColor, {
                    duration: 0.2,
                });
            }
        } else {
            for (let i = 0; i < stopMotionValues.length; i++) {
                animate(stopMotionValues[i], originalStopValues[i], {
                    duration: 0.2,
                });
            }
        }
    }, [selectedColor]);

    const gradientBackground = useTransform(() => {
        let stops = "";
        for (let i = 0; i < stopMotionValues.length; i++) {
            stops += stopMotionValues[i].get();
            if (i < stopMotionValues.length - 1) {
                stops += ", ";
            }
        }
        return `conic-gradient(from 0deg, ${stops})`;
    });

    const gradientScale = useMotionValue(1);

    useEffect(() => {
        if (selectedColor !== null) {
            animate(gradientScale, 1.1, {
                type: "spring",
                visualDuration: 0.2,
                bounce: 0.8,
                velocity: 2,
            });
        } else {
            animate(gradientScale, 1, {
                type: "spring",
                visualDuration: 0.2,
                bounce: 0,
            });
        }
    }, [selectedColor, gradientScale]);

    return (
        <div className="relative flex flex-col items-center gap-4">
            {/* Color Picker */}
            <div className="relative flex h-[140px] w-[140px] items-center justify-center">
                <div className="absolute inset-0 h-full w-full">
                    <motion.div
                        className="absolute inset-0 z-0 h-full w-full rounded-full"
                        style={{
                            background: gradientBackground,
                            scale: gradientScale,
                            opacity: opacity / 100,
                        }}
                    />
                    <motion.div
                        className="absolute inset-0 z-10 h-full w-full rounded-full bg-[#0b1011]"
                        animate={{
                            scale: selectedColor !== null ? 0.9 : 0.98,
                        }}
                        transition={{
                            type: "spring",
                            visualDuration: 0.2,
                            bounce: 0.2,
                        }}
                    />
                </div>

                <div
                    ref={containerRef}
                    className="relative z-20 h-[calc(100%-5px)] w-[calc(100%-5px)] overflow-visible rounded-full"
                >
                    {Array.from({ length: 6 }).map((_, index) => (
                        <GradientCircle
                            key={`gradient-${index}`}
                            index={index}
                            totalInRing={6}
                            centerX={centerX}
                            centerY={centerY}
                            pointerX={pointer.x}
                            pointerY={pointer.y}
                            containerRadius={radius}
                        />
                    ))}
                    {dots
                        .slice()
                        .reverse()
                        .map((dot) => (
                            <ColorDot
                                key={`${dot.ring}-${dot.index}`}
                                ring={dot.ring}
                                index={dot.index}
                                totalInRing={dot.totalInRing}
                                centerX={centerX}
                                centerY={centerY}
                                pointerX={pointer.x}
                                pointerY={pointer.y}
                                radius={radius}
                                pushMagnitude={pushMagnitude}
                                pushSpring={pushSpring}
                                selectedColor={selectedColor}
                                setSelectedColor={handleColorSelect}
                            />
                        ))}
                </div>
            </div>

            {/* Transparency Slider */}
            <TransparencySlider
                opacity={opacity}
                setOpacity={handleOpacityChange}
                selectedColor={selectedColor}
            />
        </div>
    );
}
