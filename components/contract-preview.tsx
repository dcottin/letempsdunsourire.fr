"use client"

import React, { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { ContractDocument } from "./contract-pdf"
import { ContractHtml } from "./contract-html"
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Set worker source for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// Dynamically import PDFViewer and BlobProvider with no SSR
const PDFViewer = dynamic(
    () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
    {
        ssr: false,
        loading: () => <div className="h-[600px] w-full flex items-center justify-center bg-slate-50 text-slate-400">Chargement de l'aperçu...</div>
    }
)
const BlobProvider = dynamic(
    () => import("@react-pdf/renderer").then((mod) => mod.BlobProvider),
    { ssr: false }
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
    const [isAndroid, setIsAndroid] = useState(false)
    const [numPages, setNumPages] = useState<number | null>(null);
    const [containerWidth, setContainerWidth] = useState<number>(0);

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages);
    }

    useEffect(() => {
        const checkIsAndroid = () => {
            const userAgent = typeof window.navigator === "undefined" ? "" : navigator.userAgent
            const android = Boolean(userAgent.match(/Android/i))
            setIsAndroid(android)
        }
        checkIsAndroid()

        // Simple responsive width calculation
        const updateWidth = () => {
            if (typeof window !== 'undefined') {
                setContainerWidth(Math.min(window.innerWidth - 32, 600)); // Max width 600px, otherwise full width minus padding
            }
        }

        updateWidth();
        window.addEventListener('resize', updateWidth);
        return () => window.removeEventListener('resize', updateWidth);
    }, [])

    if (!data) return null

    // Responsive height: smaller on mobile, larger on desktop
    // We use a wrapper to control this via Tailwind or the height prop
    const defaultHeightClass = displayMode === 'all' ? "h-[70vh] md:h-[850px]" : "h-[60vh] md:h-[600px]"

    // Only fallback to React-PDF (Canvas rendering) for Android where PDF iframes are problematic
    if (isAndroid) {
        return (
            <div id={id} className={`w-full overflow-y-auto bg-slate-100/50 p-2 rounded-lg border border-slate-200 ${className} ${!height ? "h-[60vh]" : ""}`} style={height ? { height } : {}}>
                <BlobProvider document={
                    <ContractDocument
                        data={data}
                        settings={settings}
                        isInvoice={isInvoice}
                        mode={mode}
                        displayMode={displayMode}
                    />
                }>
                    {({ url, loading, error }: { url: string | null; loading: boolean; error: any }) => {
                        if (loading) {
                            return (
                                <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                                    <span className="text-sm font-medium">Génération du PDF...</span>
                                </div>
                            )
                        }

                        if (url) {
                            return (
                                <div className="flex flex-col items-center w-full">
                                    <Document
                                        file={url}
                                        onLoadSuccess={onDocumentLoadSuccess}
                                        className="flex flex-col gap-4"
                                        loading={
                                            <div className="flex items-center justify-center p-8 text-slate-400">
                                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-400 mr-2"></div>
                                                Chargement du rendu PDF...
                                            </div>
                                        }
                                    >
                                        {Array.from(new Array(numPages), (el, index) => (
                                            <Page
                                                key={`page_${index + 1}`}
                                                pageNumber={index + 1}
                                                width={containerWidth || 300}
                                                className="shadow-sm border border-slate-200"
                                                renderTextLayer={false}
                                                renderAnnotationLayer={false}
                                            />
                                        ))}
                                    </Document>
                                </div>
                            )
                        }

                        return <div className="text-center p-4 text-red-500">Erreur de chargement du PDF via Blob</div>;
                    }}
                </BlobProvider>
            </div>
        )
    }

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
