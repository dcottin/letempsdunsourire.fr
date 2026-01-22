"use client"

import React from "react"

interface FormattedTextProps {
    text: string
    className?: string
}

export function FormattedText({ text, className = "" }: FormattedTextProps) {
    if (!text) return null

    // Helper function to parse common patterns
    const parseFormatting = (input: string) => {
        // Phrases critiques à détecter automatiquement
        const criticalPhrases = [
            "L'INSTALLATION DU PHOTOBOOTH N'EST PAS PERMISE EN EXTÉRIEUR",
            "AUCUNEMENT LE DROIT DE DÉPLACER LE MATÉRIEL UNE FOIS INSTALLÉ"
        ]

        let segments: (string | React.ReactNode)[] = [input]

        // 1. Détection automatique des phrases critiques (Rouge + Gras + Souligné)
        criticalPhrases.forEach(phrase => {
            const newSegments: (string | React.ReactNode)[] = []
            segments.forEach(seg => {
                if (typeof seg === 'string') {
                    const parts = seg.split(new RegExp(`(${phrase})`, 'gi'))
                    parts.forEach((part, i) => {
                        if (part.toUpperCase() === phrase) {
                            newSegments.push(
                                <span key={`${phrase}-${i}`} className="text-red-600 font-black underline decoration-red-600 underline-offset-4 uppercase">
                                    {part}
                                </span>
                            )
                        } else if (part !== "") {
                            newSegments.push(part)
                        }
                    })
                } else {
                    newSegments.push(seg)
                }
            })
            segments = newSegments
        })

        // 2. Traitement des balises manuelles résiduelles dans les segments de texte
        const finalSegments: (string | React.ReactNode)[] = []
        segments.forEach((seg, segIdx) => {
            if (typeof seg === 'string') {
                const parts = seg.split(/(\[red\].*?\[\/red\]|\*\*.*?\*\*|__.*?__)/g)
                parts.forEach((part, i) => {
                    if (part.startsWith("[red]") && part.endsWith("[/red]")) {
                        finalSegments.push(<span key={`red-${segIdx}-${i}`} className="text-red-500 font-semibold">{part.substring(5, part.length - 6)}</span>)
                    } else if (part.startsWith("**") && part.endsWith("**")) {
                        finalSegments.push(<strong key={`bold-${segIdx}-${i}`} className="font-bold text-slate-900">{part.substring(2, part.length - 2)}</strong>)
                    } else if (part.startsWith("__") && part.endsWith("__")) {
                        finalSegments.push(<span key={`under-${segIdx}-${i}`} className="underline underline-offset-2">{part.substring(2, part.length - 2)}</span>)
                    } else if (part !== "") {
                        finalSegments.push(part)
                    }
                })
            } else {
                finalSegments.push(seg)
            }
        })

        return finalSegments
    }

    return (
        <div className={className}>
            {text.split("\n").map((line, i) => (
                <p key={i} className={line.trim() === "" ? "h-4" : ""}>
                    {parseFormatting(line)}
                </p>
            ))}
        </div>
    )
}
