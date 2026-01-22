"use client"

import * as React from "react"
import { CheckCircle, ChevronRight } from "lucide-react"

interface SlideToConfirmProps {
    onConfirm: () => void
}

export function SlideToConfirm({ onConfirm }: SlideToConfirmProps) {
    const [confirmed, setConfirmed] = React.useState(false)
    const [translateX, setTranslateX] = React.useState(0)
    const [dragging, setDragging] = React.useState(false)
    const containerRef = React.useRef<HTMLDivElement>(null)
    const startXRef = React.useRef(0)

    const THUMB_SIZE = 56
    const PADDING = 4

    const getMaxTranslate = () => {
        if (!containerRef.current) return 280
        return containerRef.current.offsetWidth - THUMB_SIZE - (PADDING * 2)
    }

    const handleDragStart = (clientX: number) => {
        if (confirmed) return
        setDragging(true)
        startXRef.current = clientX - translateX
    }

    const handleDragMove = (clientX: number) => {
        if (!dragging || confirmed) return
        const max = getMaxTranslate()
        const newX = Math.min(Math.max(0, clientX - startXRef.current), max)
        setTranslateX(newX)
    }

    const handleDragEnd = () => {
        if (!dragging) return
        setDragging(false)

        const max = getMaxTranslate()
        if (translateX / max >= 0.75) {
            setTranslateX(max)
            setConfirmed(true)
            onConfirm()
        } else {
            setTranslateX(0)
        }
    }

    React.useEffect(() => {
        if (!dragging) return

        const onMouseMove = (e: MouseEvent) => handleDragMove(e.clientX)
        const onMouseUp = () => handleDragEnd()
        const onTouchMove = (e: TouchEvent) => handleDragMove(e.touches[0].clientX)
        const onTouchEnd = () => handleDragEnd()

        window.addEventListener('mousemove', onMouseMove)
        window.addEventListener('mouseup', onMouseUp)
        window.addEventListener('touchmove', onTouchMove)
        window.addEventListener('touchend', onTouchEnd)

        return () => {
            window.removeEventListener('mousemove', onMouseMove)
            window.removeEventListener('mouseup', onMouseUp)
            window.removeEventListener('touchmove', onTouchMove)
            window.removeEventListener('touchend', onTouchEnd)
        }
    }, [dragging, translateX])

    if (confirmed) return null

    return (
        <div className="flex flex-col items-center justify-center py-8 space-y-6">
            {/* Shimmering text above slider */}
            <div className="text-center">
                <p className="text-lg font-handwriting font-bold text-indigo-700 italic shimmer-text">
                    "Lu et approuvé, bon pour accord"
                </p>
                <p className="text-sm text-slate-500 mt-2">
                    Glissez pour débloquer la signature ↓
                </p>
            </div>

            {/* Centered slider */}
            <div
                ref={containerRef}
                className="relative w-full max-w-sm h-16 rounded-full bg-gradient-to-r from-indigo-600 to-indigo-500 shadow-lg shadow-indigo-200/50 select-none"
                style={{ padding: PADDING }}
            >
                {/* Animated arrows in background */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
                    <div className="flex items-center gap-1 text-white/40 animate-slide-right ml-16">
                        <ChevronRight className="size-6" />
                        <ChevronRight className="size-6 -ml-4" />
                        <ChevronRight className="size-6 -ml-4" />
                    </div>
                </div>

                {/* Thumb */}
                <div
                    className="relative z-10 rounded-full bg-white shadow-xl flex items-center justify-center cursor-grab active:cursor-grabbing hover:scale-105 active:scale-95 transition-transform"
                    style={{
                        width: THUMB_SIZE,
                        height: THUMB_SIZE,
                        transform: `translateX(${translateX}px)`,
                        transition: dragging ? 'none' : 'transform 0.3s ease-out'
                    }}
                    onMouseDown={(e) => {
                        e.preventDefault()
                        handleDragStart(e.clientX)
                    }}
                    onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
                >
                    <ChevronRight className="size-7 text-indigo-600" />
                </div>
            </div>

            {/* CSS for shimmer animation */}
            <style jsx>{`
                .shimmer-text {
                    background: linear-gradient(
                        90deg,
                        #4338ca 0%,
                        #818cf8 25%,
                        #c7d2fe 50%,
                        #818cf8 75%,
                        #4338ca 100%
                    );
                    background-size: 200% auto;
                    -webkit-background-clip: text;
                    background-clip: text;
                    -webkit-text-fill-color: transparent;
                    animation: shimmer 2s linear infinite;
                }
                
                @keyframes shimmer {
                    0% { background-position: 200% center; }
                    100% { background-position: -200% center; }
                }

                @keyframes slide-right {
                    0%, 100% { opacity: 0.3; transform: translateX(0); }
                    50% { opacity: 0.6; transform: translateX(10px); }
                }

                .animate-slide-right {
                    animation: slide-right 1.5s ease-in-out infinite;
                }
            `}</style>
        </div>
    )
}
