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
import { PlusIcon, FileTextIcon, ScrollTextIcon, PencilIcon, TrashIcon, CheckCircleIcon, Circle, ArrowUpDown, ChevronDown, ChevronUp, Archive, Search, CalendarIcon, X, Filter } from "lucide-react"
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
import { format, isWithinInterval, startOfYear, endOfYear, startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay, isAfter } from "date-fns"
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
    const [validatingDevisId, setValidatingDevisId] = useState<string | null>(null)

    // Collapsible State
    const [showActiveDevis, setShowActiveDevis] = useState(true)
    const [showActiveContrats, setShowActiveContrats] = useState(true)
    const [showArchivedContrats, setShowArchivedContrats] = useState(false)
    const [devisList, setDevisList] = useState<Devis[]>([])
    const [contratsList, setContratsList] = useState<Contrat[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [statusSettings, setStatusSettings] = useState<any>(null)
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'date_debut', direction: 'asc' })

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

    const handleSort = (key: string) => {
        setSortConfig(current => {
            if (current?.key === key) {
                return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
            }
            return { key, direction: 'asc' }
        })
    }

    const sortData = <T extends any>(data: T[]) => {
        if (!sortConfig) return data

        return [...data].sort((a, b) => {
            const itemA = a as any
            const itemB = b as any

            let aValue: any = itemA[sortConfig.key]
            let bValue: any = itemB[sortConfig.key]

            if (sortConfig.key === 'prix_total') {
                aValue = parseFloat(itemA.prix_total || "0")
                bValue = parseFloat(itemB.prix_total || "0")
            } else if (sortConfig.key === 'encaisse') {
                aValue = itemA.solde_paye ? parseFloat(itemA.prix_total || "0") : (itemA.acompte_paye ? parseFloat(itemA.acompte_recu || "0") : 0)
                bValue = itemB.solde_paye ? parseFloat(itemB.prix_total || "0") : (itemB.acompte_paye ? parseFloat(itemB.acompte_recu || "0") : 0)
            } else if (sortConfig.key === 'reste') {
                const aTotal = parseFloat(itemA.prix_total || "0")
                const aEncaisse = itemA.solde_paye ? aTotal : (itemA.acompte_paye ? parseFloat(itemA.acompte_recu || "0") : 0)
                aValue = aTotal - aEncaisse

                const bTotal = parseFloat(itemB.prix_total || "0")
                const bEncaisse = itemB.solde_paye ? bTotal : (itemB.acompte_paye ? parseFloat(itemB.acompte_recu || "0") : 0)
                bValue = bTotal - bEncaisse
            }

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
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

    const filteredSortedDevis = useMemo(() => applyFilters(sortData(devisList)), [devisList, sortConfig, searchQuery, dateFilter, statusFilter, customDateRange])
    const filteredSortedContrats = useMemo(() => applyFilters(sortData(contratsList)), [contratsList, sortConfig, searchQuery, dateFilter, statusFilter, customDateRange])

    const isArchived = (item: any) => {
        if (!item.date_debut) return false
        const date = new Date(item.date_debut)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        return date < today && !!item.solde_paye
    }

    const getEquipmentName = (id: string, preference?: string) => {
        const preferences = ['bois', 'blanc', 'noir', 'import']
        if (!id || id === 'none' || preferences.includes(id)) {
            return <span className="text-muted-foreground italic text-xs">-</span>
        }
        const machine = statusSettings?.materiels?.find((m: any) => m.id === id)
        return machine ? <Badge variant="outline" className="text-[10px] font-normal">{machine.nom}</Badge> : <span className="text-muted-foreground italic text-xs">Inconnu</span>
    }

    const activeContrats = filteredSortedContrats.filter(c => !isArchived(c))
    const archivedContrats = filteredSortedContrats.filter(c => isArchived(c))

    useEffect(() => {
        fetchData()
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
        setIsDialogOpen(true)
    }

    const openEditForm = (mode: "devis" | "contrat", item: Devis | Contrat) => {
        setFormMode(mode)
        setEditingItem(item)
        setIsDialogOpen(true)
    }

    const handleDelete = async (mode: "devis" | "contrat", id: string) => {
        if (!confirm("Supprimer définitivement ?")) return
        const { error } = await supabase.from(mode === "devis" ? "devis" : "contrats").delete().eq('id', id)
        if (!error) {
            if (mode === "devis") setDevisList(prev => prev.filter(item => item.id !== id))
            else setContratsList(prev => prev.filter(item => item.id !== id))
        }
    }

    const handleFormSuccess = async (savedRecord: any) => {
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
        setIsDialogOpen(false)
    }

    const handleToggleChecklist = async (item: any, field: string, table: "devis" | "contrats") => {
        const newValue = !item[field]
        const updateState = (prev: any[]) => prev.map(d => d.id === item.id ? { ...d, [field]: newValue, data: { ...d.data, [field]: newValue } } : d)
        if (table === "devis") setDevisList(updateState)
        else setContratsList(updateState)

        const { error } = await supabase.from(table).update({ data: { ...item.data, [field]: newValue } }).eq('id', item.id)
        if (error) alert("Erreur lors de la mise à jour")
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
                    etat: "Validé"
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

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col md:flex-row gap-4 items-end md:items-center">
                <div className="flex-1 w-full">
                    <Label className="text-xs text-muted-foreground mb-1 block">Recherche</Label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                            placeholder="Client, référence..."
                            className="pl-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <X className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground cursor-pointer hover:text-black" onClick={() => setSearchQuery("")} />
                        )}
                    </div>
                </div>

                <div className="w-full md:w-48">
                    <Label className="text-xs text-muted-foreground mb-1 block">Période</Label>
                    <Select value={dateFilter === "custom" ? "custom" : dateFilter} onValueChange={handleDateFilterChange}>
                        <SelectTrigger className="w-full">
                            <CalendarIcon className="size-4 mr-2 text-muted-foreground" />
                            <SelectValue placeholder="Période" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tout</SelectItem>
                            <SelectItem value="this_year">Cette année</SelectItem>
                            <SelectItem value="this_month">Ce mois-ci</SelectItem>
                            <SelectItem value="last_month">Le mois dernier</SelectItem>
                            <SelectItem value="last_3_months">3 derniers mois</SelectItem>
                            <SelectItem value="last_6_months">6 derniers mois</SelectItem>
                            <SelectItem value="custom">Personnalisée...</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="w-full md:w-48">
                    <Label className="text-xs text-muted-foreground mb-1 block">Statut</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full">
                            <Filter className="size-4 mr-2 text-muted-foreground" />
                            <SelectValue placeholder="Statut" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tous les statuts</SelectItem>
                            {availableStatuses.map(s => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <Button variant="ghost" size="icon" className="mb-0.5" title="Réinitialiser les filtres" onClick={() => { setSearchQuery(""); setDateFilter("all"); setStatusFilter("all"); }}>
                    <X className="size-4" />
                </Button>
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
                <DialogContent className="sm:max-w-[900px] w-full max-h-[90vh] overflow-y-auto">
                    <DialogHeader className="mb-6">
                        <DialogTitle className="flex items-center gap-2 text-2xl">
                            {formMode === "devis" ? <FileTextIcon className="size-6 text-primary" /> : <ScrollTextIcon className="size-6 text-primary" />}
                            {editingItem ? `Modifier ${formMode === "devis" ? "le Devis" : "le Contrat"}` : `Nouveau ${formMode === "devis" ? "Devis" : "Contrat"}`}
                        </DialogTitle>
                    </DialogHeader>
                    <DevisContratForm key={editingItem?.id || `${formMode}-${isDialogOpen}`} mode={formMode} initialData={editingItem} onSuccess={handleFormSuccess} />
                </DialogContent>
            </Dialog>

            <Dialog open={isCustomDateDialogOpen} onOpenChange={setIsCustomDateDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
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
                                <div className="rounded-md border bg-white shadow-sm overflow-hidden mb-8">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-slate-50/50">
                                                <TableHead className="w-[100px] cursor-pointer hover:bg-slate-100" onClick={() => handleSort('id')}>N°</TableHead>
                                                <TableHead className="w-[100px] cursor-pointer hover:bg-slate-100" onClick={() => handleSort('date_debut')}>DATE</TableHead>
                                                <TableHead className="min-w-[150px] cursor-pointer hover:bg-slate-100" onClick={() => handleSort('nom_client')}>CLIENT</TableHead>
                                                <TableHead className="min-w-[120px]">MATÉRIEL</TableHead>
                                                <TableHead className="w-[100px] cursor-pointer hover:bg-slate-100" onClick={() => handleSort('prix_total')}>TOTAL</TableHead>
                                                <TableHead className="w-[120px] text-right">ACTIONS</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {isLoading ? (
                                                <TableRow><TableCell colSpan={6} className="text-center h-24 text-muted-foreground animate-pulse">Chargement...</TableCell></TableRow>
                                            ) : filteredSortedDevis.length === 0 ? (
                                                <TableRow><TableCell colSpan={6} className="text-center h-24 text-muted-foreground">Aucun devis trouvé.</TableCell></TableRow>
                                            ) : filteredSortedDevis.map((devis) => (
                                                <TableRow key={devis.id} className="hover:bg-slate-50/50">
                                                    <TableCell className="font-mono text-[10px]">{getDisplayReference(devis, "devis")}</TableCell>
                                                    <TableCell className="text-xs">{devis.date_debut ? format(new Date(devis.date_debut), 'dd/MM/yy') : "-"}</TableCell>
                                                    <TableCell>
                                                        <div className="font-medium text-sm">{devis.nom_client}</div>
                                                        <div className="text-[10px] text-muted-foreground truncate max-w-[150px]">{devis.nom_evenement || devis.lieu}</div>
                                                    </TableCell>
                                                    <TableCell>{getEquipmentName(devis.data?.equipment_id)}</TableCell>
                                                    <TableCell className="text-sm font-semibold">{parseFloat(devis.prix_total || "0").toFixed(2)}€</TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-1 items-center">
                                                            <Button size="icon" variant="ghost" className="size-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50" onClick={() => openEditForm("devis", devis)} title="Modifier">
                                                                <PencilIcon className="size-3.5" />
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
                                                            <div className="w-px h-4 bg-slate-200 mx-0.5" />
                                                            <Button size="icon" variant="ghost" className="size-8 text-slate-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete("devis", devis.id)} title="Supprimer">
                                                                <TrashIcon className="size-3.5" />
                                                            </Button>
                                                        </div>
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
                            <div className="rounded-md border bg-white shadow-sm overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-50/50">
                                            <TableHead className="w-[100px] cursor-pointer hover:bg-slate-100" onClick={() => handleSort('id')}>N°</TableHead>
                                            <TableHead className="w-[100px] cursor-pointer hover:bg-slate-100" onClick={() => handleSort('date_debut')}>DATE</TableHead>
                                            <TableHead className="min-w-[150px] cursor-pointer hover:bg-slate-100" onClick={() => handleSort('nom_client')}>CLIENT</TableHead>
                                            <TableHead className="min-w-[120px]">MATÉRIEL</TableHead>
                                            <TableHead className="w-[100px] cursor-pointer hover:bg-slate-100" onClick={() => handleSort('prix_total')}>TOTAL</TableHead>
                                            <TableHead className="w-[100px] cursor-pointer hover:bg-slate-100" onClick={() => handleSort('encaisse')}>ENCAISSÉ</TableHead>
                                            <TableHead className="w-[100px] cursor-pointer hover:bg-slate-100 text-center">SUIVI</TableHead>
                                            <TableHead className="w-[100px] text-right">ACTIONS</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoading ? (
                                            <TableRow><TableCell colSpan={8} className="text-center h-24 text-muted-foreground animate-pulse">Chargement...</TableCell></TableRow>
                                        ) : activeContrats.length === 0 ? (
                                            <TableRow><TableCell colSpan={8} className="text-center h-24 text-muted-foreground">Aucun contrat trouvé.</TableCell></TableRow>
                                        ) : activeContrats.map((contrat) => (
                                            <TableRow key={contrat.id} className="hover:bg-slate-50/50">
                                                <TableCell className="font-mono text-[10px]">{getDisplayReference(contrat, "contrat")}</TableCell>
                                                <TableCell className="text-xs">{contrat.date_debut ? format(new Date(contrat.date_debut), 'dd/MM/yy') : "-"}</TableCell>
                                                <TableCell>
                                                    <div className="font-medium text-sm">{contrat.nom_client}</div>
                                                    <div className="text-[10px] text-muted-foreground truncate max-w-[150px]">{contrat.nom_evenement || contrat.lieu}</div>
                                                </TableCell>
                                                <TableCell>{getEquipmentName(contrat.data?.equipment_id)}</TableCell>
                                                <TableCell className="text-sm font-semibold">{parseFloat(contrat.prix_total || "0").toFixed(2)}€</TableCell>
                                                <TableCell className="text-xs text-emerald-600 font-medium">
                                                    {contrat.solde_paye ? parseFloat(contrat.prix_total || "0").toFixed(2) : (contrat.acompte_paye ? parseFloat(contrat.acompte_recu || "0") : 0).toFixed(2)}€
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex gap-1 justify-center">
                                                        <div title="Contrat Signé" className="cursor-pointer" onClick={() => handleToggleChecklist(contrat, 'contrat_signe', 'contrats')}>
                                                            {contrat.contrat_signe ? <CheckCircleIcon className="size-4 text-emerald-500" /> : <Circle className="size-4 text-slate-200" />}
                                                        </div>
                                                        <div title="Acompte Reçu" className="cursor-pointer" onClick={() => handleToggleChecklist(contrat, 'acompte_paye', 'contrats')}>
                                                            {contrat.acompte_paye ? <CheckCircleIcon className="size-4 text-emerald-500" /> : <Circle className="size-4 text-slate-200" />}
                                                        </div>
                                                        <div title="Solde Reçu" className="cursor-pointer" onClick={() => handleToggleChecklist(contrat, 'solde_paye', 'contrats')}>
                                                            {contrat.solde_paye ? <CheckCircleIcon className="size-4 text-emerald-500" /> : <Circle className="size-4 text-slate-200" />}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <Button size="icon" variant="ghost" className="size-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50" onClick={() => openEditForm("contrat", contrat)} title="Modifier">
                                                            <PencilIcon className="size-3.5" />
                                                        </Button>
                                                        <Button size="icon" variant="ghost" className="size-8 text-slate-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete("contrat", contrat.id)} title="Supprimer">
                                                            <TrashIcon className="size-3.5" />
                                                        </Button>
                                                    </div>
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
                                <div className="rounded-md border bg-slate-50/30 overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-slate-50/50">
                                                <TableHead className="w-[100px] cursor-pointer hover:bg-slate-100" onClick={() => handleSort('id')}>N°</TableHead>
                                                <TableHead className="w-[100px] cursor-pointer hover:bg-slate-100" onClick={() => handleSort('date_debut')}>DATE</TableHead>
                                                <TableHead className="min-w-[150px] cursor-pointer hover:bg-slate-100" onClick={() => handleSort('nom_client')}>CLIENT</TableHead>
                                                <TableHead className="min-w-[120px]">MATÉRIEL</TableHead>
                                                <TableHead className="w-[100px] cursor-pointer hover:bg-slate-100" onClick={() => handleSort('prix_total')}>TOTAL</TableHead>
                                                <TableHead className="w-[100px] cursor-pointer hover:bg-slate-100" onClick={() => handleSort('encaisse')}>ENCAISSÉ</TableHead>
                                                <TableHead className="w-[100px] cursor-pointer hover:bg-slate-100 text-center">SUIVI</TableHead>
                                                <TableHead className="w-[100px] text-right">ACTIONS</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {isLoading ? (
                                                <TableRow><TableCell colSpan={8} className="text-center h-24 text-muted-foreground animate-pulse">Chargement...</TableCell></TableRow>
                                            ) : archivedContrats.length === 0 ? (
                                                <TableRow><TableCell colSpan={8} className="text-center h-24 text-muted-foreground">Aucune archive trouvée.</TableCell></TableRow>
                                            ) : archivedContrats.map((contrat) => (
                                                <TableRow key={contrat.id} className="opacity-70 h-10 hover:opacity-100 transition-opacity">
                                                    <TableCell className="font-mono text-[10px]">{getDisplayReference(contrat, "contrat")}</TableCell>
                                                    <TableCell className="text-xs">{contrat.date_debut ? format(new Date(contrat.date_debut), 'dd/MM/yy') : "-"}</TableCell>
                                                    <TableCell>
                                                        <div className="font-medium text-sm">{contrat.nom_client}</div>
                                                        <div className="text-[10px] text-muted-foreground truncate max-w-[150px]">{contrat.nom_evenement || contrat.lieu}</div>
                                                    </TableCell>
                                                    <TableCell className="text-xs">{getEquipmentName(contrat.data?.equipment_id)}</TableCell>
                                                    <TableCell className="text-xs font-semibold">{parseFloat(contrat.prix_total || "0").toFixed(2)}€</TableCell>
                                                    <TableCell className="text-[10px] text-emerald-600/70 font-medium">
                                                        {contrat.solde_paye ? parseFloat(contrat.prix_total || "0").toFixed(2) : (contrat.acompte_paye ? parseFloat(contrat.acompte_recu || "0") : 0).toFixed(2)}€
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex gap-1 justify-center scale-90 opacity-60">
                                                            <div>{contrat.contrat_signe ? <CheckCircleIcon className="size-3.5 text-emerald-500" /> : <Circle className="size-3.5 text-slate-200" />}</div>
                                                            <div>{contrat.acompte_paye ? <CheckCircleIcon className="size-3.5 text-emerald-500" /> : <Circle className="size-3.5 text-slate-200" />}</div>
                                                            <div>{contrat.solde_paye ? <CheckCircleIcon className="size-3.5 text-emerald-500" /> : <Circle className="size-3.5 text-slate-200" />}</div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-1">
                                                            <Button size="icon" variant="ghost" className="size-7 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50" onClick={() => openEditForm("contrat", contrat)} title="Modifier">
                                                                <PencilIcon className="size-3" />
                                                            </Button>
                                                            <Button size="icon" variant="ghost" className="size-7 text-slate-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete("contrat", contrat.id)} title="Supprimer">
                                                                <TrashIcon className="size-3" />
                                                            </Button>
                                                        </div>
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
            </div>
        </div>
    )
}
