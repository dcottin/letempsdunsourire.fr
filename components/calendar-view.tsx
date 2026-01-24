"use client"

import React from "react"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import listPlugin from "@fullcalendar/list"
import interactionPlugin from "@fullcalendar/interaction"
import frLocale from "@fullcalendar/core/locales/fr"

interface CalendarViewProps {
    events: any[]
    onEventClick: (info: any) => void
    onMoreLinkClick: (args: any) => void
}

export default function CalendarView({ events, onEventClick, onMoreLinkClick }: CalendarViewProps) {
    const [isMounted, setIsMounted] = React.useState(false)
    const containerRef = React.useRef<HTMLDivElement>(null)

    React.useLayoutEffect(() => {
        if (containerRef.current) {
            setIsMounted(true)
        }
    }, [])

    return (
        <div ref={containerRef} className="w-full h-full min-h-[600px]">
            {isMounted && (
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
                        today: "Auj.",
                        month: "Mois",
                        list: "Liste"
                    }}
                    eventClick={onEventClick}
                    moreLinkClick={onMoreLinkClick}
                    moreLinkContent={(args) => (
                        <span>Réservations : {args.num} +</span>
                    )}
                    contentHeight="auto"
                    themeSystem="standard"
                    dayMaxEvents={2}
                    views={{
                        dayGridMonth: {
                            titleFormat: { month: 'short', year: '2-digit' }
                        }
                    }}
                />
            )}
        </div>
    )
}
