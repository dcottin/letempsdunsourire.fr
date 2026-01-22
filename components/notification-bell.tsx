"use client"

import { useState, useEffect } from "react"
import { BellIcon, CheckCircle2Icon, InfoIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { Notification, getNotifications, markAsRead } from "@/lib/notifications"
import { formatDistanceToNow } from "date-fns"
import { fr } from "date-fns/locale"

export function NotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [isOpen, setIsOpen] = useState(false)

    const fetchNotifications = async () => {
        const data = await getNotifications()
        setNotifications(data)
        setUnreadCount(data.filter(n => !n.is_read).length)
    }

    useEffect(() => {
        fetchNotifications()

        // Real-time subscription for new notifications
        const channel = (supabase as any)
            .channel('notifications-sync')
            .on('postgres_changes',
                { event: 'INSERT', table: 'notifications', schema: 'public' },
                () => {
                    console.log("New notification received!")
                    fetchNotifications()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    const handleMarkAsRead = async (id: string) => {
        await markAsRead(id)
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
        setUnreadCount(prev => Math.max(0, prev - 1))
    }

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative size-9 text-slate-500 hover:text-indigo-600">
                    <BellIcon className="size-5" />
                    {unreadCount > 0 && (
                        <Badge className="absolute -top-1 -right-1 size-5 flex items-center justify-center p-0 bg-red-500 text-white border-2 border-white rounded-full text-[10px]">
                            {unreadCount}
                        </Badge>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="font-semibold text-sm">Notifications</h3>
                    {unreadCount > 0 && (
                        <Button variant="ghost" size="sm" className="text-[10px] h-7 px-2" onClick={() => notifications.forEach(n => !n.is_read && handleMarkAsRead(n.id))}>
                            Tout marquer comme lu
                        </Button>
                    )}
                </div>
                <ScrollArea className="h-[350px]">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 animate-in fade-in duration-500">
                            <InfoIcon className="size-8 text-slate-200 mb-2" />
                            <p className="text-xs text-slate-400">Aucune notification</p>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {notifications.map((n) => (
                                <div
                                    key={n.id}
                                    className={`p-4 border-b last:border-0 hover:bg-slate-50 transition-colors cursor-pointer ${!n.is_read ? 'bg-indigo-50/30' : ''}`}
                                    onClick={() => handleMarkAsRead(n.id)}
                                >
                                    <div className="flex gap-3">
                                        <div className={`mt-0.5 size-7 rounded-full flex items-center justify-center shrink-0 ${n.type === 'signature' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                                            {n.type === 'signature' ? <CheckCircle2Icon className="size-4" /> : <InfoIcon className="size-4" />}
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <p className={`text-xs leading-tight ${!n.is_read ? 'font-bold' : 'text-slate-600'}`}>
                                                {n.message}
                                            </p>
                                            <p className="text-[10px] text-slate-400">
                                                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: fr })}
                                            </p>
                                        </div>
                                        {!n.is_read && <div className="size-2 bg-red-500 rounded-full mt-2 shrink-0" />}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
                <div className="p-2 border-t text-center">
                    <Button variant="ghost" size="sm" className="w-full text-[10px] text-slate-400">
                        Voir tout l'historique
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    )
}
