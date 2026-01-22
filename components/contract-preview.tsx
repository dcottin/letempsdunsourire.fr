"use client"

import React from "react"
import dynamic from "next/dynamic"
import { ContractDocument } from "./contract-pdf"

// Dynamically import PDFViewer with no SSR to avoid server-side errors
const PDFViewer = dynamic(
    () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
    {
        ssr: false,
        loading: () => <div className="h-[600px] w-full flex items-center justify-center bg-slate-50 text-slate-400">Chargement de l'aperçu...</div>
    }
)

interface ContractPreviewProps {
    data: any
    settings?: any
    id?: string
    isInvoice?: boolean
    mode?: "devis" | "contrat"
    displayMode?: 'all' | 'contract_only' | 'cgv_only'
    className?: string
    height?: string
}

export function ContractPreview({
    data,
    settings,
    id,
    isInvoice,
    mode,
    displayMode = 'all',
    className = "",
    height
}: ContractPreviewProps) {
    if (!data) return null

    // Responsive height: smaller on mobile, larger on desktop
    // We use a wrapper to control this via Tailwind or the height prop
    const defaultHeightClass = displayMode === 'all' ? "h-[70vh] md:h-[850px]" : "h-[60vh] md:h-[600px]"

    return (
        <div id={id} className={`w-full ${className} ${!height ? defaultHeightClass : ""}`} style={height ? { height } : {}}>
            <PDFViewer
                width="100%"
                height="100%"
                className="rounded-lg shadow-sm border border-slate-200"
                showToolbar={true}
            >
                <ContractDocument
                    data={data}
                    settings={settings}
                    isInvoice={isInvoice}
                    mode={mode}
                    displayMode={displayMode}
                />
            </PDFViewer>
        </div>
    )
}
