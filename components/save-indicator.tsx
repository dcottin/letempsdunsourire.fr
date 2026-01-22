"use client"

import { useSaveStatus } from "@/context/save-status-context"
import { Loader2Icon, CheckCircle2Icon, AlertCircleIcon } from "lucide-react"

export function SaveIndicator() {
    const { status } = useSaveStatus()

    if (status === "idle") return null

    return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold animate-in fade-in slide-in-from-top-1">
            {status === "saving" && (
                <div className="flex items-center gap-1.5 text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                    <Loader2Icon className="size-3 animate-spin" />
                    <span>Sauvegarde...</span>
                </div>
            )}
            {status === "saved" && (
                <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    <CheckCircle2Icon className="size-3" />
                    <span>Enregistré</span>
                </div>
            )}
            {status === "error" && (
                <div className="flex items-center gap-1.5 text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                    <AlertCircleIcon className="size-3" />
                    <span>Erreur !</span>
                </div>
            )}
        </div>
    )
}
