"use client"

import * as React from "react"
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    isToday,
    isWeekend,
    parseISO
} from "date-fns"
import { fr } from "date-fns/locale"
import { ChevronLeft, ChevronRight, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface CalendarEvent {
    id: string
    title: string
    start: string // ISO string YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
    color?: string
    extendedProps?: any
    backgroundColor?: string // alias for color
}

interface CustomCalendarProps {
    events: CalendarEvent[]
    onEventClick: (info: { event: CalendarEvent }) => void
    onMoreLinkClick: (args: { date: Date, allSegs: any[] }) => void
    onDateClick?: (date: Date) => void
    materiels?: any[]
    bookings?: any[]
}

export function CustomCalendar({ events, onEventClick, onMoreLinkClick, onDateClick, materiels = [], bookings = [] }: CustomCalendarProps) {
    const [currentDate, setCurrentDate] = React.useState(new Date())
    const [view, setView] = React.useState<'month' | 'list'>('month')

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1))
    const goToToday = () => setCurrentDate(new Date())

    // Generate grid days
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart, { locale: fr })
    const endDate = endOfWeek(monthEnd, { locale: fr })

    const calendarDays = eachDayOfInterval({
        start: startDate,
        end: endDate,
    })

    const weekDays = eachDayOfInterval({
        start: startOfWeek(new Date(), { locale: fr }),
        end: endOfWeek(new Date(), { locale: fr })
    }).map(day => format(day, 'EEE', { locale: fr }))

    // Helper to get events for a day
    const getEventsForDay = (day: Date) => {
        return events.filter(event => {
            const eventDate = parseISO(event.start)
            return isSameDay(eventDate, day)
        })
    }

    // Helper to get availability for a day
    const getAvailabilityForDay = (day: Date) => {
        if (!materiels || materiels.length === 0) return null

        const checkTime = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime()

        const bookingsToday = bookings.filter(b => {
            if (!b.date_debut) return false

            // Parse start
            const start = new Date(b.date_debut)
            const startTime = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime()

            // Parse end (or default to start)
            let endTime = startTime
            if (b.date_fin) {
                const end = new Date(b.date_fin)
                endTime = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime()
            }

            if (startTime < endTime) {
                return checkTime >= startTime && checkTime < endTime
            }
            return checkTime >= startTime && checkTime <= endTime // Fallback for equal or other cases (though strictly checkTime === startTime is enough if start==end)
        })

        // Count bookings with assigned equipment (unique machines blocked)
        const assignedBookings = bookingsToday.filter(b => b.equipment_id && b.equipment_id !== 'none')
        const uniqueBusyIds = new Set(assignedBookings.map(b => b.equipment_id))

        // Count bookings without equipment (orphans) - they still consume capacity
        const unassignedCount = bookingsToday.length - assignedBookings.length

        // Total load = unique machines blocked + unassigned demands
        const totalLoad = uniqueBusyIds.size + unassignedCount

        return {
            count: Math.max(0, materiels.length - totalLoad),
            hasUnassigned: unassignedCount > 0
        }
    }

    return (
        <div className="flex flex-col h-full w-full">
            {/* Header */}
            <div className="flex flex-col gap-2 md:flex-row md:items-center justify-between p-3 md:p-4 border-b border-slate-200">
                <div className="flex items-center justify-between md:justify-start gap-2 w-full md:w-auto">
                    <div className="flex items-center gap-1 md:gap-2">
                        <Button
                            size="icon"
                            onClick={prevMonth}
                            className="h-7 w-7 md:h-8 md:w-8 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl shadow-sm border-0"
                        >
                            <ChevronLeft className="h-3 w-3 md:h-4 md:w-4" />
                        </Button>
                        <Button
                            size="icon"
                            onClick={nextMonth}
                            className="h-7 w-7 md:h-8 md:w-8 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl shadow-sm border-0"
                        >
                            <ChevronRight className="h-3 w-3 md:h-4 md:w-4" />
                        </Button>
                        <Button
                            size="sm"
                            onClick={goToToday}
                            className="ml-1 md:ml-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl shadow-sm border-0 px-2 md:px-3 h-7 md:h-8 text-xs md:text-sm font-medium capitalize"
                        >
                            Auj.
                        </Button>
                    </div>

                    <h2 className="block md:hidden text-lg font-bold text-slate-800 capitalize">
                        {format(currentDate, 'MMMM yyyy', { locale: fr })}
                    </h2>

                    {/* View Switcher Mobile */}
                    <div className="flex md:hidden bg-slate-100 p-1 rounded-xl">
                        <button
                            onClick={() => setView('month')}
                            className={cn(
                                "px-2 py-1 text-[10px] font-semibold rounded-lg transition-all",
                                view === 'month' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            Mois
                        </button>
                        <button
                            onClick={() => setView('list')}
                            className={cn(
                                "px-2 py-1 text-[10px] font-semibold rounded-lg transition-all",
                                view === 'list' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            Liste
                        </button>
                    </div>
                </div>

                <h2 className="hidden md:block text-xl font-bold text-slate-800 capitalize">
                    {format(currentDate, 'MMMM yyyy', { locale: fr })}
                </h2>

                {/* View Switcher Desktop */}
                <div className="hidden md:flex bg-slate-100 p-1 rounded-xl">
                    <button
                        onClick={() => setView('month')}
                        className={cn(
                            "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                            view === 'month' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        Mois
                    </button>
                    <button
                        onClick={() => setView('list')}
                        className={cn(
                            "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                            view === 'list' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        Liste
                    </button>
                </div>
            </div>

            {view === 'month' && (
                <>
                    {/* Weekday Headers */}
                    <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                        {weekDays.map((day, i) => (
                            <div key={i} className="py-2 md:py-3 text-center text-[10px] md:text-xs font-bold text-slate-600 uppercase tracking-wider">
                                {day.replace('.', '')}
                            </div>
                        ))}
                    </div>

                    {/* Days Grid */}
                    <div
                        className="grid grid-cols-7 flex-1 min-h-0"
                        style={{ gridTemplateRows: `repeat(${calendarDays.length / 7}, minmax(0, 1fr))` }}
                    >
                        {calendarDays.map((day, dayIdx) => {
                            const dayEvents = getEventsForDay(day)
                            const isCurrentMonth = isSameMonth(day, monthStart)
                            const isTodayDate = isToday(day)
                            const availability = getAvailabilityForDay(day)

                            // Show individual events only if they fit. If there are too many, show just the summary button.
                            const MAX_EVENTS = 1
                            const isOverflow = dayEvents.length > MAX_EVENTS

                            // If overflow, show NO events, just the button. Otherwise show all (up to max).
                            const visibleEvents = isOverflow ? [] : dayEvents

                            const isWeekendDay = isWeekend(day)

                            return (
                                <div
                                    key={day.toString()}
                                    onClick={() => onDateClick?.(day)}
                                    className={cn(
                                        "min-h-0 border-b border-r border-slate-200 p-1 md:p-2 flex flex-col gap-1 transition-colors cursor-pointer relative group",
                                        isCurrentMonth ? "bg-white hover:bg-slate-50" : "bg-slate-100/80 text-slate-400",
                                        isTodayDate && "bg-indigo-50 hover:bg-indigo-100/50"
                                    )}
                                >
                                    <div className="flex justify-between items-start">
                                        {availability && isWeekendDay && (
                                            <span className={cn(
                                                "whitespace-nowrap text-[8px] md:text-[10px] font-bold px-1 md:px-1.5 py-0.5 rounded-full flex items-center gap-0.5 md:gap-1",
                                                availability.hasUnassigned
                                                    ? "bg-amber-100 text-amber-700 border border-amber-200"
                                                    : availability.count > 0
                                                        ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                                        : "bg-red-100 text-red-600 border border-red-200",
                                                !isCurrentMonth && "opacity-30 grayscale"
                                            )}>
                                                {availability.hasUnassigned && "⚠️ "}{availability.count}
                                            </span>
                                        )}
                                        <span className={cn(
                                            "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ml-auto",
                                            isTodayDate ? "bg-indigo-600 text-white shadow-sm" :
                                                !isCurrentMonth ? "text-slate-300" : "text-slate-700"
                                        )}>
                                            {format(day, 'd')}
                                        </span>
                                    </div>

                                    <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                                        {visibleEvents.map(event => (
                                            <div
                                                key={event.id}
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    onEventClick({ event })
                                                }}
                                                className={cn(
                                                    "text-[10px] md:text-xs truncate px-1.5 py-0.5 rounded cursor-pointer text-white font-medium hover:opacity-80 transition-opacity",
                                                    !isCurrentMonth && "opacity-40"
                                                )}
                                                style={{ backgroundColor: event.color || event.backgroundColor || '#6366f1' }}
                                                title={event.title}
                                            >
                                                {event.title}
                                            </div>
                                        ))}

                                        {isOverflow && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    // Mimic FullCalendar args structure for compatibility
                                                    onMoreLinkClick({
                                                        date: day,
                                                        allSegs: dayEvents.map(evt => ({
                                                            event: {
                                                                ...evt,
                                                                extendedProps: evt.extendedProps,
                                                                title: evt.title,
                                                                start: evt.start,
                                                                backgroundColor: evt.color || evt.backgroundColor
                                                            }
                                                        }))
                                                    })
                                                }}
                                                className="mt-auto text-[10px] md:text-xs font-bold text-indigo-700 bg-indigo-100 hover:bg-indigo-200 rounded px-1.5 py-0.5 text-center w-fit mx-auto transition-colors whitespace-nowrap flex items-center justify-center gap-1"
                                            >
                                                <span className="md:hidden">+ {dayEvents.length}</span>
                                                <div className="hidden md:flex items-center gap-1.5">
                                                    <Eye className="size-3.5" />
                                                    <span>{dayEvents.length} résa</span>
                                                </div>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </>
            )}

            {view === 'list' && (
                <div className="flex-1 overflow-y-auto min-h-0 bg-white p-4">
                    <div className="space-y-2">
                        {events
                            .filter(event => isSameMonth(parseISO(event.start), currentDate))
                            .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
                            .map(event => (
                                <div
                                    key={event.id}
                                    onClick={() => onEventClick({ event })}
                                    className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:border-indigo-100 hover:bg-slate-50 transition-colors cursor-pointer group"
                                >
                                    <div
                                        className="w-3 h-3 rounded-full shrink-0 group-hover:scale-110 transition-transform"
                                        style={{ backgroundColor: event.color || event.backgroundColor || '#6366f1' }}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <h4 className="font-semibold text-sm text-slate-800 truncate">{event.title}</h4>
                                            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                                {format(parseISO(event.start), 'd MMMM', { locale: fr })}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            {format(parseISO(event.start), 'EEEE d MMMM yyyy', { locale: fr })}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        {events.filter(event => isSameMonth(parseISO(event.start), currentDate)).length === 0 && (
                            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                                <div className="bg-slate-50 p-4 rounded-full mb-3">
                                    <ChevronRight className="h-6 w-6 text-slate-300" />
                                </div>
                                <p className="text-sm font-medium">Aucune réservation pour ce mois</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
