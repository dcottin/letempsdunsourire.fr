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
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PlusIcon, FileTextIcon, ScrollTextIcon, PencilIcon, TrashIcon, CheckCircleIcon, Circle, ArrowUpDown, ChevronDown, ChevronUp } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { DevisContratForm } from "@/components/devis-contrat-form"
import { supabase } from "@/lib/supabase"
import { format } from "date-fns"



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
    // Add other fields as optional to ensure type safety while keeping flexibility
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

    // Collapsible State
    const [showActiveDevis, setShowActiveDevis] = useState(true)
    const [showArchivedDevis, setShowArchivedDevis] = useState(false)
    const [showActiveContrats, setShowActiveContrats] = useState(true)
    const [showArchivedContrats, setShowArchivedContrats] = useState(false)
    const [devisList, setDevisList] = useState<Devis[]>([])
    const [contratsList, setContratsList] = useState<Contrat[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [statusSettings, setStatusSettings] = useState<any>(null)
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'date_debut', direction: 'asc' })

    // Sort helper
    const handleSort = (key: string) => {
        setSortConfig(current => {
            if (current?.key === key) {
                return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
            }
            return { key, direction: 'asc' }
        })
    }

    // Sort Logic

    const sortData = <T extends any>(data: T[]) => {
        if (!sortConfig) return data

        return [...data].sort((a, b) => {
            const itemA = a as any
            const itemB = b as any

            let aValue: any = itemA[sortConfig.key]
            let bValue: any = itemB[sortConfig.key]

            // Handling Calculated Fields (Special Keys)
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

    const sortedDevis = useMemo(() => sortData(devisList), [devisList, sortConfig])
    const sortedContrats = useMemo(() => sortData(contratsList), [contratsList, sortConfig])

    // Archive Logic
    const isArchived = (item: any) => {
        if (!item.date_debut) return false
        const date = new Date(item.date_debut)
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const isPast = date < today
        const isPaid = !!item.solde_paye

        return isPast && isPaid
    }

    // Resolve Equipment Name Helper
    const getEquipmentName = (id: string, preference?: string) => {
        const preferences: Record<string, string> = {
            'bois': 'Modèle en bois',
            'blanc': 'Modèle blanc',
            'noir': 'Modèle noir',
            'import': 'Sans importance'
        }

        const prefLabel = preferences[preference || ''] || preferences[id]
        const badgePreference = prefLabel ? (
            <Badge variant="secondary" className="text-[10px] font-bold bg-amber-50 text-amber-700 border-amber-200">
                {prefLabel}
            </Badge>
        ) : null

        if (!id || id === 'none' || preferences[id]) {
            return badgePreference || <span className="text-muted-foreground italic text-xs">-</span>
        }

        const machine = statusSettings?.materiels?.find((m: any) => m.id === id)
        const machineBadge = machine ? (
            <Badge variant="outline" className="text-[10px] font-normal">
                {machine.nom}
            </Badge>
        ) : <span className="text-muted-foreground italic text-xs">Inconnu</span>

        return (
            <div className="flex flex-col gap-1 items-start">
                {machineBadge}
                {badgePreference}
            </div>
        )
    }

    const activeDevis = sortedDevis.filter(d => !isArchived(d))
    const archivedDevis = sortedDevis.filter(d => isArchived(d))

    const activeContrats = sortedContrats.filter(c => !isArchived(c))
    const archivedContrats = sortedContrats.filter(c => isArchived(c))

    // Load data from Supabase on mount
    useEffect(() => {
        fetchData()
    }, [])

    async function fetchData() {
        setIsLoading(true)
        try {
            // Fetch Settings for equipment names
            const { data: settingsData } = await supabase
                .from('settings')
                .select('*')
                .single()

            if (settingsData && settingsData.data) {
                setStatusSettings(settingsData.data)
            }

            // Fetch Devis
            const { data: devisData, error: devisError } = await supabase
                .from('devis')
                .select('*')
                .order('created_at', { ascending: false })

            if (devisError) throw devisError

            // Reconstruct full objects from 'data' JSONB if present
            const mappedDevis = (devisData || []).map(item => ({
                ...item,
                ...item.data
            }))
            setDevisList(mappedDevis)

            // Fetch Contrats
            const { data: contratsData, error: contratsError } = await supabase
                .from('contrats')
                .select('*')
                .order('created_at', { ascending: false })

            if (contratsError) throw contratsError

            const mappedContrats = (contratsData || []).map(item => ({
                ...item,
                ...item.data
            }))
            setContratsList(mappedContrats)
        } catch (e) {
            console.error("Failed to fetch data from Supabase", e)
            alert("Erreur de connexion à la base de données.")
        } finally {
            setIsLoading(false)
        }
    }



    const generateReference = (data: any, suffix?: string) => {
        const datePart = data.date_debut ? format(new Date(data.date_debut), "ddMMyy") : "000000"
        const initials = data.nom_client
            ? data.nom_client.split(' ').map((n: string) => n[0]).join('').toUpperCase()
            : "XX"
        return `2026-${datePart}-${initials}${suffix || ""}`
    }

    const getDisplayReference = (item: any, type: "devis" | "contrat") => {
        // If the ID itself is clean (starts with 2026), use it
        if (item.id && item.id.startsWith("2026")) return item.id

        // If there is a saved reference that is clean, use it
        if (item.reference && item.reference.startsWith("2026")) return item.reference

        // As a last fallback, generate a clean one on the fly
        const suffix = type === "contrat" ? "-C" : ""
        return generateReference(item, suffix)
    }



    const openCreateForm = (mode: "devis" | "contrat") => {
        setFormMode(mode)
        setEditingItem(null)
        setIsDialogOpen(true)
    }

    const openEditForm = (mode: "devis" | "contrat", item: Devis | Contrat) => {
        setFormMode(mode)
        setEditingItem(item)
        // Ensure we pass all item fields + defaults for the form
        setIsDialogOpen(true)
    }

    const handleDelete = async (mode: "devis" | "contrat", id: string) => {
        const table = mode === "devis" ? "devis" : "contrats"
        const { error } = await supabase.from(table).delete().eq('id', id)

        if (error) {
            console.error("Delete error", error)
            alert("Erreur lors de la suppression.")
            return
        }

        if (mode === "devis") {
            setDevisList(prev => prev.filter(item => item.id !== id))
        } else {
            setContratsList(prev => prev.filter(item => item.id !== id))
        }
    }

    const handleValidateDevis = async (devis: Devis) => {
        if (!confirm("Voulez-vous valider ce devis et le transformer en contrat ?")) return

        try {
            // 1. Prepare contract data
            let newId
            if (devis.id && devis.id.startsWith("D-")) {
                // Determine new ID by replacing prefix
                newId = devis.id.replace("D-", "C-")
            } else {
                // Logic for old IDs or UUIDs: regenerate strictly
                newId = generateReference(devis, 'contrat')
            }
            // Fallback safety (should not happen if generateReference works)
            if (!newId.startsWith("C-")) newId = `C-${newId}`

            const contractData = {
                id: newId,
                nom_client: devis.nom_client,
                etat: "Validé", // Auto-update status
                prix_total: devis.prix_total,
                date_debut: devis.date_debut,
                date_fin: devis.date_fin || undefined,
                type: devis.data?.type || "Standard",
                data: {
                    ...devis.data,
                    reference: newId, // Update reference in data too
                    etat: "Validé"
                }
            }

            // 2. Insert into contrats table
            const { error: insertError } = await supabase
                .from('contrats')
                .insert([contractData])

            if (insertError) throw insertError

            // 3. Delete from devis table
            const { error: deleteError } = await supabase
                .from('devis')
                .delete()
                .eq('id', devis.id)

            if (deleteError) {
                console.error("Failed to delete devis after conversion, manual cleanup might be needed", deleteError)
            }

            // 4. Update UI with flattened object for consistency
            const uiContractData = {
                ...contractData,
                ...contractData.data
            }

            setDevisList(prev => prev.filter(item => item.id !== devis.id))
            setContratsList(prev => [uiContractData, ...prev])

            alert("Devis validé et transformé en contrat avec succès !")
        } catch (e: any) {
            console.error("Conversion error:", e)
            alert(`Erreur lors de la validation : ${e.message}`)
        }
    }

    const handleToggleChecklist = async (item: any, field: string, table: "devis" | "contrats") => {
        const newValue = !item[field]

        // Optimistic Update: Update BOTH top-level field AND the data object
        // This ensures subsequent clicks have the fresh data object to work with
        const updateList = (prev: any[]) => prev.map(d => {
            if (d.id === item.id) {
                return {
                    ...d,
                    [field]: newValue,
                    data: { ...d.data, [field]: newValue }
                }
            }
            return d
        })

        if (table === "devis") {
            setDevisList(prev => updateList(prev))
        } else {
            setContratsList(prev => updateList(prev))
        }

        // Supabase Update
        // Use the FRESHLY calculated data object (we can recreate it here or trust state, but safe to recreate from item.data + change)
        const currentData = item.data || {}
        const newData = { ...currentData, [field]: newValue }

        const { error } = await supabase
            .from(table)
            .update({ data: newData })
            .eq('id', item.id)

        if (error) {
            console.error("Failed to toggle status", error)
            // Revert
            const revertList = (prev: any[]) => prev.map(d => {
                if (d.id === item.id) {
                    return {
                        ...d,
                        [field]: !newValue,
                        data: { ...d.data, [field]: !newValue } // Revert data too
                    }
                }
                return d
            })

            if (table === "devis") {
                setDevisList(prev => revertList(prev))
            } else {
                setContratsList(prev => revertList(prev))
            }
            alert("Erreur lors de la mise à jour")
        }
    }

    const handleFormSuccess = async (savedRecord: any) => {
        // The form now handles the Supabase save (Create or Update).
        // It returns the full DB record (savedRecord).
        // We just need to update our local state to reflect the changes without reloading.

        const mappedItem = {
            ...savedRecord,
            ...savedRecord.data
        }

        if (editingItem) {
            // Update existing in list
            if (formMode === "devis") {
                setDevisList(prev => prev.map(item => item.id === mappedItem.id ? mappedItem : item))
            } else {
                setContratsList(prev => prev.map(item => item.id === mappedItem.id ? mappedItem : item))
            }
        } else {
            // Add new to list
            if (formMode === "devis") {
                setDevisList(prev => [mappedItem, ...prev])
            } else {
                setContratsList(prev => [mappedItem, ...prev])
            }
        }
        setIsDialogOpen(false)
    }

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
            <div className="flex items-center justify-between">
                <h1 className="text-lg font-semibold md:text-2xl">Devis & Contrats</h1>
                <div className="flex items-center gap-2">
                    <Button onClick={() => openCreateForm("devis")} className="gap-2">
                        <PlusIcon className="size-4" />
                        Créer un devis
                    </Button>
                    <Button onClick={() => openCreateForm("contrat")} variant="outline" className="gap-2">
                        <PlusIcon className="size-4" />
                        Créer un contrat
                    </Button>
                </div>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[900px] w-full max-h-[90vh] overflow-y-auto">
                    <DialogHeader className="mb-6">
                        <DialogTitle className="flex items-center gap-2 text-2xl">
                            {formMode === "devis" ? <FileTextIcon className="size-6 text-primary" /> : <ScrollTextIcon className="size-6 text-primary" />}
                            {editingItem ? `Modifier ${formMode === "devis" ? "le Devis" : "le Contrat"}` : `Nouveau ${formMode === "devis" ? "Devis" : "Contrat"}`}
                        </DialogTitle>
                        <DialogDescription>
                            {editingItem ? "Modifiez les informations ci-dessous." : `Remplissez les informations ci-dessous pour créer un nouveau ${formMode}.`}
                        </DialogDescription>
                    </DialogHeader>
                    <DevisContratForm
                        key={editingItem?.id || `${formMode}-${isDialogOpen}`}
                        mode={formMode}
                        initialData={editingItem}
                        onSuccess={handleFormSuccess}
                    />
                </DialogContent>
            </Dialog>

            <Tabs defaultValue="devis" className="w-full">
                <TabsList>
                    <TabsTrigger value="devis">Mes Devis</TabsTrigger>
                    <TabsTrigger value="contrats">Mes Contrats</TabsTrigger>
                </TabsList>
                <TabsContent value="devis" className="mt-4">
                    <div className="space-y-8">
                        {/* ACTIVE DEVIS */}
                        <div>
                            <h3
                                className="text-lg font-bold mb-4 flex items-center gap-2 cursor-pointer select-none hover:text-indigo-600 transition-colors"
                                onClick={() => setShowActiveDevis(!showActiveDevis)}
                            >
                                {showActiveDevis ? <ChevronDown className="size-5" /> : <ChevronUp className="size-5 text-muted-foreground" />}
                                <Circle className="size-3 fill-indigo-500 text-indigo-500" /> Dossiers en cours
                            </h3>
                            {showActiveDevis && (
                                <div className="rounded-md border bg-white shadow-sm animate-in slide-in-from-top-2 duration-200">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => handleSort('id')}>
                                                    N° {sortConfig?.key === 'id' && <ArrowUpDown className="size-3 inline ml-1 opacity-50" />}
                                                </TableHead>
                                                <TableHead className="cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => handleSort('date_debut')}>
                                                    DATE {sortConfig?.key === 'date_debut' && <ArrowUpDown className="size-3 inline ml-1 opacity-50" />}
                                                </TableHead>
                                                <TableHead className="cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => handleSort('nom_client')}>
                                                    CLIENT {sortConfig?.key === 'nom_client' && <ArrowUpDown className="size-3 inline ml-1 opacity-50" />}
                                                </TableHead>
                                                <TableHead>MATÉRIEL</TableHead>
                                                <TableHead className="cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => handleSort('lieu')}>
                                                    LIEU {sortConfig?.key === 'lieu' && <ArrowUpDown className="size-3 inline ml-1 opacity-50" />}
                                                </TableHead>
                                                <TableHead className="cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => handleSort('prix_total')}>
                                                    TOTAL {sortConfig?.key === 'prix_total' && <ArrowUpDown className="size-3 inline ml-1 opacity-50" />}
                                                </TableHead>
                                                <TableHead className="cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => handleSort('encaisse')}>
                                                    ENCAISSÉ {sortConfig?.key === 'encaisse' && <ArrowUpDown className="size-3 inline ml-1 opacity-50" />}
                                                </TableHead>
                                                <TableHead className="cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => handleSort('reste')}>
                                                    RESTE {sortConfig?.key === 'reste' && <ArrowUpDown className="size-3 inline ml-1 opacity-50" />}
                                                </TableHead>
                                                <TableHead className="text-center">SUIVI</TableHead>
                                                <TableHead className="text-right">ACTIONS</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {isLoading ? (
                                                <TableRow>
                                                    <TableCell colSpan={10} className="text-center h-24 text-muted-foreground italic">
                                                        Chargement des données...
                                                    </TableCell>
                                                </TableRow>
                                            ) : activeDevis.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={10} className="text-center h-24 text-muted-foreground">
                                                        Aucun dossier en cours.
                                                    </TableCell>
                                                </TableRow>
                                            ) : activeDevis.map((devis) => (
                                                <TableRow key={devis.id}>
                                                    <TableCell className="font-medium text-xs">{devis.reference || generateReference(devis)}</TableCell>
                                                    <TableCell>{devis.date_debut}</TableCell>
                                                    <TableCell className="font-medium">{devis.nom_client}</TableCell>
                                                    <TableCell>{getEquipmentName(devis.data?.equipment_id, devis.data?.choix_client)}</TableCell>
                                                    <TableCell className="text-muted-foreground text-sm">{devis.lieu || "-"}</TableCell>
                                                    <TableCell>{parseFloat(devis.prix_total || "0").toFixed(2)}€</TableCell>
                                                    <TableCell>
                                                        {devis.solde_paye
                                                            ? parseFloat(devis.prix_total || "0").toFixed(2)
                                                            : (devis.acompte_paye ? parseFloat(devis.acompte_recu || "0") : 0).toFixed(2)
                                                        }€
                                                    </TableCell>
                                                    <TableCell className="font-bold text-primary">
                                                        {devis.solde_paye
                                                            ? "0.00"
                                                            : (parseFloat(devis.prix_total || "0") - (devis.acompte_paye ? parseFloat(devis.acompte_recu || "0") : 0)).toFixed(2)
                                                        }€
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex gap-1 justify-center items-center">
                                                            <div title="Contrat Signé" className="cursor-pointer hover:scale-110 transition-transform" onClick={(e) => { e.stopPropagation(); handleToggleChecklist(devis, 'contrat_signe', 'devis'); }}>
                                                                {devis.contrat_signe ? <CheckCircleIcon className="size-4 text-emerald-500 fill-emerald-50" /> : <Circle className="size-4 text-muted-foreground/50 hover:text-emerald-500" />}
                                                            </div>
                                                            <div title="Acompte Reçu" className="cursor-pointer hover:scale-110 transition-transform" onClick={(e) => { e.stopPropagation(); handleToggleChecklist(devis, 'acompte_paye', 'devis'); }}>
                                                                {devis.acompte_paye ? <CheckCircleIcon className="size-4 text-emerald-500 fill-emerald-50" /> : <Circle className="size-4 text-muted-foreground/50 hover:text-emerald-500" />}
                                                            </div>
                                                            <div title="Solde Reçu" className="cursor-pointer hover:scale-110 transition-transform" onClick={(e) => { e.stopPropagation(); handleToggleChecklist(devis, 'solde_paye', 'devis'); }}>
                                                                {devis.solde_paye ? <CheckCircleIcon className="size-4 text-emerald-500 fill-emerald-50" /> : <Circle className="size-4 text-muted-foreground/50 hover:text-emerald-500" />}
                                                            </div>
                                                            {devis.selected_options?.some((opt: any) => opt.name?.toLowerCase().includes("template")) && (
                                                                <div title="Design Validé" className="cursor-pointer hover:scale-110 transition-transform" onClick={(e) => { e.stopPropagation(); handleToggleChecklist(devis, 'design_valide', 'devis'); }}>
                                                                    {devis.design_valide ? <CheckCircleIcon className="size-4 text-purple-500 fill-purple-50" /> : <Circle className="size-4 text-purple-300 hover:text-purple-500" />}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right flex justify-end gap-2">
                                                        <Button size="icon" variant="ghost" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => handleValidateDevis(devis)} title="Valider le devis">
                                                            <CheckCircleIcon className="size-4" />
                                                        </Button>
                                                        <Button size="icon" variant="ghost" onClick={() => openEditForm("devis", devis)}>
                                                            <PencilIcon className="size-4 text-muted-foreground" />
                                                        </Button>
                                                        <Button size="icon" variant="ghost" onClick={() => handleDelete("devis", devis.id)}>
                                                            <TrashIcon className="size-4 text-destructive" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </div>

                        {/* ARCHIVED DEVIS */}
                        {archivedDevis.length > 0 && (
                            <div className="opacity-75 grayscale-[50%] hover:grayscale-0 transition-all duration-500">
                                <h3
                                    className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-500 cursor-pointer select-none hover:text-slate-700 transition-colors"
                                    onClick={() => setShowArchivedDevis(!showArchivedDevis)}
                                >
                                    {showArchivedDevis ? <ChevronDown className="size-5" /> : <ChevronUp className="size-5 text-muted-foreground" />}
                                    <Circle className="size-3 fill-slate-300 text-slate-300" /> Archives
                                </h3>
                                {showArchivedDevis && (
                                    <div className="rounded-md border bg-slate-50 animate-in slide-in-from-top-2 duration-200">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    {/* Simple headers for archive, no sort needed maybe? Or keep standard. Keeping standard for consistency */}
                                                    <TableHead>N°</TableHead>
                                                    <TableHead>DATE</TableHead>
                                                    <TableHead>CLIENT</TableHead>
                                                    <TableHead>LIEU</TableHead>
                                                    <TableHead>TOTAL</TableHead>
                                                    <TableHead>ENCAISSÉ</TableHead>
                                                    <TableHead>RESTE</TableHead>
                                                    <TableHead className="text-center">SUIVI</TableHead>
                                                    <TableHead className="text-right">ACTIONS</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {archivedDevis.map((devis) => (
                                                    <TableRow key={devis.id}>
                                                        <TableCell className="font-medium text-xs">{getDisplayReference(devis, "devis")}</TableCell>
                                                        <TableCell>{devis.date_debut}</TableCell>
                                                        <TableCell className="font-medium">{devis.nom_client}</TableCell>
                                                        <TableCell className="text-muted-foreground text-sm">{devis.lieu || "-"}</TableCell>
                                                        <TableCell>{parseFloat(devis.prix_total || "0").toFixed(2)}€</TableCell>
                                                        <TableCell>
                                                            {devis.solde_paye
                                                                ? parseFloat(devis.prix_total || "0").toFixed(2)
                                                                : (devis.acompte_paye ? parseFloat(devis.acompte_recu || "0") : 0).toFixed(2)
                                                            }€
                                                        </TableCell>
                                                        <TableCell className="font-bold text-slate-400">
                                                            {devis.solde_paye
                                                                ? "0.00"
                                                                : (parseFloat(devis.prix_total || "0") - (devis.acompte_paye ? parseFloat(devis.acompte_recu || "0") : 0)).toFixed(2)
                                                            }€
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex gap-1 justify-center items-center opacity-80">
                                                                <div title="Contrat Signé" className="cursor-pointer" onClick={(e) => { e.stopPropagation(); handleToggleChecklist(devis, 'contrat_signe', 'devis'); }}>
                                                                    {devis.contrat_signe ? <CheckCircleIcon className="size-4 text-emerald-500 fill-emerald-50" /> : <Circle className="size-4 text-muted-foreground/50" />}
                                                                </div>
                                                                <div title="Acompte Reçu" className="cursor-pointer" onClick={(e) => { e.stopPropagation(); handleToggleChecklist(devis, 'acompte_paye', 'devis'); }}>
                                                                    {devis.acompte_paye ? <CheckCircleIcon className="size-4 text-emerald-500 fill-emerald-50" /> : <Circle className="size-4 text-muted-foreground/50" />}
                                                                </div>
                                                                <div title="Solde Reçu" className="cursor-pointer" onClick={(e) => { e.stopPropagation(); handleToggleChecklist(devis, 'solde_paye', 'devis'); }}>
                                                                    {devis.solde_paye ? <CheckCircleIcon className="size-4 text-emerald-500 fill-emerald-50" /> : <Circle className="size-4 text-muted-foreground/50" />}
                                                                </div>
                                                                {devis.selected_options?.some((opt: any) => opt.name?.toLowerCase().includes("template")) && (
                                                                    <div title="Design Validé" className="cursor-pointer" onClick={(e) => { e.stopPropagation(); handleToggleChecklist(devis, 'design_valide', 'devis'); }}>
                                                                        {devis.design_valide ? <CheckCircleIcon className="size-4 text-purple-500 fill-purple-50" /> : <Circle className="size-4 text-purple-300" />}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right flex justify-end gap-2">
                                                            {/* No validation or edit on archived? Maybe just delete or edit */}
                                                            <Button size="icon" variant="ghost" onClick={() => openEditForm("devis", devis)}>
                                                                <PencilIcon className="size-4 text-muted-foreground" />
                                                            </Button>
                                                            <Button size="icon" variant="ghost" onClick={() => handleDelete("devis", devis.id)}>
                                                                <TrashIcon className="size-4 text-destructive" />
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
                </TabsContent>
                <TabsContent value="contrats" className="mt-4">
                    <div className="space-y-8">
                        {/* ACTIVE CONTRATS */}
                        <div>
                            <h3
                                className="text-lg font-bold mb-4 flex items-center gap-2 cursor-pointer select-none hover:text-indigo-600 transition-colors"
                                onClick={() => setShowActiveContrats(!showActiveContrats)}
                            >
                                {showActiveContrats ? <ChevronDown className="size-5" /> : <ChevronUp className="size-5 text-muted-foreground" />}
                                <ScrollTextIcon className="size-5 text-indigo-500" /> Contrats en cours
                            </h3>
                            {showActiveContrats && (
                                <div className="rounded-md border bg-white shadow-sm animate-in slide-in-from-top-2 duration-200">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => handleSort('id')}>
                                                    N° {sortConfig?.key === 'id' && <ArrowUpDown className="size-3 inline ml-1 opacity-50" />}
                                                </TableHead>
                                                <TableHead className="cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => handleSort('date_debut')}>
                                                    DATE {sortConfig?.key === 'date_debut' && <ArrowUpDown className="size-3 inline ml-1 opacity-50" />}
                                                </TableHead>
                                                <TableHead className="cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => handleSort('nom_client')}>
                                                    CLIENT {sortConfig?.key === 'nom_client' && <ArrowUpDown className="size-3 inline ml-1 opacity-50" />}
                                                </TableHead>
                                                <TableHead>MATÉRIEL</TableHead>
                                                <TableHead className="cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => handleSort('lieu')}>
                                                    LIEU {sortConfig?.key === 'lieu' && <ArrowUpDown className="size-3 inline ml-1 opacity-50" />}
                                                </TableHead>
                                                <TableHead className="cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => handleSort('prix_total')}>
                                                    TOTAL {sortConfig?.key === 'prix_total' && <ArrowUpDown className="size-3 inline ml-1 opacity-50" />}
                                                </TableHead>
                                                <TableHead className="cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => handleSort('encaisse')}>
                                                    ENCAISSÉ {sortConfig?.key === 'encaisse' && <ArrowUpDown className="size-3 inline ml-1 opacity-50" />}
                                                </TableHead>
                                                <TableHead className="cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => handleSort('reste')}>
                                                    RESTE {sortConfig?.key === 'reste' && <ArrowUpDown className="size-3 inline ml-1 opacity-50" />}
                                                </TableHead>
                                                <TableHead className="text-center">SUIVI</TableHead>
                                                <TableHead className="text-right">ACTIONS</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {isLoading ? (
                                                <TableRow>
                                                    <TableCell colSpan={10} className="text-center h-24 text-muted-foreground italic">
                                                        Chargement des données...
                                                    </TableCell>
                                                </TableRow>
                                            ) : activeContrats.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={10} className="text-center h-24 text-muted-foreground">
                                                        Aucun contrat en cours.
                                                    </TableCell>
                                                </TableRow>
                                            ) : activeContrats.map((contrat) => (
                                                <TableRow key={contrat.id}>
                                                    <TableCell className="font-medium text-xs text-indigo-600">{contrat.id.startsWith("2026") ? contrat.id : (contrat.reference || generateReference(contrat))}</TableCell>
                                                    <TableCell>{contrat.date_debut}</TableCell>
                                                    <TableCell className="font-medium">{contrat.nom_client}</TableCell>
                                                    <TableCell>{getEquipmentName(contrat.data?.equipment_id, contrat.data?.choix_client)}</TableCell>
                                                    <TableCell className="text-muted-foreground text-sm">{contrat.lieu || "-"}</TableCell>
                                                    <TableCell>{parseFloat(contrat.prix_total || "0").toFixed(2)}€</TableCell>
                                                    <TableCell>
                                                        {contrat.solde_paye
                                                            ? parseFloat(contrat.prix_total || "0").toFixed(2)
                                                            : (contrat.acompte_paye ? parseFloat(contrat.acompte_recu || "0") : 0).toFixed(2)
                                                        }€
                                                    </TableCell>
                                                    <TableCell className="font-bold text-primary">
                                                        {contrat.solde_paye
                                                            ? "0.00"
                                                            : (parseFloat(contrat.prix_total || "0") - (contrat.acompte_paye ? parseFloat(contrat.acompte_recu || "0") : 0)).toFixed(2)
                                                        }€
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex gap-1 justify-center items-center">
                                                            <div title="Contrat Signé" className="cursor-pointer hover:scale-110 transition-transform" onClick={(e) => { e.stopPropagation(); handleToggleChecklist(contrat, 'contrat_signe', 'contrats'); }}>
                                                                {contrat.contrat_signe ? <CheckCircleIcon className="size-4 text-emerald-500 fill-emerald-50" /> : <Circle className="size-4 text-muted-foreground/50 hover:text-emerald-500" />}
                                                            </div>
                                                            <div title="Acompte Reçu" className="cursor-pointer hover:scale-110 transition-transform" onClick={(e) => { e.stopPropagation(); handleToggleChecklist(contrat, 'acompte_paye', 'contrats'); }}>
                                                                {contrat.acompte_paye ? <CheckCircleIcon className="size-4 text-emerald-500 fill-emerald-50" /> : <Circle className="size-4 text-muted-foreground/50 hover:text-emerald-500" />}
                                                            </div>
                                                            <div title="Solde Reçu" className="cursor-pointer hover:scale-110 transition-transform" onClick={(e) => { e.stopPropagation(); handleToggleChecklist(contrat, 'solde_paye', 'contrats'); }}>
                                                                {contrat.solde_paye ? <CheckCircleIcon className="size-4 text-emerald-500 fill-emerald-50" /> : <Circle className="size-4 text-muted-foreground/50 hover:text-emerald-500" />}
                                                            </div>
                                                            {contrat.selected_options?.some((opt: any) => opt.name?.toLowerCase().includes("template")) && (
                                                                <div title="Design Validé" className="cursor-pointer hover:scale-110 transition-transform" onClick={(e) => { e.stopPropagation(); handleToggleChecklist(contrat, 'design_valide', 'contrats'); }}>
                                                                    {contrat.design_valide ? <CheckCircleIcon className="size-4 text-purple-500 fill-purple-50" /> : <Circle className="size-4 text-purple-300 hover:text-purple-500" />}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right flex justify-end gap-2">
                                                        <Button size="icon" variant="ghost" onClick={() => openEditForm("contrat", contrat)}>
                                                            <PencilIcon className="size-4 text-muted-foreground" />
                                                        </Button>
                                                        <Button size="icon" variant="ghost" onClick={() => handleDelete("contrat", contrat.id)}>
                                                            <TrashIcon className="size-4 text-destructive" />
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
                            <div className="opacity-75 grayscale-[50%] hover:grayscale-0 transition-all duration-500">
                                <h3
                                    className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-500 cursor-pointer select-none hover:text-slate-700 transition-colors"
                                    onClick={() => setShowArchivedContrats(!showArchivedContrats)}
                                >
                                    {showArchivedContrats ? <ChevronDown className="size-5" /> : <ChevronUp className="size-5 text-muted-foreground" />}
                                    <Circle className="size-3 fill-slate-300 text-slate-300" /> Archives
                                </h3>
                                {showArchivedContrats && (
                                    <div className="rounded-md border bg-slate-50 animate-in slide-in-from-top-2 duration-200">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>N°</TableHead>
                                                    <TableHead>DATE</TableHead>
                                                    <TableHead>CLIENT</TableHead>
                                                    <TableHead>MATÉRIEL</TableHead>
                                                    <TableHead>LIEU</TableHead>
                                                    <TableHead>TOTAL</TableHead>
                                                    <TableHead>ENCAISSÉ</TableHead>
                                                    <TableHead>RESTE</TableHead>
                                                    <TableHead className="text-center">SUIVI</TableHead>
                                                    <TableHead className="text-right">ACTIONS</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {archivedContrats.map((contrat) => (
                                                    <TableRow key={contrat.id}>
                                                        <TableCell className="font-medium text-xs">{contrat.id}</TableCell>
                                                        <TableCell>{contrat.date_debut}</TableCell>
                                                        <TableCell className="font-medium">{contrat.nom_client}</TableCell>
                                                        <TableCell>{getEquipmentName(contrat.data?.equipment_id, contrat.data?.choix_client)}</TableCell>
                                                        <TableCell className="text-muted-foreground text-sm">{contrat.lieu || "-"}</TableCell>
                                                        <TableCell>{parseFloat(contrat.prix_total || "0").toFixed(2)}€</TableCell>
                                                        <TableCell>
                                                            {contrat.solde_paye
                                                                ? parseFloat(contrat.prix_total || "0").toFixed(2)
                                                                : (contrat.acompte_paye ? parseFloat(contrat.acompte_recu || "0") : 0).toFixed(2)
                                                            }€
                                                        </TableCell>
                                                        <TableCell className="font-bold text-slate-400">
                                                            {contrat.solde_paye
                                                                ? "0.00"
                                                                : (parseFloat(contrat.prix_total || "0") - (contrat.acompte_paye ? parseFloat(contrat.acompte_recu || "0") : 0)).toFixed(2)
                                                            }€
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex gap-1 justify-center items-center opacity-80">
                                                                <div title="Contrat Signé" className="cursor-pointer" onClick={(e) => { e.stopPropagation(); handleToggleChecklist(contrat, 'contrat_signe', 'contrats'); }}>
                                                                    {contrat.contrat_signe ? <CheckCircleIcon className="size-4 text-emerald-500 fill-emerald-50" /> : <Circle className="size-4 text-muted-foreground/50" />}
                                                                </div>
                                                                <div title="Acompte Reçu" className="cursor-pointer" onClick={(e) => { e.stopPropagation(); handleToggleChecklist(contrat, 'acompte_paye', 'contrats'); }}>
                                                                    {contrat.acompte_paye ? <CheckCircleIcon className="size-4 text-emerald-500 fill-emerald-50" /> : <Circle className="size-4 text-muted-foreground/50" />}
                                                                </div>
                                                                <div title="Solde Reçu" className="cursor-pointer" onClick={(e) => { e.stopPropagation(); handleToggleChecklist(contrat, 'solde_paye', 'contrats'); }}>
                                                                    {contrat.solde_paye ? <CheckCircleIcon className="size-4 text-emerald-500 fill-emerald-50" /> : <Circle className="size-4 text-muted-foreground/50" />}
                                                                </div>
                                                                {contrat.selected_options?.some((opt: any) => opt.name?.toLowerCase().includes("template")) && (
                                                                    <div title="Design Validé" className="cursor-pointer" onClick={(e) => { e.stopPropagation(); handleToggleChecklist(contrat, 'design_valide', 'contrats'); }}>
                                                                        {contrat.design_valide ? <CheckCircleIcon className="size-4 text-purple-500 fill-purple-50" /> : <Circle className="size-4 text-purple-300" />}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right flex justify-end gap-2">
                                                            <Button size="icon" variant="ghost" onClick={() => openEditForm("contrat", contrat)}>
                                                                <PencilIcon className="size-4 text-muted-foreground" />
                                                            </Button>
                                                            <Button size="icon" variant="ghost" onClick={() => handleDelete("contrat", contrat.id)}>
                                                                <TrashIcon className="size-4 text-destructive" />
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
                </TabsContent>
            </Tabs>
        </div>
    )
}
