"use client"

import React, { createContext, useContext, useState, useCallback, useRef } from "react"

type SaveStatus = "idle" | "saving" | "saved" | "error"

interface SaveStatusContextType {
    status: SaveStatus
    setSaving: () => void
    setSaved: () => void
    setError: (msg?: string) => void
    lastSaved: Date | null
}

const SaveStatusContext = createContext<SaveStatusContextType | undefined>(undefined)

export function SaveStatusProvider({ children }: { children: React.ReactNode }) {
    const [status, setStatus] = useState<SaveStatus>("idle")
    const [lastSaved, setLastSaved] = useState<Date | null>(null)
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)

    const setSaving = useCallback(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        setStatus("saving")
    }, [])

    const setSaved = useCallback(() => {
        setStatus("saved")
        setLastSaved(new Date())
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        timeoutRef.current = setTimeout(() => {
            setStatus("idle")
        }, 3000)
    }, [])

    const setError = useCallback((msg?: string) => {
        setStatus("error")
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        // We might want to keep error visible longer or forever until dismissed
    }, [])

    return (
        <SaveStatusContext.Provider value={{ status, setSaving, setSaved, setError, lastSaved }}>
            {children}
        </SaveStatusContext.Provider>
    )
}

export function useSaveStatus() {
    const context = useContext(SaveStatusContext)
    if (context === undefined) {
        throw new Error("useSaveStatus must be used within a SaveStatusProvider")
    }
    return context
}
