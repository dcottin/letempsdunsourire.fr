"use client"

import * as React from "react"
import { format, startOfWeek, endOfWeek, addWeeks, isSameDay, parseISO, startOfDay, endOfDay } from "date-fns"
import { fr } from "date-fns/locale"
import {
    CalendarIcon,
    MapPinIcon,
    ClockIcon,
    UserIcon,
    AlertCircleIcon,
    CheckCircle2Icon,
    TruckIcon,
    PhoneIcon,
    PackageIcon,
    CameraIcon,
    RotateCcwIcon,
    TagIcon,
    ChevronLeft,
    ChevronRight,
    UserPlus,
    Circle,
    CheckCircleIcon,
    PencilIcon,
    GripVertical,
} from "lucide-react"

import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { supabase } from "@/lib/supabase"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2Icon } from "lucide-react"

export default function DashboardPage() {
    const [weekOffset, setWeekOffset] = React.useState(0)
    const [events, setEvents] = React.useState<any[]>([])
    const [settings, setSettings] = React.useState<any>(null)
    const [mounted, setMounted] = React.useState(false)
    const [loading, setLoading] = React.useState(true)

    // Quick Payment State
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = React.useState(false)
    const [paymentContext, setPaymentContext] = React.useState<{ item: any; field: 'acompte_paye' | 'solde_paye' } | null>(null)
    const [selectedPaymentMethod, setSelectedPaymentMethod] = React.useState<string>("")
    const [isSavingPayment, setIsSavingPayment] = React.useState(false)

    // Quick Delivery Edit State
    const [isDeliveryDialogOpen, setIsDeliveryDialogOpen] = React.useState(false)
    const [deliveryItem, setDeliveryItem] = React.useState<any>(null)
    const [tempDeliveryData, setTempDeliveryData] = React.useState({ date: "", time: "", lieu: "" })
    const [isSavingDelivery, setIsSavingDelivery] = React.useState(false)

    const [allBookings, setAllBookings] = React.useState<any[]>([])

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event

        if (active.id !== over?.id) {
            setEvents((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id)
                const newIndex = items.findIndex((item) => item.id === over?.id)

                const newItems = arrayMove(items, oldIndex, newIndex)

                // Update rank based on new order
                // We assign rank = index * 1000 to leave space for insertions
                const updates = newItems.map((item, index) => ({
                    id: item.id,
                    rank: index * 1000,
                    data: { ...item.data, dashboard_rank: index * 1000 }
                }))

                // Optimistic update
                const updatedState = newItems.map((item, index) => ({
                    ...item,
                    data: { ...item.data, dashboard_rank: index * 1000 }
                }))

                // Background save
                // We need to update specific tables based on ID prefix
                const updatesPromise = async () => {
                    for (const update of updates) {
                        const table = update.id.startsWith('D') ? 'devis' : 'contrats'
                        await supabase.from(table).update({
                            data: update.data
                        }).eq('id', update.id)
                    }
                }
                updatesPromise()

                return updatedState
            })
        }
    }

    const fetchData = React.useCallback(async (isInitial = false) => {
        if (isInitial) setLoading(true)

        const [contractsRes, devisRes, settingsRes] = await Promise.all([
            supabase
                .from('contrats')
                .select('*')
                .order('date_debut', { ascending: true })
                .limit(1000),
            supabase
                .from('devis')
                .select('*')
                .order('date_debut', { ascending: true })
                .limit(1000),
            supabase
                .from('settings')
                .select('data')
                .limit(1)
                .single()
        ])

        if (contractsRes.error) {
            console.error("Error fetching contracts:", contractsRes.error)
        }

        if (devisRes.error) {
            console.error("Error fetching devis:", devisRes.error)
        }

        const validDevis = (devisRes.data || []).filter(d => d.etat !== 'Annulé' && d.etat !== 'Refusé')
        const validContrats = (contractsRes.data || []).filter(c => c.etat !== 'Annulé' && c.etat !== 'Archivé')

        const merged = [...validContrats, ...validDevis]

        // Sort by Rank then Date
        const sorted = merged.sort((a, b) => {
            const rankA = a.data?.dashboard_rank ?? 999999
            const rankB = b.data?.dashboard_rank ?? 999999

            if (rankA !== rankB) return rankA - rankB

            const dateA = a.data?.date_debut || a.date_debut
            const dateB = b.data?.date_debut || b.date_debut
            if (dateA < dateB) return -1
            if (dateA > dateB) return 1
            return 0
        })

        setEvents(sorted)
        setAllBookings(merged)

        if (settingsRes.data?.data) {
            setSettings(settingsRes.data.data)
        }

        setLoading(false)
    }, [])

    React.useEffect(() => {
        setMounted(true)
        fetchData(true)

        // Silent background sync when user returns to this tab
        const onFocus = () => fetchData(false)
        window.addEventListener('focus', onFocus)
        return () => window.removeEventListener('focus', onFocus)
    }, [fetchData])

    const today = React.useMemo(() => new Date(), [])

    const startCurrentWeek = React.useMemo(() => startOfDay(startOfWeek(addWeeks(today, weekOffset), { weekStartsOn: 1 })), [today, weekOffset])
    const endCurrentWeek = React.useMemo(() => endOfDay(endOfWeek(addWeeks(today, weekOffset), { weekStartsOn: 1 })), [today, weekOffset])

    const startNextWeek = React.useMemo(() => startOfDay(startOfWeek(addWeeks(today, weekOffset + 1), { weekStartsOn: 1 })), [today, weekOffset])
    const endNextWeek = React.useMemo(() => endOfDay(endOfWeek(addWeeks(today, weekOffset + 1), { weekStartsOn: 1 })), [today, weekOffset])

    if (!mounted) return null

    const currentWeekEvents = React.useMemo(() => {
        if (loading) return []
        return events.filter(e => {
            const dateStr = e.data?.date_debut || e.date_debut
            if (!dateStr) return false
            try {
                const d = parseISO(dateStr)
                return d.getTime() >= startCurrentWeek.getTime() && d.getTime() <= endCurrentWeek.getTime()
            } catch (err) {
                return false
            }
        })
    }, [events, loading, startCurrentWeek, endCurrentWeek])

    const nextWeekEvents = React.useMemo(() => {
        if (loading) return []
        return events.filter(e => {
            const dateStr = e.data?.date_debut || e.date_debut
            if (!dateStr) return false
            try {
                const d = parseISO(dateStr)
                return d.getTime() >= startNextWeek.getTime() && d.getTime() <= endNextWeek.getTime()
            } catch (err) {
                return false
            }
        })
    }, [events, loading, startNextWeek, endNextWeek])

    const handleConfirmPayment = async () => {
        if (!paymentContext || !selectedPaymentMethod) return

        setIsSavingPayment(true)
        const { item, field } = paymentContext
        const methodField = field === 'acompte_paye' ? 'acompte_methode' : 'solde_methode'
        const dateField = field === 'acompte_paye' ? 'acompte_date' : 'solde_date'
        const now = format(new Date(), "yyyy-MM-dd'T'HH:mm")

        // Update local state first for instant feedback
        setEvents(prev => prev.map(e => e.id === item.id ? {
            ...e,
            [field]: true,
            [methodField]: selectedPaymentMethod,
            [dateField]: now,
            data: { ...e.data, [field]: true, [methodField]: selectedPaymentMethod, [dateField]: now }
        } : e))

        try {
            const { error } = await supabase
                .from('contrats')
                .update({
                    data: { ...item.data, [field]: true, [methodField]: selectedPaymentMethod, [dateField]: now }
                })
                .eq('id', item.id)

            if (error) throw error

            setIsPaymentDialogOpen(false)
            setPaymentContext(null)
            setSelectedPaymentMethod("")
        } catch (error) {
            console.error("Error saving payment:", error)
            alert("Erreur lors de l'enregistrement du paiement")
        } finally {
            setIsSavingPayment(false)
        }
    }

    const handleToggleStep = async (item: any, stepKey: string) => {
        // Step 0: Contract Signed
        if (stepKey === '0') {
            const newValue = !(item.contrat_signe || item.data?.contrat_signe)
            setEvents(prev => prev.map(e => e.id === item.id ? { ...e, contrat_signe: newValue, data: { ...e.data, contrat_signe: newValue } } : e))
            await supabase.from('contrats').update({ data: { ...item.data, contrat_signe: newValue } }).eq('id', item.id)
            return
        }

        // Step 1: Deposit Paid
        if (stepKey === '1') {
            const isCurrentlyPaid = item.acompte_paye || item.data?.acompte_paye
            if (!isCurrentlyPaid) {
                setPaymentContext({ item, field: 'acompte_paye' })
                setSelectedPaymentMethod("")
                setIsPaymentDialogOpen(true)
            } else {
                setEvents(prev => prev.map(e => e.id === item.id ? { ...e, acompte_paye: false, data: { ...e.data, acompte_paye: false } } : e))
                await supabase.from('contrats').update({ data: { ...item.data, acompte_paye: false } }).eq('id', item.id)
            }
            return
        }

        // Step 2: Solde Paid
        if (stepKey === '2') {
            const isCurrentlyPaid = item.solde_paye || item.data?.solde_paye
            if (!isCurrentlyPaid) {
                setPaymentContext({ item, field: 'solde_paye' })
                setSelectedPaymentMethod("")
                setIsPaymentDialogOpen(true)
            } else {
                setEvents(prev => prev.map(e => e.id === item.id ? { ...e, solde_paye: false, data: { ...e.data, solde_paye: false } } : e))
                await supabase.from('contrats').update({ data: { ...item.data, solde_paye: false } }).eq('id', item.id)
            }
            return
        }

        // Dynamic steps
        const currentStatus = item.data?.workflow_status || {}
        const isChecked = currentStatus[stepKey] === true
        const newStatus = { ...currentStatus, [stepKey]: !isChecked }

        setEvents(prev => prev.map(e => e.id === item.id ? { ...e, data: { ...e.data, workflow_status: newStatus } } : e))
        await supabase.from('contrats').update({ data: { ...item.data, workflow_status: newStatus } }).eq('id', item.id)
    }

    const handleEquipmentChange = async (item: any, newEquipmentId: string) => {
        const currentId = item.data?.equipment_id || item.equipment_id || 'none'
        if (newEquipmentId === currentId) return

        const date = item.data?.date_debut || item.date_debut

        if (newEquipmentId !== 'none' && date) {
            try {
                // Check availability in both devis and contrats
                const [devisRes, contratsRes] = await Promise.all([
                    supabase.from('devis').select('id, nom_client, data, etat').eq('date_debut', date),
                    supabase.from('contrats').select('id, nom_client, data, etat').eq('date_debut', date)
                ])

                const busyDevis = (devisRes.data || []).filter((d: any) =>
                    d.id !== item.id &&
                    d.etat !== 'Annulé' && d.etat !== 'Refusé' &&
                    (d.data?.equipment_id === newEquipmentId)
                )
                const busyContrats = (contratsRes.data || []).filter((c: any) =>
                    c.id !== item.id &&
                    c.etat !== 'Annulé' && c.etat !== 'Archivé' &&
                    (c.data?.equipment_id === newEquipmentId || c.equipment_id === newEquipmentId)
                )

                if (busyDevis.length > 0 || busyContrats.length > 0) {
                    const conflict = busyContrats[0] || busyDevis[0]
                    const holder = conflict.nom_client || "un autre dossier"
                    const formattedDate = format(parseISO(date), 'dd/MM', { locale: fr })
                    if (!confirm(`⚠️ Attention : Ce matériel est déjà réservé par ${holder} le ${formattedDate}.\n\nConfirmer quand même le changement ?`)) {
                        return
                    }
                }
            } catch (err) {
                console.error("Check availability error:", err)
            }
        }

        const updatedData = { ...item.data, equipment_id: newEquipmentId }

        // Update local state first
        setEvents(prev => prev.map(e => e.id === item.id ? { ...e, equipment_id: newEquipmentId, data: updatedData } : e))

        try {
            const { error } = await supabase
                .from('contrats')
                .update({ data: updatedData })
                .eq('id', item.id)

            if (error) throw error
        } catch (error) {
            console.error("Error saving equipment:", error)
            alert("Erreur lors de l'enregistrement du matériel")
            fetchData(false)
        }
    }

    const openDeliveryDialog = (item: any) => {
        setDeliveryItem(item)
        setTempDeliveryData({
            date: item.data?.date_installation || item.date_installation || "",
            time: item.data?.heure_debut || item.heure_debut || "",
            lieu: item.data?.lieu || item.lieu || ""
        })
        setIsDeliveryDialogOpen(true)
    }

    const handleSaveDelivery = async () => {
        if (!deliveryItem) return
        setIsSavingDelivery(true)

        const { date, time, lieu } = tempDeliveryData
        const updatedData = {
            ...deliveryItem.data,
            date_installation: date,
            heure_debut: time,
            lieu
        }

        try {
            const { error } = await supabase
                .from('contrats')
                .update({ data: updatedData })
                .eq('id', deliveryItem.id)

            if (error) throw error

            setEvents(prev => prev.map(e => e.id === deliveryItem.id ? {
                ...e,
                date_installation: date,
                heure_debut: time,
                lieu,
                data: updatedData
            } : e))

            setIsDeliveryDialogOpen(false)
        } catch (error) {
            console.error("Error saving delivery:", error)
            alert("Erreur lors de l'enregistrement")
        } finally {
            setIsSavingDelivery(false)
        }
    }

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h2 className="text-3xl font-bold tracking-tight text-slate-900">Tableau de bord</h2>

                <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm self-stretch sm:self-auto justify-center">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                        onClick={() => setWeekOffset(prev => prev - 1)}
                        title="Semaine précédente"
                    >
                        <ChevronLeft className="size-5" />
                    </Button>

                    <div className="px-3 py-1 flex flex-col items-center min-w-[140px]">
                        <span className="text-[10px] uppercase font-bold text-slate-400 leading-none mb-1">
                            {weekOffset === 0 ? "Cette semaine" : (weekOffset === 1 ? "La semaine prochaine" : `Offset: ${weekOffset > 0 ? '+' : ''}${weekOffset} sem.`)}
                        </span>
                        <span className="text-xs font-bold text-indigo-700 whitespace-nowrap">
                            {format(startCurrentWeek, 'dd MMM', { locale: fr })} - {format(endCurrentWeek, 'dd MMM', { locale: fr })}
                        </span>
                    </div>

                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                        onClick={() => setWeekOffset(prev => prev + 1)}
                        title="Semaine suivante"
                    >
                        <ChevronRight className="size-5" />
                    </Button>

                    {weekOffset !== 0 && (
                        <>
                            <div className="w-px h-6 bg-slate-200 mx-1" />
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-[10px] font-bold uppercase tracking-tight text-indigo-600 hover:bg-indigo-50"
                                onClick={() => setWeekOffset(0)}
                            >
                                Aujourd'hui
                            </Button>
                        </>
                    )}
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {/* Current Week Column */}
                <div className="col-span-4 lg:col-span-3 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-base sm:text-lg font-semibold text-indigo-900 flex items-center gap-2">
                            <CalendarIcon className="size-5 text-indigo-600" />
                            {weekOffset === 0 ? "Cette semaine" : "Semaine du " + format(startCurrentWeek, 'dd/MM')}
                            <Badge variant="secondary" className="ml-2 font-normal text-[10px] sm:text-xs">
                                {format(startCurrentWeek, 'd MMM', { locale: fr })} - {format(endCurrentWeek, 'd MMM', { locale: fr })}
                            </Badge>
                        </h3>
                        <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-none">{currentWeekEvents.length}</Badge>
                    </div>

                    {loading ? (
                        <div className="space-y-3">
                            <Skeleton className="h-32 w-full rounded-xl" />
                            <Skeleton className="h-32 w-full rounded-xl" />
                        </div>
                    ) : currentWeekEvents.length === 0 ? (
                        <Card className="bg-slate-50 border-dashed border-2">
                            <CardContent className="flex flex-col items-center justify-center h-40 text-slate-400">
                                <CalendarIcon className="size-10 mb-2 opacity-20" />
                                <p className="text-sm font-medium">Aucun événement cette semaine</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={currentWeekEvents.map(e => e.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                <div className="min-h-[50px] pb-1">
                                    {currentWeekEvents.map(event => (
                                        <SortableEventCard key={event.id} id={event.id}>
                                            <EventCard event={event} isNextWeek={false} settings={settings} onPay={(item) => { setPaymentContext({ item, field: 'solde_paye' }); setIsPaymentDialogOpen(true); }} onToggleStep={handleToggleStep} onEditDelivery={openDeliveryDialog} onEquipmentChange={handleEquipmentChange} allEvents={allBookings} />
                                        </SortableEventCard>
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                    )}
                </div>

                {/* Divider / Spacer on Desktop */}
                <div className="hidden lg:block col-span-1"></div>

                {/* Next Week Column */}
                <div className="col-span-4 lg:col-span-3 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-base sm:text-lg font-semibold text-slate-700 flex items-center gap-2">
                            <CalendarIcon className="size-5 text-slate-500" />
                            {weekOffset === 0 ? "Semaine prochaine" : "Semaine suivante"}
                            <Badge variant="secondary" className="ml-2 font-normal text-[10px] sm:text-xs">
                                {format(startNextWeek, 'd MMM', { locale: fr })} - {format(endNextWeek, 'd MMM', { locale: fr })}
                            </Badge>
                        </h3>
                        <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-200 border-none">{nextWeekEvents.length}</Badge>
                    </div>

                    {loading ? (
                        <div className="space-y-3">
                            <Skeleton className="h-32 w-full rounded-xl" />
                            <Skeleton className="h-32 w-full rounded-xl" />
                        </div>
                    ) : nextWeekEvents.length === 0 ? (
                        <Card className="bg-slate-50/50 border-dashed border-2">
                            <CardContent className="flex flex-col items-center justify-center h-40 text-slate-400">
                                <CalendarIcon className="size-10 mb-2 opacity-20" />
                                <p className="text-sm font-medium">Rien de prévu la semaine prochaine</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={nextWeekEvents.map(e => e.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                <div className="space-y-3">
                                    {nextWeekEvents.map(event => (
                                        <SortableEventCard key={event.id} id={event.id}>
                                            <EventCard event={event} isNextWeek={true} settings={settings} onPay={(item) => { setPaymentContext({ item, field: 'solde_paye' }); setIsPaymentDialogOpen(true); }} onToggleStep={handleToggleStep} onEditDelivery={openDeliveryDialog} onEquipmentChange={handleEquipmentChange} allEvents={allBookings} />
                                        </SortableEventCard>
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                    )}
                </div>
            </div>

            {/* Payment Dialog */}
            <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Enregistrer {paymentContext?.field === 'acompte_paye' ? "l'acompte" : "le solde"}</DialogTitle>
                        <DialogDescription>
                            Confirmez le règlement pour <strong>{paymentContext?.item?.nom_client}</strong>.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="method">Mode de paiement</Label>
                            <Select onValueChange={setSelectedPaymentMethod} value={selectedPaymentMethod}>
                                <SelectTrigger id="method">
                                    <SelectValue placeholder="Choisir un mode..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Especes">Espèces</SelectItem>
                                    <SelectItem value="Virement">Virement</SelectItem>
                                    <SelectItem value="Cheque">Chèque</SelectItem>
                                    <SelectItem value="PayPal">PayPal</SelectItem>
                                    <SelectItem value="CB">Mettle / CB</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)} disabled={isSavingPayment}>
                            Annuler
                        </Button>
                        <Button
                            className="bg-indigo-600 hover:bg-indigo-700"
                            onClick={handleConfirmPayment}
                            disabled={!selectedPaymentMethod || isSavingPayment}
                        >
                            {isSavingPayment ? (
                                <><Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> Enregistrement...</>
                            ) : (
                                "Confirmer le paiement"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delivery Dialog */}
            <Dialog open={isDeliveryDialogOpen} onOpenChange={setIsDeliveryDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Modifier la livraison</DialogTitle>
                        <DialogDescription>
                            Mettez à jour les infos de livraison pour <strong>{deliveryItem?.nom_client}</strong>.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Date</Label>
                            <Input
                                type="date"
                                className="col-span-3"
                                value={tempDeliveryData.date}
                                onChange={(e) => setTempDeliveryData(p => ({ ...p, date: e.target.value }))}
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Heure</Label>
                            <Input
                                type="time"
                                className="col-span-3"
                                value={tempDeliveryData.time}
                                onChange={(e) => setTempDeliveryData(p => ({ ...p, time: e.target.value }))}
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Lieu</Label>
                            <Input
                                className="col-span-3"
                                value={tempDeliveryData.lieu}
                                onChange={(e) => setTempDeliveryData(p => ({ ...p, lieu: e.target.value }))}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeliveryDialogOpen(false)} disabled={isSavingDelivery}>
                            Annuler
                        </Button>
                        <Button
                            className="bg-indigo-600 hover:bg-indigo-700"
                            onClick={handleSaveDelivery}
                            disabled={isSavingDelivery}
                        >
                            {isSavingDelivery ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Enregistrer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

function EventCard({ event, isNextWeek, settings, onPay, onToggleStep, onEditDelivery, onEquipmentChange, allEvents }: { event: any, isNextWeek: boolean, settings?: any, onPay: (item: any) => void, onToggleStep: (item: any, stepKey: string) => void, onEditDelivery: (item: any) => void, onEquipmentChange: (item: any, newId: string) => void, allEvents: any[] }) {
    const eventDate = event.data?.date_debut || event.date_debut

    const unavailableIdsForThisDate = React.useMemo(() => {
        if (!eventDate || !allEvents) return []
        return allEvents
            .filter(e => e.id !== event.id) // Exclusion of current event
            .filter(e => (e.data?.date_debut || e.date_debut) === eventDate) // Same date
            .map(e => e.data?.equipment_id || e.equipment_id)
            .filter(Boolean)
    }, [eventDate, allEvents, event.id])

    // Format Date
    const dateObj = new Date(event.data?.date_debut || event.date_debut)
    const dayName = format(dateObj, 'EEEE', { locale: fr })
    const dayDate = format(dateObj, 'd MMMM', { locale: fr })

    // Status Logic
    const isSigned = event.contrat_signe || event.data?.contrat_signe

    // Data Extraction
    const offerName = event.data?.offre || "Formule Standard"
    const displayOffer = offerName.includes(":") ? offerName.split(":")[0] : offerName
    const phone = event.telephone_client || event.data?.telephone_client
    const selectedOptions = event.data?.selected_options || []
    const reference = event.data?.reference || event.reference || ""

    // Financials
    const total = parseFloat(event.prix_total || event.data?.prix_total || "0")
    const depositRecu = parseFloat(event.acompte_recu || event.data?.acompte_recu || "0")
    const depositPaye = event.acompte_paye || event.data?.acompte_paye || false
    const soldePaye = event.solde_paye || event.data?.solde_paye || false
    const remainingBalance = soldePaye ? 0 : (total - (depositPaye ? depositRecu : 0))

    // Fallbacks
    const location = event.lieu || event.data?.lieu || event.adresse_client || ""
    const deliveryDateStr = event.date_installation || event.data?.date_installation
    const startHour = event.data?.heure_debut || event.heure_debut || ""
    const endHour = event.data?.heure_fin || event.heure_fin || ""
    const deliveryTimeStr = startHour || "08:00"

    // Equipment Resolution
    const equipmentId = event.data?.equipment_id || event.equipment_id
    let equipmentName = equipmentId === 'none' ? 'Aucun matériel' : equipmentId

    if (settings?.materiels && Array.isArray(settings.materiels)) {
        const found = settings.materiels.find((m: any) => m.id === equipmentId)
        if (found) {
            equipmentName = found.nom
        }
    }

    const downloadVCard = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${event.nom_client}
TEL;TYPE=CELL:${phone || ""}
EMAIL:${event.email_client || event.data?.email_client || ""}
ADR;TYPE=HOME:;;${location || ""};;;;
END:VCARD`
        const blob = new Blob([vcard], { type: "text/vcard" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = `${event.nom_client || "contact"}.vcf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <Card className={`overflow-hidden transition-all hover:shadow-sm ${isNextWeek ? 'border-l-2 border-l-slate-300' : 'border-l-2 border-l-indigo-500'}`}>
            <CardContent className="p-2 sm:p-2.5">
                {/* Header: Date & Status */}
                <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-sm capitalize text-slate-900 leading-none">{dayName} <span className="text-slate-500 font-medium">{dayDate}</span></h4>
                        {reference && <span className="text-[10px] text-slate-400 font-mono tracking-tighter bg-slate-50 px-1 rounded border border-slate-100">{reference}</span>}
                        {isSameDay(dateObj, new Date()) && <Badge className="bg-red-100 text-red-600 hover:bg-red-100 border-none text-[9px] px-1 h-4 font-bold">Auj.</Badge>}
                    </div>
                    <div className="flex items-center gap-1">
                        {remainingBalance > 0 && (
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onPay(event);
                                }}
                                className="text-sm font-black text-rose-600 hover:text-rose-700 hover:scale-105 transition-all tabular-nums mr-1 px-1.5 py-0.5 rounded bg-rose-50/50 border border-rose-200 hover:bg-rose-100 hover:border-rose-300"
                                title="Enregistrer le paiement du solde"
                            >
                                {remainingBalance}€
                            </button>
                        )}
                        <div className="flex gap-1 items-center bg-slate-50/50 px-1.5 py-0.5 rounded-full border border-slate-100">
                            {/* Workflow dots similar to "suivi" */}
                            <div title="Contrat Signé" className="cursor-pointer hover:scale-110 transition-transform" onClick={() => onToggleStep(event, '0')}>
                                {isSigned ? <CheckCircleIcon className="size-3.5 text-emerald-500" /> : <Circle className="size-3.5 text-slate-200" />}
                            </div>
                            <div title="Acompte Reçu" className="cursor-pointer hover:scale-110 transition-transform" onClick={() => onToggleStep(event, '1')}>
                                {depositPaye ? <CheckCircleIcon className="size-3.5 text-emerald-500" /> : <Circle className="size-3.5 text-slate-200" />}
                            </div>
                            <div title="Solde Reçu" className="cursor-pointer hover:scale-110 transition-transform" onClick={() => onToggleStep(event, '2')}>
                                {soldePaye ? <CheckCircleIcon className="size-3.5 text-emerald-500" /> : <Circle className="size-3.5 text-slate-200" />}
                            </div>
                            {/* Dynamic workflow steps */}
                            {(settings?.workflow_steps || []).slice(3).map((stepName: string, idx: number) => {
                                const stepKey = String(idx + 3)
                                const isChecked = event.data?.workflow_status?.[stepKey] === true
                                return (
                                    <div key={stepKey} title={stepName} className="cursor-pointer hover:scale-110 transition-transform" onClick={() => onToggleStep(event, stepKey)}>
                                        {isChecked ? <CheckCircleIcon className="size-3.5 text-emerald-500" /> : <Circle className="size-3.5 text-slate-200" />}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                <div className="space-y-1 ml-0.5">
                    {/* Line 1: Client Name */}
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                        <UserIcon className="size-3 text-indigo-500 shrink-0" />
                        <span className="truncate">{event.nom_client}</span>
                    </div>

                    {/* Line 2: Phone | Address | Delivery */}
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 ml-4 text-[10px] font-medium text-slate-500">
                        {phone && (
                            <div className="flex items-center gap-1 text-slate-600">
                                <a href={`tel:${phone}`} className="flex items-center gap-1 hover:text-indigo-600 transition-colors">
                                    <PhoneIcon className="size-2.5" />
                                    {phone.replace(/(\d{2})(?=\d)/g, '$1 ')}
                                </a>
                                <button
                                    onClick={downloadVCard}
                                    className="p-0.5 rounded-full hover:bg-slate-100 text-indigo-500 transition-colors"
                                    title="Enregistrer"
                                >
                                    <UserPlus className="size-2.5" />
                                </button>
                            </div>
                        )}

                        <div className="flex items-center gap-1 truncate max-w-[150px]">
                            <MapPinIcon className="size-2.5 shrink-0" />
                            {location ? (
                                <a
                                    href={`https://waze.com/ul?q=${encodeURIComponent(location)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="truncate hover:underline hover:text-indigo-600"
                                >
                                    {location}
                                </a>
                            ) : <span className="text-slate-400 italic">Lieu?</span>}
                        </div>

                        <div className="flex items-center gap-1 text-amber-600 font-bold whitespace-nowrap group/deliv">
                            {deliveryDateStr ? (
                                <>
                                    <TruckIcon className="size-2.5 shrink-0" />
                                    <span>{format(new Date(deliveryDateStr), 'dd/MM')} {deliveryTimeStr}</span>
                                </>
                            ) : (
                                <span className="text-slate-400 italic">Livraison?</span>
                            )}
                            <button
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEditDelivery(event); }}
                                className="p-0.5 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600 transition-colors ml-0.5"
                                title="Modifier la livraison"
                            >
                                <PencilIcon className="size-2.5" />
                            </button>
                        </div>
                    </div>

                    {/* Line 3: Formula & Model */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 ml-4 text-[10px] pt-1 border-t border-slate-100/50">
                        <div className="flex flex-wrap items-center gap-1 text-slate-700 font-bold">
                            <PackageIcon className="size-2.5 text-slate-400 shrink-0" />
                            <span>{displayOffer}</span>
                            {selectedOptions.length > 0 && (
                                <span className="text-pink-600 font-medium">
                                    (+ {selectedOptions.map((o: any) => o.name).join(', ')})
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-1">
                            <Select
                                value={equipmentId || 'none'}
                                onValueChange={(val) => onEquipmentChange(event, val)}
                            >
                                <SelectTrigger className="h-6 w-fit min-w-[70px] max-w-[120px] text-[10px] bg-slate-50 border-slate-200 hover:border-indigo-400 transition-colors px-2 rounded-md">
                                    <CameraIcon className="size-2.5 mr-1 text-slate-400 shrink-0" />
                                    <SelectValue placeholder="Matériel">
                                        {settings?.materiels?.find((m: any) => m.id === equipmentId)?.nom || (equipmentId === 'none' ? 'Aucun' : equipmentId)}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none" className="text-[10px]">Aucun</SelectItem>
                                    {(settings?.materiels || []).map((m: any) => {
                                        const isReserved = unavailableIdsForThisDate.includes(m.id)
                                        const isCurrent = m.id === equipmentId

                                        return (
                                            <SelectItem
                                                key={m.id}
                                                value={m.id}
                                                className={`text-[10px] ${isReserved && !isCurrent ? 'text-red-500 font-medium' : ''}`}
                                                disabled={isReserved && !isCurrent}
                                            >
                                                {isReserved && !isCurrent ? '❌ ' : ''}{m.nom}
                                            </SelectItem>
                                        )
                                    })}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

function SortableEventCard({ id, children }: { id: string, children: React.ReactNode }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
        position: 'relative' as 'relative',
        opacity: isDragging ? 0.5 : 1,
    }

    return (
        <div ref={setNodeRef} style={style} className="touch-none group/card flex items-center gap-2 mb-3">
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-slate-50 rounded transition-colors shrink-0">
                <GripVertical className="size-4" />
            </div>
            <div className="flex-1 min-w-0">
                {children}
            </div>
        </div>
    )
}
