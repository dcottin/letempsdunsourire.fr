"use client"

import React, { useEffect, useState, useMemo } from "react"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import listPlugin from "@fullcalendar/list"
import interactionPlugin from "@fullcalendar/interaction"
import frLocale from "@fullcalendar/core/locales/fr"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import {
    CalendarIcon,
    PlusIcon,
    DatabaseIcon,
    CheckCircle2Icon,
    ClockIcon,
    SettingsIcon,
    ChevronLeftIcon,
    ChevronRightIcon
} from "lucide-react"

import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 overflow-y-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
                        <CalendarIcon className="size-8 text-indigo-600" />
                        Calendrier
                    </h2>
                    <p className="text-slate-500">Vue d'ensemble de vos réservations et options.</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <Button
                        onClick={() => openCreateForm("devis")}
                        className="bg-amber-600 hover:bg-amber-700 flex-1 md:flex-none shadow-sm"
                    >
                        <PlusIcon className="mr-2 size-4" /> Nouvelle Option
                    </Button>
                    <Button
                        onClick={() => openCreateForm("contrat")}
                        className="bg-indigo-600 hover:bg-indigo-700 flex-1 md:flex-none shadow-sm"
                    >
                        <PlusIcon className="mr-2 size-4" /> Nouveau Contrat
                    </Button>
                </div>
            </div>

            {/* Legend */}
            <div className="flex gap-4 p-3 bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-2 whitespace-nowrap">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200"></span>
                    <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Contrats (Validé)</span>
                </div>
                <div className="flex items-center gap-2 whitespace-nowrap">
                    <span className="w-3 h-3 rounded-full bg-amber-500 shadow-sm shadow-amber-200"></span>
                    <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Devis (Option)</span>
                </div>
                <div className="flex items-center gap-2 whitespace-nowrap">
                    <span className="w-3 h-3 rounded-full bg-slate-500 shadow-sm shadow-slate-200"></span>
                    <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Terminé / Payé</span>
                </div>
            </div>

            <Card className="border-slate-200 shadow-xl overflow-hidden rounded-2xl bg-white flex-1 min-h-[600px]">
                <CardContent className="p-0 h-full">
                    <div className="h-full fc-custom-theme">
                        <FullCalendar
                            plugins={[dayGridPlugin, listPlugin, interactionPlugin]}
                            initialView="dayGridMonth"
                            locale={frLocale}
                            events={events}
                            headerToolbar={{
                                left: 'prev,next today',
                                center: 'title',
                                right: 'dayGridMonth,listMonth'
                            }}
                            buttonText={{
                                today: "Aujourd'hui",
                                month: "Mois",
                                list: "Liste"
                            }}
                            eventClick={handleEventClick}
                            height="100%"
                            themeSystem="standard"
                            dayMaxEvents={true}
                            contentHeight="auto"
                            handleWindowResize={true}
                        />
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[1000px] w-[95vw] h-[90vh] flex flex-col p-0 overflow-hidden border-slate-200 shadow-2xl">
                    <DialogHeader className="p-6 pb-4 border-b bg-slate-50/50 flex-shrink-0">
                        <DialogTitle className="text-xl font-bold text-slate-800">
                            {editingItem ? "Modifier" : "Créer"} un {formMode === "devis" ? "devis" : "contrat"}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto p-4 md:p-8">
                        <DevisContratForm
                            mode={formMode}
                            initialData={editingItem}
                            onSuccess={() => {
                                setIsDialogOpen(false)
                                fetchData()
                            }}
                            onCancel={() => setIsDialogOpen(false)}
                        />
                    </div>
                </DialogContent>
            </Dialog>

            <style jsx global>{`
                .fc {
                    --fc-border-color: #e2e8f0;
                    --fc-today-bg-color: #f0f9ff;
                    --fc-button-bg-color: #4f46e5;
                    --fc-button-border-color: #4f46e5;
                    --fc-button-hover-bg-color: #4338ca;
                    --fc-button-hover-border-color: #4338ca;
                    --fc-button-active-bg-color: #3730a3;
                    --fc-button-active-border-color: #3730a3;
                    font-family: inherit;
                }
                .fc .fc-toolbar-title {
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: #1e293b;
                }
                .fc .fc-button-primary {
                    border-radius: 0.75rem;
                    text-transform: capitalize;
                    font-weight: 500;
                }
                .fc .fc-event {
                    border: none;
                    border-radius: 6px;
                    padding: 2px 6px;
                    cursor: pointer;
                    margin: 1px 0;
                    transition: transform 0.1s ease;
                }
                .fc .fc-event:hover {
                    transform: scale(1.02);
                }
                .fc .fc-col-header-cell-cushion {
                    padding: 12px;
                    color: #64748b;
                    text-transform: uppercase;
                    font-size: 0.75rem;
                    font-weight: 700;
                }
                .fc .fc-daygrid-day-number {
                    font-weight: 500;
                    color: #64748b;
                    padding: 8px;
                }
                .fc .fc-list-event {
                    cursor: pointer;
                }
            `}</style>
        </div>
    )
}
