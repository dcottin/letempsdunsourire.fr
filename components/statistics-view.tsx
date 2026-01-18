"use client"

import { useState, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { CalendarIcon, TrendingDownIcon, TargetIcon, FolderOpenIcon } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { format, isWithinInterval, startOfYear, endOfYear, startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay, isAfter } from "date-fns"
import { fr } from "date-fns/locale"

type Devis = {
    id: string
    prix_total: string
    etat: string
    date_debut: string
    [key: string]: any
}

type Contrat = {
    id: string
    etat: string
    date_debut: string
    [key: string]: any
}

interface StatisticsViewProps {
    devis: Devis[]
    contrats: Contrat[]
}

type DateFilterType = 'this_year' | 'this_month' | 'last_month' | 'last_3_months' | 'last_6_months' | 'all' | 'custom'

export function StatisticsView({ devis, contrats }: StatisticsViewProps) {
    const [dateFilter, setDateFilter] = useState<DateFilterType>("this_year")
    const [isCustomDateDialogOpen, setIsCustomDateDialogOpen] = useState(false)
    const [customDateRange, setCustomDateRange] = useState<{ start: string, end: string }>({
        start: format(new Date(), "yyyy-MM-dd"),
        end: format(new Date(), "yyyy-MM-dd")
    })
    const [tempCustomRange, setTempCustomRange] = useState<{ start: string, end: string }>({
        start: format(new Date(), "yyyy-MM-dd"),
        end: format(new Date(), "yyyy-MM-dd")
    })

    // Helper to parse currency strings (e.g. "1 200 €", "400", "400.00")
    const parseCurrency = (value: string | undefined) => {
        if (!value) return 0
        const cleanScore = value.toString().replace(/[^0-9.-]+/g, "")
        const parsed = parseFloat(cleanScore)
        return isNaN(parsed) ? 0 : parsed
    }

    const handleFilterChange = (value: DateFilterType) => {
        if (value === 'custom') {
            setIsCustomDateDialogOpen(true)
        } else {
            setDateFilter(value)
        }
    }

    const applyCustomFilter = () => {
        setCustomDateRange(tempCustomRange)
        setDateFilter('custom')
        setIsCustomDateDialogOpen(false)
    }

    const activeLabel = useMemo(() => {
        switch (dateFilter) {
            case 'this_year': return `Cette année (${new Date().getFullYear()})`
            case 'this_month': return 'Ce mois-ci'
            case 'last_month': return 'Le mois dernier'
            case 'last_3_months': return '3 derniers mois'
            case 'last_6_months': return '6 derniers mois'
            case 'all': return "Tout l'historique"
            case 'custom':
                return `Du ${format(new Date(customDateRange.start), 'dd/MM/yyyy')} au ${format(new Date(customDateRange.end), 'dd/MM/yyyy')}`
            default: return 'Période'
        }
    }, [dateFilter, customDateRange])

    const filteredData = useMemo(() => {
        const now = new Date()
        const checkDate = (dateStr: string) => {
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
                case 'all':
                    return true
                case 'custom':
                    const start = startOfDay(new Date(customDateRange.start))
                    const end = endOfDay(new Date(customDateRange.end))
                    return isWithinInterval(date, { start, end })
                default:
                    return true
            }
        }

        return {
            devis: devis.filter(d => checkDate(d.date_debut)),
            contrats: contrats.filter(c => checkDate(c.date_debut))
        }
    }, [devis, contrats, dateFilter, customDateRange])


    // Filter Lists (from filtered data)
    const activeContratsList = filteredData.contrats.filter(c => c.etat !== "Annulé" && c.etat !== "Cancelled" && c.etat !== "Refusé")
    const cancelledContratsList = filteredData.contrats.filter(c => c.etat === "Annulé" || c.etat === "Cancelled" || c.etat === "Refusé")
    const cancelledDevisList = filteredData.devis.filter(d => d.etat === "Annulé" || d.etat === "Refusé")

    const activeContratsCount = activeContratsList.length

    // 1. Estimation CA (Sur devis en attente "Contact" ou "Demande Web")
    const leadStatuses = ["Contact", "Demande Web", "Relancé", "Lead"]
    const estimatedCA = filteredData.devis
        .filter(d => leadStatuses.includes(d.etat))
        .reduce((acc, curr) => acc + parseCurrency(curr.prix_total), 0)

    // 2. CA Encaissé (Logique basée sur les statuts de paiement)
    const encaisseTotal = activeContratsList.reduce((acc, curr) => {
        const total = parseCurrency(curr.prix_total)
        const acompte = parseCurrency(curr.acompte_recu)

        if (curr.solde_paye) return acc + total
        if (curr.acompte_paye) return acc + acompte
        return acc
    }, 0)

    // 3. Reste à Encaisser
    const resteAEncaisser = activeContratsList.reduce((acc, curr) => {
        const total = parseCurrency(curr.prix_total)
        const acompte = parseCurrency(curr.acompte_recu)

        if (curr.solde_paye) return acc // 0 reste
        if (curr.acompte_paye) return acc + (total - acompte)
        return acc + total // Tout reste à payer
    }, 0)

    // 4. Remises (Sur dossiers actifs - devis validés ou contrats)
    const remisesTotal = activeContratsList.reduce((acc, curr) => acc + parseCurrency(curr.remise), 0)

    // 5. Pertes & Annulations
    const manqueAGagner = [...cancelledContratsList, ...cancelledDevisList].reduce((acc, curr) => acc + parseCurrency(curr.prix_total), 0)
    const acomptesConserves = cancelledContratsList.reduce((acc, curr) => {
        return curr.acompte_paye ? acc + parseCurrency(curr.acompte_recu) : acc
    }, 0)

    return (
        <div className="flex flex-col gap-6 p-4 md:p-8 bg-[#f1f5f9]/50 min-h-screen rounded-xl">
            {/* Header Section */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-slate-800">Statistiques</h1>
                    <p className="text-slate-500 text-xs md:text-sm">Analyse : <span className="font-bold text-indigo-600">{activeLabel}</span></p>
                </div>

                <div className="bg-white/70 backdrop-blur-md border border-white/50 p-2 rounded-xl shadow-sm flex flex-col md:flex-row gap-2 items-stretch md:items-center w-full xl:w-auto">
                    <div className="relative w-full md:w-auto">
                        <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4 pointer-events-none" />
                        <Select value={dateFilter === 'custom' ? 'custom' : dateFilter} onValueChange={(val) => handleFilterChange(val as DateFilterType)}>
                            <SelectTrigger className="w-full md:w-[260px] pl-9 bg-transparent border-transparent hover:border-slate-200 focus:ring-0 shadow-none">
                                <SelectValue placeholder="Période" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="this_year">Cette année ({new Date().getFullYear()})</SelectItem>
                                <SelectItem value="this_month">Ce mois-ci</SelectItem>
                                <SelectItem value="last_month">Le mois dernier</SelectItem>
                                <SelectItem value="last_3_months">3 derniers mois</SelectItem>
                                <SelectItem value="last_6_months">6 derniers mois</SelectItem>
                                <SelectItem value="all">Tout l'historique</SelectItem>
                                <SelectItem value="custom">Période personnalisée...</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 md:gap-6">
                {/* Réservations */}
                <Card className="rounded-2xl shadow-sm border-slate-100 border-l-[4px] border-l-slate-500">
                    <CardContent className="p-4 md:p-6 flex flex-col justify-center h-full">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Réservations</div>
                        <div className="text-2xl md:text-3xl font-bold text-slate-800">{activeContratsCount}</div>
                        <div className="text-xs text-slate-500 font-medium mt-1">Dossiers actifs</div>
                    </CardContent>
                </Card>

                {/* Estimation CA */}
                <Card className="rounded-2xl shadow-sm border-slate-100 border-l-[4px] border-l-blue-500">
                    <CardContent className="p-4 md:p-6 flex flex-col justify-center h-full">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Estimation CA</div>
                        <div className="text-xl md:text-2xl font-bold text-slate-700">{estimatedCA.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</div>
                        <div className="text-xs text-slate-400 mt-1">Sur devis en attente</div>
                    </CardContent>
                </Card>

                {/* CA Encaissé */}
                <Card className="rounded-2xl shadow-sm border-slate-100 border-l-[4px] border-l-emerald-500 relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-16 h-16 bg-emerald-500/10 rounded-bl-full"></div>
                    <CardContent className="p-4 md:p-6 flex flex-col justify-center h-full relative z-10">
                        <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">CA Encaissé (Total)</div>
                        <div className="text-xl md:text-2xl font-bold text-emerald-600">{encaisseTotal.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</div>
                        <div className="text-xs text-emerald-500 mt-1">Flux trésorerie réel</div>
                    </CardContent>
                </Card>

                {/* Reste à Encaisser */}
                <Card className="rounded-2xl shadow-sm border-slate-100 border-l-[4px] border-l-amber-500">
                    <CardContent className="p-4 md:p-6 flex flex-col justify-center h-full">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Reste à Encaisser</div>
                        <div className="text-xl md:text-2xl font-bold text-amber-600">{resteAEncaisser.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</div>
                        <div className="text-xs text-amber-500 mt-1">À venir (Actifs)</div>
                    </CardContent>
                </Card>

                {/* Frais Livraison (Mocked for now as we don't have separate field) */}
                <Card className="rounded-2xl shadow-sm border-slate-100 border-l-[4px] border-l-violet-500">
                    <CardContent className="p-4 md:p-6 flex flex-col justify-center h-full">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Frais Livraison</div>
                        <div className="text-xl md:text-2xl font-bold text-violet-600">0,00 €</div>
                        <div className="text-xs text-violet-400 mt-1">Sur contrats actifs</div>
                    </CardContent>
                </Card>

                {/* Remises */}
                <Card className="rounded-2xl shadow-sm border-slate-100 border-l-[4px] border-l-pink-500">
                    <CardContent className="p-4 md:p-6 flex flex-col justify-center h-full">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Remises offertes</div>
                        <div className="text-xl md:text-2xl font-bold text-pink-600">{remisesTotal.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</div>
                        <div className="text-xs text-pink-400 mt-1">Geste commercial</div>
                    </CardContent>
                </Card>
            </div>

            {/* Bottom Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 pb-20 md:pb-0">
                {/* Pertes & Annulations */}
                <Card className="rounded-2xl shadow-sm border-slate-100">
                    <CardContent className="p-4 md:p-6">
                        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <TrendingDownIcon className="text-red-500 size-5" /> Pertes & Annulations
                        </h3>

                        <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-100 mb-4">
                            <div>
                                <p className="text-sm font-medium text-red-800">Manque à gagner total</p>
                                <p className="text-xs text-red-400">Valeur totale des contrats annulés</p>
                            </div>
                            <span className="text-lg md:text-xl font-bold text-red-600">{manqueAGagner.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>
                        </div>

                        <div className="flex items-center justify-between px-2">
                            <span className="text-sm text-slate-500">Dont montants conservés (acomptes)</span>
                            <span className="text-sm font-bold text-slate-700">{acomptesConserves.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Sources d'acquisition */}
                <Card className="rounded-2xl shadow-sm border-slate-100">
                    <CardContent className="p-4 md:p-6">
                        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <TargetIcon className="text-indigo-500 size-5" /> Sources d'acquisition
                        </h3>

                        <div className="space-y-4 overflow-y-auto max-h-64 pr-2">
                            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                                <FolderOpenIcon className="size-8 mb-2 opacity-50" />
                                <p className="text-sm italic">Aucune donnée pour cette période.</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={isCustomDateDialogOpen} onOpenChange={setIsCustomDateDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Période personnalisée</DialogTitle>
                        <DialogDescription>
                            Sélectionnez une plage de dates pour l'analyse.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="start" className="text-right">
                                Début
                            </Label>
                            <Input
                                id="start"
                                type="date"
                                className="col-span-3"
                                value={tempCustomRange.start}
                                onChange={(e) => setTempCustomRange(prev => ({ ...prev, start: e.target.value }))}
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="end" className="text-right">
                                Fin
                            </Label>
                            <Input
                                id="end"
                                type="date"
                                className="col-span-3"
                                value={tempCustomRange.end}
                                onChange={(e) => setTempCustomRange(prev => ({ ...prev, end: e.target.value }))}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCustomDateDialogOpen(false)}>Annuler</Button>
                        <Button onClick={applyCustomFilter}>Appliquer</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
