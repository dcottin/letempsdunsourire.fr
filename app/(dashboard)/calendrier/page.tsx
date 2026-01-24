"use client"

export const dynamic = 'force-dynamic'

import React, { useEffect, useState, useMemo, useRef } from "react"
import { CustomCalendar } from "@/components/custom-calendar"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import {
    ChevronRightIcon,
    FileTextIcon,
    ScrollTextIcon,
    Loader2Icon,
    SaveIcon,
    CalendarIcon,
    PlusIcon,
    DatabaseIcon,
    CheckCircle2Icon,
    ClockIcon,
    SettingsIcon,
    ChevronLeftIcon,
    XIcon
} from "lucide-react"

import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { DevisContratForm } from "@/components/devis-contrat-form"

interface CalendarEvent {
    id: string
    title: string
    start: string
    color: string
    extendedProps: any
    url?: string
}

export default function CalendarPage() {
    const [devisList, setDevisList] = useState<any[]>([])
    const [contratsList, setContratsList] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [formMode, setFormMode] = useState<"devis" | "contrat">("devis")
    const [editingItem, setEditingItem] = useState<any | null>(null)
    const [isFormSaving, setIsFormSaving] = useState(false)

    useEffect(() => {
        fetchData()
    }, [])

    async function fetchData() {
        setIsLoading(true)
        try {
            const { data: devisData } = await supabase.from('devis').select('*')
            const { data: contratsData } = await supabase.from('contrats').select('*')

            setDevisList((devisData || []).map(item => ({ ...item, ...item.data })))
            setContratsList((contratsData || []).map(item => ({ ...item, ...item.data })))
        } catch (e) {
            console.error("Fetch error", e)
        } finally {
            setIsLoading(false)
        }
    }

    const events = useMemo(() => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const devisEvents = devisList
            .filter(d => d.date_debut)
            .map(d => {
                const eventDate = new Date(d.date_debut)
                eventDate.setHours(0, 0, 0, 0)

                let color = "#f59e0b" // Amber (Option)
                if (eventDate < today && d.solde_paye) {
                    color = "#64748b" // Slate (Terminé)
                }

                return {
                    id: `devis-${d.id}`,
                    title: `[Devis] ${d.nom_client}`,
                    start: d.date_debut,
                    color: color,
                    extendedProps: { ...d, type: 'devis' }
                }
            })

        const contratEvents = contratsList
            .filter(c => c.date_debut)
            .map(c => {
                const eventDate = new Date(c.date_debut)
                eventDate.setHours(0, 0, 0, 0)

                let color = "#10b981" // Emerald (Validé)
                if (eventDate < today && c.solde_paye) {
                    color = "#64748b" // Slate (Terminé)
                }

                return {
                    id: `contrat-${c.id}`,
                    title: `[Contrat] ${c.nom_client}`,
                    start: c.date_debut,
                    color: color,
                    extendedProps: { ...c, type: 'contrat' }
                }
            })

        return [...devisEvents, ...contratEvents]
    }, [devisList, contratsList])

    const handleEventClick = (info: any) => {
        const item = info.event.extendedProps
        setFormMode(item.type)
        setEditingItem(item)
        setIsDialogOpen(true)
    }

    const openCreateForm = (mode: "devis" | "contrat") => {
        setFormMode(mode)
        setEditingItem(null)
        setIsDialogOpen(true)
    }

    const [dayViewOpen, setDayViewOpen] = useState(false)
    const [dayViewDate, setDayViewDate] = useState<Date | null>(null)
    const [dayViewEvents, setDayViewEvents] = useState<any[]>([])

    const handleMoreLinkClick = (args: any) => {
        const date = args.date
        // args.allSegs structure from custom-calendar: { event: ... }
        const events = args.allSegs.map((seg: any) => seg.event)

        setDayViewDate(date)
        setDayViewEvents(events)
        setDayViewOpen(true)
    }

    return (
        <div className="flex flex-col h-[calc(100vh-3.5rem)] md:h-full space-y-2 px-3 py-2 md:p-4 md:space-y-2 md:pt-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 md:gap-4 shrink-0">
                <div>
                    <h2 className="text-xl md:text-3xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
                        <CalendarIcon className="size-6 md:size-8 text-indigo-600" />
                        Calendrier
                    </h2>
                    <p className="text-xs md:text-base text-slate-500 hidden md:block">Vue d'ensemble de vos réservations et options.</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <Button
                        onClick={() => openCreateForm("devis")}
                        size="sm"
                        className="bg-amber-600 hover:bg-amber-700 flex-1 md:flex-none shadow-sm text-xs md:text-sm h-8 md:h-9"
                    >
                        <PlusIcon className="mr-1 md:mr-2 size-3 md:size-4" /> Option
                    </Button>
                    <Button
                        onClick={() => openCreateForm("contrat")}
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-700 flex-1 md:flex-none shadow-sm text-xs md:text-sm h-8 md:h-9"
                    >
                        <PlusIcon className="mr-1 md:mr-2 size-3 md:size-4" /> Contrat
                    </Button>
                </div>
            </div>

            {/* Legend */}
            <div className="flex gap-2 md:gap-4 p-2 md:p-3 bg-white rounded-lg md:rounded-xl border border-slate-200 shadow-sm overflow-x-auto no-scrollbar shrink-0">
                <div className="flex items-center gap-1.5 md:gap-2 whitespace-nowrap">
                    <span className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200"></span>
                    <span className="text-[10px] md:text-xs font-semibold text-slate-700 uppercase tracking-wider">Contrats</span>
                </div>
                <div className="flex items-center gap-1.5 md:gap-2 whitespace-nowrap">
                    <span className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-amber-500 shadow-sm shadow-amber-200"></span>
                    <span className="text-[10px] md:text-xs font-semibold text-slate-700 uppercase tracking-wider">Devis</span>
                </div>
                <div className="flex items-center gap-1.5 md:gap-2 whitespace-nowrap">
                    <span className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-slate-500 shadow-sm shadow-slate-200"></span>
                    <span className="text-[10px] md:text-xs font-semibold text-slate-700 uppercase tracking-wider">Terminé</span>
                </div>
            </div>

            <Card className="border-slate-200 shadow-xl overflow-hidden rounded-xl md:rounded-2xl bg-white flex-1 min-h-0 flex flex-col">
                <CardContent className="p-0 flex-1 min-h-0 flex flex-col">
                    <div className="w-full flex-1 fc-custom-theme h-full">
                        <CustomCalendar
                            events={events}
                            onEventClick={handleEventClick}
                            onMoreLinkClick={handleMoreLinkClick}
                        />
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent
                    className="w-screen h-[100dvh] max-w-none m-0 p-0 !pt-[env(safe-area-inset-top,0px)] !pb-[env(safe-area-inset-bottom,0px)] overflow-hidden flex flex-col border-none shadow-none rounded-none sm:rounded-none"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                >
                    <DialogHeader className="px-3 sm:px-6 py-2 sm:py-3 border-b bg-white flex-shrink-0 z-50 flex flex-row items-center justify-between min-h-[52px]">
                        <DialogTitle className="flex items-center gap-1.5 text-sm sm:text-2xl font-bold tracking-tight text-slate-900">
                            {formMode === "devis" ? <FileTextIcon className="size-4 sm:size-7 text-indigo-600" /> : <ScrollTextIcon className="size-4 sm:size-7 text-indigo-600" />}
                            <span className="truncate max-w-[120px] sm:max-w-none">
                                {editingItem ? `Modifier ${formMode === "devis" ? "Devis" : "Contrat"}` : `Nouveau ${formMode === "devis" ? "Devis" : "Contrat"}`}
                            </span>
                        </DialogTitle>
                        <div className="flex items-center gap-2 sm:gap-3">
                            <Button
                                type="submit"
                                form="devis-contrat-form"
                                disabled={isFormSaving}
                                className="h-7 sm:h-9 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md gap-1.5 px-2.5 sm:px-4 text-[10px] sm:text-sm"
                            >
                                {isFormSaving ? (
                                    <>
                                        <Loader2Icon className="size-4 animate-spin" />
                                        <span>...</span>
                                    </>
                                ) : (
                                    <>
                                        <SaveIcon className="size-4" />
                                        <span>Enregistrer</span>
                                    </>
                                )}
                            </Button>
                            <DialogClose asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-9 sm:w-9 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                                    <XIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                                </Button>
                            </DialogClose>
                        </div>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 px-2 sm:px-6 py-2 sm:py-4 pb-[calc(env(safe-area-inset-bottom,0px)+16px)]">
                        <DevisContratForm
                            id="devis-contrat-form"
                            key={editingItem?.id || `${formMode}-${isDialogOpen}`}
                            mode={formMode}
                            initialData={editingItem}
                            onSuccess={() => {
                                setIsDialogOpen(false)
                                fetchData()
                            }}
                            onSavingChange={setIsFormSaving}
                        />
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={dayViewOpen} onOpenChange={setDayViewOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle className="text-center pb-2 border-b">
                            {dayViewDate ? format(dayViewDate, 'd MMMM yyyy', { locale: fr }) : 'Date'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto py-2">
                        {dayViewEvents.map((evt: any, i: number) => (
                            <div
                                key={i}
                                onClick={() => {
                                    setDayViewOpen(false)
                                    // Manually trigger edit
                                    const item = evt.extendedProps
                                    setFormMode(item.type)
                                    setEditingItem(item)
                                    setIsDialogOpen(true)
                                }}
                                className="p-3 rounded-lg border cursor-pointer hover:opacity-80 transition-opacity text-white text-sm font-medium"
                                style={{ backgroundColor: evt.backgroundColor || evt.color }}
                            >
                                {evt.title}
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>

        </div>
    )
}
