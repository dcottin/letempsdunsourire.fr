"use client"

import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

// Set worker source for react-pdf only on client
if (typeof window !== 'undefined') {
    pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

interface AndroidPdfViewerProps {
    url: string | null;
    numPages: number | null;
    setNumPages: (num: number) => void;
    containerWidth: number;
}

export default function AndroidPdfViewer({ url, numPages, setNumPages, containerWidth }: AndroidPdfViewerProps) {
    if (!url) return null;

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages);
    }

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
    );
}
