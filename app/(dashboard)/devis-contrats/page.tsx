"use client"

import { useState, useEffect, useMemo } from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Badge
} from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PlusIcon, FileTextIcon, ScrollTextIcon, PencilIcon, TrashIcon, CheckCircleIcon, Circle, ArrowUpDown, ChevronDown, ChevronUp, Archive, Search, CalendarIcon, X, Filter, Palette, Phone, Loader2Icon, SaveIcon, UserPlus } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { DevisContratForm } from "@/components/devis-contrat-form"
import { supabase } from "@/lib/supabase"
import { format, isWithinInterval, startOfYear, endOfYear, startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay, isAfter, startOfWeek, endOfWeek } from "date-fns"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Define types for our data
type Devis = {
    id: string
    nom_client: string
    prix_total: string
    etat: string
    date_debut: string
    date_fin?: string
    lieu?: string
    nom_evenement?: string
    [key: string]: any
}

type Contrat = {
    id: string
    nom_client: string
    etat: string
    type: string
    date_debut: string
    date_fin?: string
    lieu?: string
    nom_evenement?: string
    [key: string]: any
}

export default function DevisContratsPage() {
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [formMode, setFormMode] = useState<"devis" | "contrat">("devis")
    const [editingItem, setEditingItem] = useState<Devis | Contrat | null>(null)
    const [isFormSaving, setIsFormSaving] = useState(false)
    const [validatingDevisId, setValidatingDevisId] = useState<string | null>(null)
    const [formSessionId, setFormSessionId] = useState(0)
    const [isMounted, setIsMounted] = useState(false)

    // Payment Dialog State
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
    const [paymentContext, setPaymentContext] = useState<{ item: any; field: 'acompte_paye' | 'solde_paye'; table: 'contrats' } | null>(null)
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("")

    useEffect(() => {
        setIsMounted(true)
    }, [])

    // Collapsible State
    const [showActiveDevis, setShowActiveDevis] = useState(true)
    const [showActiveContrats, setShowActiveContrats] = useState(true)
    const [showArchivedContrats, setShowArchivedContrats] = useState(false)
    const [devisList, setDevisList] = useState<Devis[]>([])
    const [contratsList, setContratsList] = useState<Contrat[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [statusSettings, setStatusSettings] = useState<any>(null)
    const [devisSortConfig, setDevisSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'date_debut', direction: 'asc' })
    const [contratSortConfig, setContratSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'date_debut', direction: 'asc' })
    const [archiveSortConfig, setArchiveSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'date_debut', direction: 'asc' })

    // Filter State
    const [searchQuery, setSearchQuery] = useState("")
    const [dateFilter, setDateFilter] = useState<string>("all")
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const [isCustomDateDialogOpen, setIsCustomDateDialogOpen] = useState(false)
    const [customDateRange, setCustomDateRange] = useState<{ start: string, end: string }>({
        start: format(new Date(), "yyyy-MM-dd"),
        end: format(new Date(), "yyyy-MM-dd")
    })
    const [tempCustomRange, setTempCustomRange] = useState<{ start: string, end: string }>({
        start: format(new Date(), "yyyy-MM-dd"),
        end: format(new Date(), "yyyy-MM-dd")
    })

    // Quick Delivery Edit State
    const [isQuickDeliveryDialogOpen, setIsQuickDeliveryDialogOpen] = useState(false)
    const [quickDeliveryItem, setQuickDeliveryItem] = useState<{ item: any, table: "devis" | "contrats" } | null>(null)
    const [tempDeliveryData, setTempDeliveryData] = useState<{ date: string, time: string, lieu: string }>({ date: "", time: "", lieu: "" })

    // Delete Confirmation State
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
    const [itemToDelete, setItemToDelete] = useState<{ mode: "devis" | "contrat", id: string, name: string } | null>(null)

    const openQuickDeliveryDialog = (item: any, table: "devis" | "contrats") => {
        setQuickDeliveryItem({ item, table })
        setTempDeliveryData({
            date: item.date_installation ? format(new Date(item.date_installation), "yyyy-MM-dd") : "",
            time: item.heure_debut || "",
            lieu: item.lieu || ""
        })
        setIsQuickDeliveryDialogOpen(true)
    }

    const handleSaveQuickDelivery = async () => {
        if (!quickDeliveryItem) return

        const { item, table } = quickDeliveryItem
        const { date, time, lieu } = tempDeliveryData

        // Update local state
        const updateList = (prev: any[]) => prev.map(d => {
            if (d.id === item.id) {
                return {
                    ...d,
                    date_installation: date,
                    heure_debut: time,
                    lieu,
                    data: { ...d.data, date_installation: date, heure_debut: time, lieu }
                }
            }
            return d
        })

        if (table === "devis") setDevisList(updateList)
        else setContratsList(updateList)

        // Supabase update handling (updating both root columns if exist and data jsonb)
        const updatePayload = {
            date_installation: date || null,
            heure_debut: time,
            lieu,
            data: { ...item.data, date_installation: date, heure_debut: time, lieu }
        }

        const { error } = await supabase
            .from(table === "devis" ? "devis" : "contrats")
            .update(updatePayload)
            .eq('id', item.id)

        if (error) {
            console.error("Error updating delivery info:", error)
            alert("Erreur lors de la mise à jour")
        }


        setIsQuickDeliveryDialogOpen(false)
    }

    // Generate and download vCard for adding client to contacts
    const downloadVCard = (item: any) => {
        const name = item.nom_client || "Client"
        const phone = item.telephone_client || ""
        const email = item.email_client || ""
        const eventDate = item.date_debut ? format(new Date(item.date_debut), "dd/MM/yyyy") : ""
        const eventTime = item.heure_debut || ""
        const location = item.lieu || ""
        const eventName = item.nom_evenement || ""

        // Build note with event info
        const noteParts = []
        if (eventName) noteParts.push(`Événement: ${eventName}`)
        if (eventDate) noteParts.push(`Date: ${eventDate}${eventTime ? ` à ${eventTime}` : ""}`)
        if (location) noteParts.push(`Lieu: ${location}`)
        const note = noteParts.join(" | ")

        // Create vCard content
        const vCard = `BEGIN:VCARD
VERSION:3.0
FN:${name}
${phone ? `TEL:${phone}` : ""}
${email ? `EMAIL:${email}` : ""}
${note ? `NOTE:${note}` : ""}
END:VCARD`

        // Create and download file
        const blob = new Blob([vCard], { type: "text/vcard;charset=utf-8" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = `${name.replace(/\s+/g, "_")}.vcf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }

    // Column resizing logic removed


    const handleSort = (key: string, tableType: 'devis' | 'contrat' | 'archive') => {
        const setter = tableType === 'devis' ? setDevisSortConfig : (tableType === 'contrat' ? setContratSortConfig : setArchiveSortConfig)
        setter(current => {
            if (current?.key === key) {
                return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
            }
            return { key, direction: 'asc' }
        })
    }

    const sortData = <T extends any>(data: T[], config: { key: string; direction: 'asc' | 'desc' } | null) => {
        if (!config) return data

        return [...data].sort((a, b) => {
            const itemA = a as any
            const itemB = b as any

            let aValue: any = itemA[config.key]
            let bValue: any = itemB[config.key]

            if (config.key === 'prix_total') {
                aValue = parseFloat(itemA.prix_total || "0")
                bValue = parseFloat(itemB.prix_total || "0")
            } else if (config.key === 'encaisse') {
                aValue = itemA.solde_paye ? parseFloat(itemA.prix_total || "0") : (itemA.acompte_paye ? parseFloat(itemA.acompte_recu || "0") : 0)
                bValue = itemB.solde_paye ? parseFloat(itemB.prix_total || "0") : (itemB.acompte_paye ? parseFloat(itemB.acompte_recu || "0") : 0)
            } else if (config.key === 'reste') {
                const aTotal = parseFloat(itemA.prix_total || "0")
                const aEncaisse = itemA.solde_paye ? aTotal : (itemA.acompte_paye ? parseFloat(itemA.acompte_recu || "0") : 0)
                aValue = aTotal - aEncaisse

                const bTotal = parseFloat(itemB.prix_total || "0")
                const bEncaisse = itemB.solde_paye ? bTotal : (itemB.acompte_paye ? parseFloat(itemB.acompte_recu || "0") : 0)
                bValue = bTotal - bEncaisse
            }

            if (config.key === 'date_debut') {
                const dateTimeA = `${itemA.date_debut || ""} ${itemA.heure_debut || "00:00"}`
                const dateTimeB = `${itemB.date_debut || ""} ${itemB.heure_debut || "00:00"}`
                aValue = dateTimeA
                bValue = dateTimeB
            }

            if (aValue < bValue) return config.direction === 'asc' ? -1 : 1
            if (aValue > bValue) return config.direction === 'asc' ? 1 : -1
            return 0
        })
    }

    // Filter Logic
    const applyFilters = <T extends any>(data: T[]) => {
        const now = new Date()
        return data.filter(item => {
            const record = item as any

            // 1. Search Filter
            const searchLower = searchQuery.toLowerCase()
            const matchesSearch = !searchQuery ||
                record.nom_client?.toLowerCase().includes(searchLower) ||
                record.id?.toLowerCase().includes(searchLower) ||
                record.reference?.toLowerCase().includes(searchLower) ||
                record.data?.reference?.toLowerCase().includes(searchLower)

            if (!matchesSearch) return false

            // 2. Status Filter
            const matchesStatus = statusFilter === "all" || record.etat === statusFilter
            if (!matchesStatus) return false

            // 3. Date Filter
            if (dateFilter === "all") return true

            const dateStr = record.date_debut
            if (!dateStr) return false
            const date = new Date(dateStr)

            switch (dateFilter) {
                case 'this_week':
                    return isWithinInterval(date, {
                        start: startOfWeek(now, { weekStartsOn: 1 }),
                        end: endOfWeek(now, { weekStartsOn: 1 })
                    })
                case 'this_year':
                    return isWithinInterval(date, { start: startOfYear(now), end: endOfYear(now) })
                case 'this_month':
                    return isWithinInterval(date, { start: startOfMonth(now), end: endOfMonth(now) })
                case 'last_month':
                    const lastMonthStart = startOfMonth(subMonths(now, 1))
                    const lastMonthEnd = endOfMonth(subMonths(now, 1))
                    return isWithinInterval(date, { start: lastMonthStart, end: lastMonthEnd })
                case 'last_3_months':
                    return isAfter(date, subMonths(now, 3))
                case 'last_6_months':
                    return isAfter(date, subMonths(now, 6))
                case 'custom':
                    const start = startOfDay(new Date(customDateRange.start))
                    const end = endOfDay(new Date(customDateRange.end))
                    return isWithinInterval(date, { start, end })
                default:
                    return true
            }
        })
    }

    const filteredDevis = useMemo(() => applyFilters(devisList), [devisList, searchQuery, dateFilter, statusFilter, customDateRange])
    const filteredContrats = useMemo(() => applyFilters(contratsList), [contratsList, searchQuery, dateFilter, statusFilter, customDateRange])

    const filteredSortedDevis = useMemo(() => sortData(filteredDevis, devisSortConfig), [filteredDevis, devisSortConfig])

    const isArchived = (item: any) => {
        if (!item.date_debut) return false
        const date = new Date(item.date_debut)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        return date < today && !!item.solde_paye
    }

    const activeContrats = useMemo(() => filteredContrats.filter(c => !isArchived(c)), [filteredContrats])
    const archivedContrats = useMemo(() => filteredContrats.filter(c => isArchived(c)), [filteredContrats])

    const sortedActiveContrats = useMemo(() => sortData(activeContrats, contratSortConfig), [activeContrats, contratSortConfig])
    const sortedArchivedContrats = useMemo(() => sortData(archivedContrats, archiveSortConfig), [archivedContrats, archiveSortConfig])

    const getEquipmentName = (id: string, preference?: string) => {
        const preferences = ['bois', 'blanc', 'noir', 'import']
        if (!id || id === 'none' || preferences.includes(id)) {
            return <span className="text-muted-foreground italic text-xs">-</span>
        }
        const machine = statusSettings?.materiels?.find((m: any) => m.id === id)
        return machine ? <Badge variant="outline" className="text-[10px] font-normal">{machine.nom}</Badge> : <span className="text-muted-foreground italic text-xs">Inconnu</span>
    }

    useEffect(() => {
        fetchData()

        // Real-time subscription to auto-refresh when tables change
        const channel = (supabase as any)
            .channel('dashboard-sync')
            .on('postgres_changes', { event: '*', table: 'devis', schema: 'public' }, () => {
                console.log("Real-time: devis table changed, refreshing...")
                fetchData()
            })
            .on('postgres_changes', { event: '*', table: 'contrats', schema: 'public' }, () => {
                console.log("Real-time: contrats table changed, refreshing...")
                fetchData()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    async function fetchData() {
        setIsLoading(true)
        try {
            const { data: settingsData } = await supabase.from('settings').select('*').single()
            if (settingsData?.data) setStatusSettings(settingsData.data)

            const { data: devisData } = await supabase.from('devis').select('*').order('created_at', { ascending: false })
            setDevisList((devisData || []).map(item => ({ ...item, ...item.data })))

            const { data: contratsData } = await supabase.from('contrats').select('*').order('created_at', { ascending: false })
            setContratsList((contratsData || []).map(item => ({ ...item, ...item.data })))
        } catch (e) {
            console.error("Failed to fetch data", e)
        } finally {
            setIsLoading(false)
        }
    }

    const generateReference = (data: any, type: "devis" | "contrat" = "devis") => {
        const prefix = type === "contrat" ? "C" : "D"
        const datePart = data.date_debut ? format(new Date(data.date_debut), "yyyyMMdd") : format(new Date(), "yyyyMMdd")
        const initials = data.nom_client ? data.nom_client.split(' ').map((n: string) => n[0]).join('').toUpperCase() : "XX"
        return `${prefix}-${datePart}-${initials}`
    }

    const getDisplayReference = (item: any, type: "devis" | "contrat") => {
        const prefix = type === "contrat" ? "C" : "D"
        const ref = item.id || item.reference || item.data?.reference
        if (ref && ref.match(/^[DCAF]-[0-9]{8}-[A-Z0-9]+$/)) return `${prefix}${ref.substring(1)}`
        return generateReference(item, type)
    }

    const openCreateForm = (mode: "devis" | "contrat") => {
        setFormMode(mode)
        setEditingItem(null)
        setFormSessionId(prev => prev + 1)
        setIsDialogOpen(true)
    }

    const openEditForm = (mode: "devis" | "contrat", item: Devis | Contrat) => {
        setFormMode(mode)
        setEditingItem(item)
        setFormSessionId(prev => prev + 1)
        setIsDialogOpen(true)
    }

    const handleDeleteClick = (mode: "devis" | "contrat", item: any) => {
        setItemToDelete({ mode, id: item.id, name: item.nom_client || item.reference || "ce document" })
        setIsDeleteConfirmOpen(true)
    }

    const handleConfirmDelete = async () => {
        if (!itemToDelete) return
        const { mode, id } = itemToDelete

        const { error } = await supabase.from(mode === "devis" ? "devis" : "contrats").delete().eq('id', id)
        if (!error) {
            if (mode === "devis") setDevisList(prev => prev.filter(item => item.id !== id))
            else setContratsList(prev => prev.filter(item => item.id !== id))
            setIsDeleteConfirmOpen(false)
            setItemToDelete(null)
        } else {
            alert("Erreur lors de la suppression")
        }
    }

    const handleFormSuccess = async (savedRecord: any, keepOpen: boolean = false) => {
        const mappedItem = { ...savedRecord, ...savedRecord.data }

        if (editingItem) {
            // Check for migration (ID prefix changed)
            const oldId = editingItem.id
            const newId = savedRecord.id
            const oldType = oldId.startsWith('D') ? 'devis' : 'contrats'
            const newType = newId.startsWith('D') ? 'devis' : 'contrats'

            if (oldType !== newType) {
                console.log(`UI Sync: Migration detected. Moving from ${oldType} to ${newType}`)
                // Remove from old list
                if (oldType === 'devis') setDevisList(prev => prev.filter(i => i.id !== oldId))
                else setContratsList(prev => prev.filter(i => i.id !== oldId))

                // Add to new list
                if (newType === 'devis') setDevisList(prev => [mappedItem, ...prev])
                else setContratsList(prev => [mappedItem, ...prev])
            } else {
                // Normal update in the same list
                if (newType === "devis") setDevisList(prev => prev.map(item => item.id === mappedItem.id ? mappedItem : item))
                else setContratsList(prev => prev.map(item => item.id === mappedItem.id ? mappedItem : item))
            }
        } else {
            // New record
            const type = mappedItem.id.startsWith('D') ? 'devis' : 'contrats'
            if (type === "devis") setDevisList(prev => [mappedItem, ...prev])
            else setContratsList(prev => [mappedItem, ...prev])
        }
        if (keepOpen) {
            setEditingItem(mappedItem)
            // Sync form mode with the new record type to prevent migration loops
            setFormMode(mappedItem.id.startsWith('D') ? 'devis' : 'contrat')
        } else {
            setIsDialogOpen(false)
        }
    }

    const handleToggleChecklist = async (item: any, field: string, table: "devis" | "contrats") => {
        const newValue = !item[field]

        // If checking "contrat_signe" on a devis, trigger the full validation/migration process
        if (field === 'contrat_signe' && newValue === true && table === 'devis') {
            handleValidateDevis(item)
            return
        }

        // If checking a payment field, open dialog instead of direct toggle
        if (newValue && (field === 'acompte_paye' || field === 'solde_paye') && table === 'contrats') {
            setPaymentContext({ item, field, table })
            setSelectedPaymentMethod("")
            setIsPaymentDialogOpen(true)
            return
        }

        const updateState = (prev: any[]) => prev.map(d => d.id === item.id ? { ...d, [field]: newValue, data: { ...d.data, [field]: newValue } } : d)
        if (table === "devis") setDevisList(updateState)
        else setContratsList(updateState)

        const { error } = await supabase.from(table).update({ data: { ...item.data, [field]: newValue } }).eq('id', item.id)
        if (error) alert("Erreur lors de la mise à jour")
    }

    const handleConfirmPayment = async () => {
        if (!paymentContext || !selectedPaymentMethod) return

        const { item, field, table } = paymentContext
        const methodField = field === 'acompte_paye' ? 'acompte_methode' : 'solde_methode'
        const dateField = field === 'acompte_paye' ? 'acompte_date' : 'solde_date'
        const now = format(new Date(), "yyyy-MM-dd'T'HH:mm")

        const updateState = (prev: any[]) => prev.map(d =>
            d.id === item.id
                ? {
                    ...d,
                    [field]: true,
                    [methodField]: selectedPaymentMethod,
                    [dateField]: now,
                    data: { ...d.data, [field]: true, [methodField]: selectedPaymentMethod, [dateField]: now }
                }
                : d
        )

        setContratsList(updateState)

        const { error } = await supabase.from(table).update({
            data: { ...item.data, [field]: true, [methodField]: selectedPaymentMethod, [dateField]: now }
        }).eq('id', item.id)

        if (error) {
            alert("Erreur lors de la mise à jour du paiement")
        } else {
            setIsPaymentDialogOpen(false)
            setPaymentContext(null)
        }
    }

    const handleValidateDevis = async (devis: Devis) => {
        setValidatingDevisId(devis.id)
        try {
            const newId = generateReference(devis, "contrat")
            const newContract = {
                id: newId,
                nom_client: devis.nom_client,
                prix_total: devis.prix_total,
                date_debut: devis.date_debut,
                data: {
                    ...devis.data,
                    reference: newId,
                    etat: "Validé",
                    contrat_signe: true
                }
            }

            // 1. Insert into contracts
            const { data: savedRecord, error: insertError } = await supabase
                .from('contrats')
                .insert([newContract])
                .select()
                .single()

            if (insertError) throw insertError

            // 2. Delete from devis
            const { error: deleteError } = await supabase
                .from('devis')
                .delete()
                .eq('id', devis.id)

            if (deleteError) {
                console.error("Validation delete error:", deleteError)
            }

            // 3. Update local state
            const mappedItem = { ...savedRecord, ...savedRecord.data }
            setDevisList(prev => prev.filter(i => i.id !== devis.id))
            setContratsList(prev => [mappedItem, ...prev])

        } catch (e) {
            console.error("Validation error", e)
            alert("Erreur lors de la validation du devis.")
        } finally {
            setValidatingDevisId(null)
        }
    }

    const handleEquipmentChange = async (item: any, table: "devis" | "contrats", newEquipmentId: string) => {
        const updateState = (prev: any[]) => prev.map(d =>
            d.id === item.id
                ? { ...d, equipment_id: newEquipmentId, data: { ...d.data, equipment_id: newEquipmentId } }
                : d
        )

        if (table === "devis") setDevisList(updateState)
        else setContratsList(updateState)

        const { error } = await supabase
            .from(table)
            .update({ data: { ...item.data, equipment_id: newEquipmentId } })
            .eq('id', item.id)

        if (error) {
            console.error("Error updating equipment:", error)
            alert("Erreur lors de la mise à jour du matériel")
            fetchData()
        }
    }

    const EquipmentSelector = ({ item, table }: { item: any, table: "devis" | "contrats" }) => {
        const currentId = item.data?.equipment_id || item.equipment_id || "none"

        return (
            <Select
                value={currentId}
                onValueChange={(val) => handleEquipmentChange(item, table, val)}
            >
                <SelectTrigger className="h-7 w-fit min-w-[70px] max-w-[90px] text-[10px] bg-transparent border-slate-200 hover:border-indigo-400 transition-colors px-2">
                    <SelectValue placeholder="Matériel">
                        {statusSettings?.materiels?.find((m: any) => m.id === currentId)?.nom || (currentId === "none" ? "-" : currentId)}
                    </SelectValue>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="none" className="text-[10px]">Aucun</SelectItem>
                    {statusSettings?.materiels?.map((m: any) => (
                        <SelectItem key={m.id} value={m.id} className="text-[10px]">
                            {m.nom}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        )
    }

    const OfferCell = ({ item }: { item: any }) => {
        const rawData = item.data || {}
        const fullOffre = item.offre || rawData.offre || "-"
        const mainOffre = fullOffre.split(':')[0].trim()
        const options = item.selected_options || rawData.selected_options || []

        return (
            <div className="flex flex-col gap-1 py-1">
                <div className="text-[11px] font-bold text-indigo-700 uppercase tracking-tight leading-none">
                    {mainOffre}
                </div>
                {options.length > 0 && (
                    <div className="flex flex-col gap-1 mt-1 items-start">
                        {options.map((opt: any, i: number) => (
                            <span
                                key={i}
                                className="text-[9px] leading-[1.1] px-1.5 py-1 rounded-md bg-slate-100 text-slate-600 font-semibold border border-slate-200"
                            >
                                {opt.name}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        )
    }

    const handleDateFilterChange = (val: string) => {
        if (val === "custom") setIsCustomDateDialogOpen(true)
        else setDateFilter(val)
    }

    const applyCustomDate = () => {
        setCustomDateRange(tempCustomRange)
        setDateFilter("custom")
        setIsCustomDateDialogOpen(false)
    }

    const activeDateLabel = useMemo(() => {
        switch (dateFilter) {
            case 'this_week': return "Cette semaine"
            case 'this_year': return "Cette année"
            case 'this_month': return "Ce mois-ci"
            case 'last_month': return "Mois dernier"
            case 'last_3_months': return "3 mois"
            case 'last_6_months': return "6 mois"
            case 'custom': return `Du ${format(new Date(customDateRange.start), 'dd/MM/yy')} au ${format(new Date(customDateRange.end), 'dd/MM/yy')}`
            default: return "Toute période"
        }
    }, [dateFilter, customDateRange])

    const availableStatuses = useMemo(() => {
        const statuses = new Set<string>()
        contratsList.forEach(c => { if (c.etat) statuses.add(c.etat) })
        devisList.forEach(d => { if (d.etat) statuses.add(d.etat) })
        return Array.from(statuses).sort()
    }, [contratsList, devisList])

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
            <div className="flex items-center justify-between">
                <h1 className="text-lg font-semibold md:text-2xl">Contrats</h1>
                <Button onClick={() => openCreateForm("contrat")} variant="default" className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                    <PlusIcon className="size-4" /> Créer un contrat
                </Button>
            </div>

            {/* Sticky Filter Container */}
            <div className="sticky top-0 z-[40] bg-slate-50/80 backdrop-blur-md -mx-4 px-4 py-3 lg:-mx-6 lg:px-6 border-b border-slate-200/50 space-y-3 shadow-sm">
                <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                        {[
                            { id: 'all', label: 'Tout' },
                            { id: 'this_week', label: 'Cette semaine' },
                            { id: 'this_month', label: 'Ce mois-ci' },
                            { id: 'this_year', label: 'Cette année' },
                            { id: 'last_month', label: 'Dernier mois' },
                            { id: 'last_3_months', label: '3 mois' },
                            { id: 'last_6_months', label: '6 mois' },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setDateFilter(tab.id)}
                                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all border ${dateFilter === tab.id
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100 scale-105'
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                        <button
                            onClick={() => setIsCustomDateDialogOpen(true)}
                            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all border flex items-center gap-1.5 ${dateFilter === 'custom'
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100 scale-105'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                                }`}
                        >
                            <CalendarIcon className="size-3" />
                            {dateFilter === 'custom' ? activeDateLabel : 'Personnalisé...'}
                        </button>
                    </div>

                    <div className="flex items-center gap-3 w-full xl:w-auto">
                        <div className="relative flex-1 xl:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                            <Input
                                placeholder="Rechercher client, réf..."
                                className="pl-9 bg-white border-slate-200 rounded-lg h-9 text-sm"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && (
                                <X className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 cursor-pointer hover:text-black" onClick={() => setSearchQuery("")} />
                            )}
                        </div>

                        <div className="w-32 md:w-48">
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="h-9 bg-white border-slate-200 text-xs">
                                    <Filter className="size-3.5 mr-2 text-slate-400" />
                                    <SelectValue placeholder="Statut" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tous statuts</SelectItem>
                                    {availableStatuses.map(s => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-9 rounded-lg hover:bg-slate-100"
                            title="Reset"
                            onClick={() => { setSearchQuery(""); setDateFilter("all"); setStatusFilter("all"); }}
                        >
                            <X className="size-4 text-slate-500" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Active Date Indicator */}
            {(dateFilter !== "all" || statusFilter !== "all" || searchQuery) && (
                <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground font-medium">Filtres actifs :</span>
                    {searchQuery && <Badge variant="secondary" className="gap-1 px-2">{searchQuery}</Badge>}
                    {dateFilter !== "all" && <Badge variant="secondary" className="gap-1 px-2">{activeDateLabel}</Badge>}
                    {statusFilter !== "all" && <Badge variant="secondary" className="gap-1 px-2">{statusFilter}</Badge>}
                </div>
            )}

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent
                    className="sm:max-w-[1000px] w-full h-[100dvh] sm:h-auto sm:max-h-[95vh] p-0 !pt-[env(safe-area-inset-top,0px)] !pb-[env(safe-area-inset-bottom,0px)] overflow-hidden overflow-x-hidden flex flex-col border-none shadow-2xl !rounded-none sm:!rounded-xl"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                >
                    <DialogHeader className="px-3 sm:px-6 py-2 sm:py-3 border-b bg-white flex-shrink-0 z-50 flex flex-row items-center justify-between min-h-[52px]">
                        <DialogTitle className="flex items-center gap-1.5 text-sm sm:text-2xl font-bold tracking-tight text-slate-900">
                            {formMode === "devis" ? <FileTextIcon className="size-4 sm:size-7 text-indigo-600" /> : <ScrollTextIcon className="size-4 sm:size-7 text-indigo-600" />}
                            <span className="truncate max-w-[120px] sm:max-w-none">
                                {editingItem ? `Modifier ${formMode === "devis" ? "Devis" : "Contrat"}` : `Nouveau ${formMode === "devis" ? "Devis" : "Contrat"}`}
                            </span>
                        </DialogTitle>
                        <div className="flex items-center gap-3 mr-8">
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
                        </div>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 px-2 sm:px-6 py-2 sm:py-4 pb-[calc(env(safe-area-inset-bottom,0px)+16px)]">
                        <DevisContratForm
                            id="devis-contrat-form"
                            key={editingItem?.id || `${formMode}-${isDialogOpen}`}
                            mode={formMode}
                            initialData={editingItem}
                            onSuccess={handleFormSuccess}
                            onSavingChange={setIsFormSaving}
                        />
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isCustomDateDialogOpen} onOpenChange={setIsCustomDateDialogOpen}>
                <DialogContent className="!inset-auto !top-1/2 !left-1/2 !-translate-x-1/2 !-translate-y-1/2 !h-auto !max-h-[90vh] !rounded-xl !p-6 max-w-[calc(100%-2rem)] sm:max-w-[425px]" onOpenAutoFocus={(e) => e.preventDefault()}>
                    <DialogHeader><DialogTitle>Période personnalisée</DialogTitle></DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Début</Label>
                            <Input type="date" className="col-span-3" value={tempCustomRange.start} onChange={(e) => setTempCustomRange(p => ({ ...p, start: e.target.value }))} />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Fin</Label>
                            <Input type="date" className="col-span-3" value={tempCustomRange.end} onChange={(e) => setTempCustomRange(p => ({ ...p, end: e.target.value }))} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCustomDateDialogOpen(false)}>Annuler</Button>
                        <Button onClick={applyCustomDate}>Appliquer</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                <DialogContent className="!inset-auto !top-1/2 !left-1/2 !-translate-x-1/2 !-translate-y-1/2 !h-auto !max-h-[90vh] !rounded-xl !p-6 max-w-[calc(100%-2rem)] sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Mode de paiement</DialogTitle>
                        <DialogDescription>
                            Sélectionnez le mode de paiement pour {paymentContext?.field === 'acompte_paye' ? "l'acompte" : "le solde"}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-3 py-4">

                        {[
                            { value: "Especes", label: "Espèces" },
                            { value: "Virement", label: "Virement" },
                            { value: "Cheque", label: "Chèque" },
                            { value: "PayPal", label: "PayPal" }
                        ].map((method) => (
                            <Button
                                key={method.value}
                                variant={selectedPaymentMethod === method.value ? "default" : "outline"}
                                className={`justify-start h-12 text-sm ${selectedPaymentMethod === method.value ? "bg-indigo-600 hover:bg-indigo-700" : ""}`}
                                onClick={() => setSelectedPaymentMethod(method.value)}
                            >
                                <div className={`size-3 rounded-full mr-3 ${selectedPaymentMethod === method.value ? "bg-white" : "border border-slate-300"}`} />
                                {method.label}
                            </Button>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => { setIsPaymentDialogOpen(false); setPaymentContext(null); }}>Annuler</Button>
                        <Button
                            className="bg-indigo-600 hover:bg-indigo-700"
                            disabled={!selectedPaymentMethod}
                            onClick={handleConfirmPayment}
                        >
                            Valider le paiement
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isQuickDeliveryDialogOpen} onOpenChange={setIsQuickDeliveryDialogOpen}>
                <DialogContent className="!inset-auto !top-1/2 !left-1/2 !-translate-x-1/2 !-translate-y-1/2 !h-auto !max-h-[90vh] !rounded-xl !p-6 max-w-[calc(100%-2rem)] sm:max-w-[425px]" onOpenAutoFocus={(e) => e.preventDefault()}>
                    <DialogHeader>
                        <DialogTitle>Modifier la livraison</DialogTitle>
                        <DialogDescription>
                            Modifiez rapidement les informations de livraison.
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
                                placeholder="Adresse compléte..."
                                onChange={(e) => setTempDeliveryData(p => ({ ...p, lieu: e.target.value }))}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsQuickDeliveryDialogOpen(false)}>Annuler</Button>
                        <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={handleSaveQuickDelivery}>Enregistrer</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
                <DialogContent className="!inset-auto !top-1/2 !left-1/2 !-translate-x-1/2 !-translate-y-1/2 !h-auto !max-h-[90vh] !rounded-xl !p-6 max-w-[calc(100%-2rem)] sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <TrashIcon className="size-5" />
                            Confirmer la suppression
                        </DialogTitle>
                        <DialogDescription className="pt-2">
                            Êtes-vous sûr de vouloir supprimer définitivement <strong>{itemToDelete?.name}</strong> ?
                            Cette action est irréversible.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0 mt-4">
                        <Button variant="ghost" onClick={() => setIsDeleteConfirmOpen(false)}>Annuler</Button>
                        <Button variant="destructive" onClick={handleConfirmDelete}>Supprimer</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="w-full mt-4">
                <div className="space-y-8">
                    {/* DEVIS EN COURS */}
                    {filteredSortedDevis.length > 0 && (
                        <div>
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 cursor-pointer select-none hover:text-indigo-600 transition-colors" onClick={() => setShowActiveDevis(!showActiveDevis)}>
                                {showActiveDevis ? <ChevronDown className="size-5" /> : <ChevronUp className="size-5 text-muted-foreground" />}
                                <FileTextIcon className="size-5 text-indigo-500" /> Devis en cours ({filteredSortedDevis.length})
                            </h3>
                            {showActiveDevis && (
                                <div className="rounded-md border bg-white shadow-sm overflow-x-auto mb-8">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-slate-50/50">
                                                <TableHead className="w-[80px]"></TableHead>
                                                <TableHead onClick={() => handleSort('id', 'devis')} className="cursor-pointer hover:bg-slate-100 whitespace-nowrap">N°</TableHead>
                                                <TableHead onClick={() => handleSort('date_debut', 'devis')} className="cursor-pointer hover:bg-slate-100 whitespace-nowrap">DATE</TableHead>
                                                <TableHead className="whitespace-nowrap w-[120px] min-w-[120px]">LIVRAISON</TableHead>
                                                <TableHead onClick={() => handleSort('nom_client', 'devis')} className="cursor-pointer hover:bg-slate-100 whitespace-nowrap">CLIENT</TableHead>
                                                <TableHead className="whitespace-nowrap">OFFRE</TableHead>
                                                <TableHead>MATÉRIEL</TableHead>
                                                <TableHead onClick={() => handleSort('prix_total', 'devis')} className="cursor-pointer hover:bg-slate-100">TOTAL</TableHead>
                                                <TableHead className="text-center">SOLDE</TableHead>
                                                <TableHead className="w-[50px]"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {isLoading ? (
                                                <TableRow><TableCell colSpan={10} className="text-center h-24 text-muted-foreground animate-pulse">Chargement...</TableCell></TableRow>
                                            ) : filteredSortedDevis.length === 0 ? (
                                                <TableRow><TableCell colSpan={10} className="text-center h-24 text-muted-foreground">Aucun devis trouvé.</TableCell></TableRow>
                                            ) : filteredSortedDevis.map((devis) => (
                                                <TableRow key={devis.id} className="hover:bg-slate-50/50">
                                                    <TableCell className="text-center">
                                                        <div className="flex justify-center gap-1 items-center">
                                                            <Button size="icon" variant="ghost" className="size-8 text-indigo-600 hover:bg-indigo-50" onClick={() => openEditForm("devis", devis)} title="Modifier">
                                                                <PencilIcon className="size-4" />
                                                            </Button>
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="size-8 text-emerald-600 hover:text-white hover:bg-emerald-500 hover:border-emerald-600 transition-all group"
                                                                onClick={() => handleValidateDevis(devis)}
                                                                disabled={validatingDevisId === devis.id}
                                                                title="Valider le Devis"
                                                            >
                                                                {validatingDevisId === devis.id ? (
                                                                    <div className="size-3 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                                                                ) : (
                                                                    <CheckCircleIcon className="size-4 transition-transform group-hover:scale-110" />
                                                                )}
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="font-mono text-[10px]">{getDisplayReference(devis, "devis")}</TableCell>
                                                    <TableCell className="text-xs">{devis.date_debut ? format(new Date(devis.date_debut), 'dd/MM/yy') : "-"}</TableCell>
                                                    <TableCell className="text-xs leading-tight w-[120px] min-w-[120px] max-w-[120px] whitespace-normal group">
                                                        <div className="flex flex-col items-start w-full">
                                                            <div className="flex items-center gap-1 whitespace-nowrap">
                                                                {devis.date_installation ? (
                                                                    <>
                                                                        <span className="text-[9px] text-muted-foreground">{format(new Date(devis.date_installation), 'dd/MM/yy')}</span>
                                                                        <span className="text-[10px] text-indigo-600 font-bold">{devis.heure_debut || "8:00"}</span>
                                                                    </>
                                                                ) : (
                                                                    <span className="text-slate-300 italic text-[9px]">Livraison non planifiée</span>
                                                                )}
                                                                <button onClick={(e) => { e.stopPropagation(); openQuickDeliveryDialog(devis, "devis") }} className="p-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-400 hover:text-indigo-600 transition-all ml-1">
                                                                    <PencilIcon className="size-2.5" />
                                                                </button>
                                                            </div>
                                                            {devis.lieu && (
                                                                <span className="text-[9px] text-slate-400 italic mt-0.5 whitespace-normal break-words block w-full" title={devis.lieu}>
                                                                    {devis.lieu}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <div className="font-medium text-sm">{devis.nom_client}</div>
                                                            {devis.telephone_client && (
                                                                <button
                                                                    onClick={() => downloadVCard(devis)}
                                                                    className="text-[10px] text-indigo-500 hover:underline flex items-center gap-1 cursor-pointer"
                                                                    title="Ajouter au répertoire"
                                                                >
                                                                    <UserPlus className="size-2.5" />
                                                                    {devis.telephone_client}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell><OfferCell item={devis} /></TableCell>
                                                    <TableCell><EquipmentSelector item={devis} table="devis" /></TableCell>
                                                    <TableCell className="text-sm font-semibold">{parseFloat(devis.prix_total || "0").toFixed(2)}€</TableCell>
                                                    <TableCell className="text-sm font-semibold text-center text-red-500">
                                                        {parseFloat(devis.prix_total || "0").toFixed(2)}€
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Button size="icon" variant="ghost" className="size-8 text-slate-300 hover:text-red-600 hover:bg-red-50 transition-colors" onClick={(e) => { e.stopPropagation(); handleDeleteClick("devis", devis) }} title="Supprimer">
                                                            <TrashIcon className="size-3.5" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ACTIVE CONTRATS */}
                    <div>
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 cursor-pointer select-none hover:text-indigo-600 transition-colors" onClick={() => setShowActiveContrats(!showActiveContrats)}>
                            {showActiveContrats ? <ChevronDown className="size-5" /> : <ChevronUp className="size-5 text-muted-foreground" />}
                            <ScrollTextIcon className="size-5 text-indigo-500" /> Contrats en cours ({activeContrats.length})
                        </h3>
                        {showActiveContrats && (
                            <div className="rounded-md border bg-white shadow-sm overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-50/50">
                                            <TableHead className="w-[60px]"></TableHead>
                                            <TableHead onClick={() => handleSort('id', 'contrat')} className="cursor-pointer hover:bg-slate-100 whitespace-nowrap">N°</TableHead>
                                            <TableHead onClick={() => handleSort('date_debut', 'contrat')} className="cursor-pointer hover:bg-slate-100 whitespace-nowrap">DATE</TableHead>
                                            <TableHead onClick={() => handleSort('date_debut', 'contrat')} className="cursor-pointer hover:bg-slate-100 whitespace-nowrap w-[120px] min-w-[120px]">LIVRAISON</TableHead>
                                            <TableHead onClick={() => handleSort('nom_client', 'contrat')} className="cursor-pointer hover:bg-slate-100 whitespace-nowrap">CLIENT</TableHead>
                                            <TableHead className="whitespace-nowrap">OFFRE</TableHead>
                                            <TableHead className="whitespace-nowrap">MATÉRIEL</TableHead>
                                            <TableHead onClick={() => handleSort('prix_total', 'contrat')} className="cursor-pointer hover:bg-slate-100">TOTAL</TableHead>
                                            <TableHead onClick={() => handleSort('encaisse', 'contrat')} className="cursor-pointer hover:bg-slate-100">ENCAISSÉ</TableHead>
                                            <TableHead className="text-center cursor-pointer hover:bg-slate-100" onClick={() => handleSort('reste', 'contrat')}>SOLDE</TableHead>
                                            <TableHead className="text-center">SUIVI</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoading ? (
                                            <TableRow><TableCell colSpan={12} className="text-center h-24 text-muted-foreground animate-pulse">Chargement...</TableCell></TableRow>
                                        ) : activeContrats.length === 0 ? (
                                            <TableRow><TableCell colSpan={12} className="text-center h-24 text-muted-foreground">Aucun contrat trouvé.</TableCell></TableRow>
                                        ) : sortedActiveContrats.map((contrat) => (
                                            <TableRow key={contrat.id} className="hover:bg-slate-50/50">
                                                <TableCell className="text-center">
                                                    <div className="flex justify-center">
                                                        <Button size="icon" variant="ghost" className="size-8 text-indigo-600 hover:bg-indigo-50" onClick={() => openEditForm("contrat", contrat)} title="Modifier">
                                                            <PencilIcon className="size-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-mono text-[10px]">{getDisplayReference(contrat, "contrat")}</TableCell>
                                                <TableCell className="text-xs">{contrat.date_debut ? format(new Date(contrat.date_debut), 'dd/MM/yy') : "-"}</TableCell>
                                                <TableCell className="text-xs leading-tight w-[120px] min-w-[120px] max-w-[120px] whitespace-normal group">
                                                    <div className="flex flex-col items-start w-full">
                                                        <div className="flex items-center gap-1 whitespace-nowrap">
                                                            {contrat.date_installation ? (
                                                                <>
                                                                    <span className="text-[9px] text-muted-foreground">{format(new Date(contrat.date_installation), 'dd/MM/yy')}</span>
                                                                    <span className="text-[10px] text-indigo-600 font-bold">{contrat.heure_debut || "8:00"}</span>
                                                                </>
                                                            ) : (
                                                                <span className="text-slate-300 italic text-[9px]">Livraison non planifiée</span>
                                                            )}
                                                            <button onClick={(e) => { e.stopPropagation(); openQuickDeliveryDialog(contrat, "contrats") }} className="p-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-400 hover:text-indigo-600 transition-all ml-1">
                                                                <PencilIcon className="size-2.5" />
                                                            </button>
                                                        </div>
                                                        {contrat.lieu && (
                                                            <a
                                                                href={`https://waze.com/ul?q=${encodeURIComponent(contrat.lieu)}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-[9px] text-slate-500 italic mt-0.5 hover:underline hover:text-indigo-600 whitespace-normal break-words block w-full"
                                                                title="Ouvrir dans Waze"
                                                            >
                                                                {contrat.lieu}
                                                            </a>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <div className="font-medium text-sm">{contrat.nom_client}</div>
                                                        {contrat.telephone_client && (
                                                            <button
                                                                onClick={() => downloadVCard(contrat)}
                                                                className="text-[10px] text-indigo-500 hover:underline flex items-center gap-1 cursor-pointer"
                                                                title="Ajouter au répertoire"
                                                            >
                                                                <UserPlus className="size-2.5" />
                                                                {contrat.telephone_client}
                                                            </button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell><OfferCell item={contrat} /></TableCell>
                                                <TableCell><EquipmentSelector item={contrat} table="contrats" /></TableCell>
                                                <TableCell className="text-sm font-semibold">{parseFloat(contrat.prix_total || "0").toFixed(2)}€</TableCell>
                                                <TableCell className="text-xs text-emerald-600 font-medium">
                                                    {contrat.solde_paye ? parseFloat(contrat.prix_total || "0").toFixed(2) : (contrat.acompte_paye ? parseFloat(contrat.acompte_recu || "0") : 0).toFixed(2)}€
                                                </TableCell>
                                                <TableCell className={`text-sm font-bold text-center ${parseFloat(contrat.prix_total || "0") - (contrat.solde_paye ? parseFloat(contrat.prix_total || "0") : (contrat.acompte_paye ? parseFloat(contrat.acompte_recu || "0") : 0)) > 0 ? "text-red-500" : "text-emerald-600"}`}>
                                                    {(parseFloat(contrat.prix_total || "0") - (contrat.solde_paye ? parseFloat(contrat.prix_total || "0") : (contrat.acompte_paye ? parseFloat(contrat.acompte_recu || "0") : 0))).toFixed(2)}€
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex gap-1 justify-center flex-wrap">
                                                        {/* Fixed step 0: Contrat Signé */}
                                                        <div title={statusSettings?.workflow_steps?.[0] || "Contrat Signé"} className="cursor-pointer" onClick={() => handleToggleChecklist(contrat, 'contrat_signe', 'contrats')}>
                                                            {(contrat.contrat_signe || contrat.data?.contrat_signe) ? <CheckCircleIcon className="size-4 text-emerald-500" /> : <Circle className="size-4 text-slate-200" />}
                                                        </div>
                                                        {/* Fixed step 1: Acompte */}
                                                        <div title={`${statusSettings?.workflow_steps?.[1] || "Acompte Reçu"} ${contrat.data?.acompte_methode ? `(${contrat.data.acompte_methode})` : ""}`} className="cursor-pointer flex flex-col items-center gap-0.5 group" onClick={() => handleToggleChecklist(contrat, 'acompte_paye', 'contrats')}>
                                                            {contrat.acompte_paye ? <CheckCircleIcon className="size-4 text-emerald-500" /> : <Circle className="size-4 text-slate-200" />}
                                                            {contrat.acompte_paye && contrat.data?.acompte_methode && (
                                                                <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-tighter leading-none">{contrat.data.acompte_methode.substring(0, 3)}</span>
                                                            )}
                                                        </div>
                                                        {/* Fixed step 2: Solde */}
                                                        <div title={`${statusSettings?.workflow_steps?.[2] || "Solde Reçu"} ${contrat.data?.solde_methode ? `(${contrat.data.solde_methode})` : ""}`} className="cursor-pointer flex flex-col items-center gap-0.5 group" onClick={() => handleToggleChecklist(contrat, 'solde_paye', 'contrats')}>
                                                            {contrat.solde_paye ? <CheckCircleIcon className="size-4 text-emerald-500" /> : <Circle className="size-4 text-slate-200" />}
                                                            {contrat.solde_paye && contrat.data?.solde_methode && (
                                                                <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-tighter leading-none">{contrat.data.solde_methode.substring(0, 3)}</span>
                                                            )}
                                                        </div>
                                                        {/* Dynamic steps from index 3 onwards */}
                                                        {(statusSettings?.workflow_steps || []).slice(3).map((stepName: string, idx: number) => {
                                                            const stepIndex = idx + 3
                                                            const stepKey = String(stepIndex)
                                                            const isChecked = contrat.data?.workflow_status?.[stepKey] === true
                                                            return (
                                                                <div key={stepKey} title={stepName} className="cursor-pointer" onClick={() => {
                                                                    const currentStatus = contrat.data?.workflow_status || {}
                                                                    const newStatus = { ...currentStatus, [stepKey]: !isChecked }
                                                                    // Update via supabase directly
                                                                    supabase.from('contrats').update({ data: { ...contrat.data, workflow_status: newStatus } }).eq('id', contrat.id).then(() => {
                                                                        setContratsList(prev => prev.map(c => c.id === contrat.id ? { ...c, data: { ...c.data, workflow_status: newStatus } } : c))
                                                                    })
                                                                }}>
                                                                    {isChecked ? <CheckCircleIcon className="size-4 text-emerald-500" /> : <Circle className="size-4 text-slate-200" />}
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Button size="icon" variant="ghost" className="size-8 text-slate-300 hover:text-red-600 hover:bg-red-50 transition-colors" onClick={(e) => { e.stopPropagation(); handleDeleteClick("contrat", contrat) }} title="Supprimer">
                                                        <TrashIcon className="size-3.5" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </div>

                    {/* ARCHIVED CONTRATS */}
                    {archivedContrats.length > 0 && (
                        <div>
                            <h3 className="text-md font-bold mb-4 flex items-center gap-2 text-slate-400 cursor-pointer select-none hover:text-slate-600" onClick={() => setShowArchivedContrats(!showArchivedContrats)}>
                                {showArchivedContrats ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
                                <Archive className="size-4" /> Archives ({archivedContrats.length})
                            </h3>
                            {showArchivedContrats && (
                                <div className="rounded-md border bg-slate-50/30 overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-slate-50/50">
                                                <TableHead className="w-[60px]"></TableHead>
                                                <TableHead onClick={() => handleSort('id', 'archive')} className="cursor-pointer hover:bg-slate-100 whitespace-nowrap">N°</TableHead>
                                                <TableHead onClick={() => handleSort('date_debut', 'archive')} className="cursor-pointer hover:bg-slate-100 whitespace-nowrap">DATE</TableHead>
                                                <TableHead onClick={() => handleSort('date_debut', 'archive')} className="cursor-pointer hover:bg-slate-100 whitespace-nowrap w-[120px] min-w-[120px]">LIVRAISON</TableHead>
                                                <TableHead onClick={() => handleSort('nom_client', 'archive')} className="cursor-pointer hover:bg-slate-100 whitespace-nowrap">CLIENT</TableHead>
                                                <TableHead className="whitespace-nowrap">OFFRE</TableHead>
                                                <TableHead className="whitespace-nowrap">MATÉRIEL</TableHead>
                                                <TableHead onClick={() => handleSort('prix_total', 'archive')} className="cursor-pointer hover:bg-slate-100">TOTAL</TableHead>
                                                <TableHead className="text-center cursor-pointer hover:bg-slate-100" onClick={() => handleSort('encaisse', 'archive')}>ENCAISSÉ</TableHead>
                                                <TableHead className="text-center cursor-pointer hover:bg-slate-100" onClick={() => handleSort('reste', 'archive')}>SOLDE</TableHead>
                                                <TableHead className="text-center">SUIVI</TableHead>
                                                <TableHead className="w-[50px]"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {isLoading ? (
                                                <TableRow><TableCell colSpan={12} className="text-center h-24 text-muted-foreground animate-pulse">Chargement...</TableCell></TableRow>
                                            ) : archivedContrats.length === 0 ? (
                                                <TableRow><TableCell colSpan={12} className="text-center h-24 text-muted-foreground">Aucune archive trouvée.</TableCell></TableRow>
                                            ) : sortedArchivedContrats.map((contrat) => (
                                                <TableRow key={contrat.id} className="opacity-70 h-10 hover:opacity-100 transition-opacity">
                                                    <TableCell className="text-center">
                                                        <div className="flex justify-center">
                                                            <Button size="icon" variant="ghost" className="size-7 text-indigo-600 hover:bg-indigo-50" onClick={() => openEditForm("contrat", contrat)} title="Modifier">
                                                                <PencilIcon className="size-3" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="font-mono text-[10px]">{getDisplayReference(contrat, "contrat")}</TableCell>
                                                    <TableCell className="text-xs">{contrat.date_debut ? format(new Date(contrat.date_debut), 'dd/MM/yy') : "-"}</TableCell>
                                                    <TableCell className="text-xs leading-tight w-[120px] min-w-[120px] max-w-[120px] whitespace-normal group">
                                                        <div className="flex flex-col items-start w-full">
                                                            <div className="flex items-center gap-1 whitespace-nowrap">
                                                                {contrat.date_installation ? (
                                                                    <>
                                                                        <span className="text-[9px] text-muted-foreground/70">{format(new Date(contrat.date_installation), 'dd/MM/yy')}</span>
                                                                        <span className="text-[10px] text-indigo-500 font-bold">{contrat.heure_debut || "8:00"}</span>
                                                                    </>
                                                                ) : (
                                                                    <span className="text-slate-300 italic text-[9px]">Livraison non planifiée</span>
                                                                )}
                                                                <button onClick={(e) => { e.stopPropagation(); openQuickDeliveryDialog(contrat, "contrats") }} className="p-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-400 hover:text-indigo-600 transition-all ml-1">
                                                                    <PencilIcon className="size-2.5" />
                                                                </button>
                                                            </div>
                                                            {contrat.lieu && (
                                                                <a
                                                                    href={`https://waze.com/ul?q=${encodeURIComponent(contrat.lieu)}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-[9px] text-slate-400 italic mt-0.5 hover:underline hover:text-indigo-400 whitespace-normal break-words block w-full"
                                                                    title="Ouvrir dans Waze"
                                                                >
                                                                    {contrat.lieu}
                                                                </a>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <div className="font-medium text-sm">{contrat.nom_client}</div>
                                                            {contrat.telephone_client && (
                                                                <button
                                                                    onClick={() => downloadVCard(contrat)}
                                                                    className="text-[10px] text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                                                                    title="Ajouter au répertoire"
                                                                >
                                                                    <UserPlus className="size-2.5" />
                                                                    {contrat.telephone_client}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell><OfferCell item={contrat} /></TableCell>
                                                    <TableCell className="text-xs">{getEquipmentName(contrat.data?.equipment_id)}</TableCell>
                                                    <TableCell className="text-xs font-semibold">{parseFloat(contrat.prix_total || "0").toFixed(2)}€</TableCell>
                                                    <TableCell className="text-[10px] text-emerald-600/70 font-medium">
                                                        {contrat.solde_paye ? parseFloat(contrat.prix_total || "0").toFixed(2) : (contrat.acompte_paye ? parseFloat(contrat.acompte_recu || "0") : 0).toFixed(2)}€
                                                    </TableCell>
                                                    <TableCell className={`text-[10px] font-bold text-center ${parseFloat(contrat.prix_total || "0") - (contrat.solde_paye ? parseFloat(contrat.prix_total || "0") : (contrat.acompte_paye ? parseFloat(contrat.acompte_recu || "0") : 0)) > 0 ? "text-red-500/70" : "text-emerald-600/70"}`}>
                                                        {(parseFloat(contrat.prix_total || "0") - (contrat.solde_paye ? parseFloat(contrat.prix_total || "0") : (contrat.acompte_paye ? parseFloat(contrat.acompte_recu || "0") : 0))).toFixed(2)}€
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex gap-1 justify-center scale-90 opacity-60">
                                                            <div>{(contrat.contrat_signe || contrat.data?.contrat_signe) ? <CheckCircleIcon className="size-3.5 text-emerald-500" /> : <Circle className="size-3.5 text-slate-200" />}</div>
                                                            <div>{contrat.acompte_paye ? <CheckCircleIcon className="size-3.5 text-emerald-500" /> : <Circle className="size-3.5 text-slate-200" />}</div>
                                                            <div>{contrat.solde_paye ? <CheckCircleIcon className="size-3.5 text-emerald-500" /> : <Circle className="size-3.5 text-slate-200" />}</div>
                                                            {contrat.data?.selected_options?.some((opt: any) => opt.name.toLowerCase().includes("template")) && (
                                                                <div>{contrat.design_valide ? <Palette className="size-3.5 text-emerald-500" /> : <Palette className="size-3.5 text-slate-200" />}</div>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Button size="icon" variant="ghost" className="size-7 text-slate-300 hover:text-red-600 hover:bg-red-50 transition-colors" onClick={(e) => { e.stopPropagation(); handleDeleteClick("contrat", contrat) }} title="Supprimer">
                                                            <TrashIcon className="size-3" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div >
        </div >
    )
}
