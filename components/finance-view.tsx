"use client"

import { useState, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { CalendarIcon, TrendingUpIcon, AlertCircleIcon, WalletIcon, CreditCardIcon, BanknoteIcon, ArrowRightLeftIcon } from "lucide-react"
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { CheckCircleIcon, ClockIcon, XCircleIcon } from "lucide-react"

type Devis = {
    id: string
    prix_total: string
    etat: string
    date_debut: string
    [key: string]: any
}

type Contrat = {
    id: string
    nom_client: string
    etat: string
    date_debut: string
    acompte_recu: string
    acompte_paye: boolean
    acompte_methode?: string
    acompte_date?: string
    solde_paye: boolean
    solde_methode?: string
    solde_date?: string
    prix_total: string
    remise: string
    frais_livraison: string
    [key: string]: any
}

interface FinanceViewProps {
    devis: Devis[]
    contrats: Contrat[]
}

type DateFilterType = 'this_year' | 'this_month' | 'last_month' | 'last_3_months' | 'last_6_months' | 'all' | 'custom'

export function FinanceView({ devis, contrats }: FinanceViewProps) {
    const [dateFilter, setDateFilter] = useState<DateFilterType>("this_year")
    const [isCustomDateDialogOpen, setIsCustomDateDialogOpen] = useState(false)
    const [isLedgerOpen, setIsLedgerOpen] = useState(false)

    // Dates for custom range
    const [customDateRange, setCustomDateRange] = useState<{ start: string, end: string }>({
        start: format(new Date(), "yyyy-MM-dd"),
        end: format(new Date(), "yyyy-MM-dd")
    })
    const [tempCustomRange, setTempCustomRange] = useState<{ start: string, end: string }>({
        start: format(new Date(), "yyyy-MM-dd"),
        end: format(new Date(), "yyyy-MM-dd")
    })

    // Helper to parse currency strings
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

    const formatDate = (dateString: string) => {
        if (!dateString) return "-"
        return format(new Date(dateString), "dd/MM/yyyy HH:mm")
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

    const activeContratsList = useMemo(() => filteredData.contrats.filter(c => c.etat !== "Annulé" && c.etat !== "Cancelled" && c.etat !== "Refusé"), [filteredData])

    // Metrics Calculation
    const totalEncaisse = activeContratsList.reduce((acc, curr) => {
        const total = parseCurrency(curr.prix_total)
        const acompte = parseCurrency(curr.acompte_recu)
        let amount = 0
        if (curr.acompte_paye) amount += acompte
        if (curr.solde_paye) amount += (total - acompte)
        return acc + amount
    }, 0)

    const totalAcomptes = activeContratsList.reduce((acc, curr) => {
        return curr.acompte_paye ? acc + parseCurrency(curr.acompte_recu) : acc
    }, 0)

    const totalSoldes = activeContratsList.reduce((acc, curr) => {
        const total = parseCurrency(curr.prix_total)
        const acompte = parseCurrency(curr.acompte_recu)
        return curr.solde_paye ? acc + (total - acompte) : acc
    }, 0)

    const resteAEncaisser = activeContratsList.reduce((acc, curr) => {
        const total = parseCurrency(curr.prix_total)
        const acompte = parseCurrency(curr.acompte_recu)
        let paid = 0
        if (curr.acompte_paye) paid += acompte
        if (curr.solde_paye) paid += (total - acompte)
        return acc + (total - paid)
    }, 0)

    const estimationCA = activeContratsList.reduce((acc, curr) => {
        return acc + parseCurrency(curr.prix_total)
    }, 0)

    // Calculate Pending Payments (Future/Unpaid)
    // We look at ALL active contracts regardless of date filter to show what is currently due
    const pendingTransactions = useMemo(() => {
        const pending: any[] = []

        activeContratsList.forEach(c => {
            const total = parseCurrency(c.prix_total)
            const acompte = parseCurrency(c.acompte_recu)

            if (!c.acompte_paye) {
                pending.push({
                    id: `${c.id}-acompte-pending`,
                    client: c.nom_client,
                    type: "Acompte",
                    amount: acompte,
                    dueDate: c.date_debut,
                    isOverdue: isAfter(new Date(), new Date(c.date_debut))
                })
            }

            if (!c.solde_paye) {
                pending.push({
                    id: `${c.id}-solde-pending`,
                    client: c.nom_client,
                    type: "Solde",
                    amount: total - acompte,
                    dueDate: c.date_debut,
                    isOverdue: isAfter(new Date(), new Date(c.date_debut))
                })
            }
        })
        return pending.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    }, [activeContratsList])

    // Payment Methods Breakdown
    const methodStats: Record<string, number> = {}

    activeContratsList.forEach(curr => {
        const total = parseCurrency(curr.prix_total)
        const acompte = parseCurrency(curr.acompte_recu)

        if (curr.acompte_paye) {
            const method = curr.acompte_methode || "Non spécifié"
            methodStats[method] = (methodStats[method] || 0) + acompte
        }

        if (curr.solde_paye) {
            const method = curr.solde_methode || "Non spécifié"
            const soldeAmount = total - acompte
            methodStats[method] = (methodStats[method] || 0) + soldeAmount
        }
    })

    const sortedMethods = Object.entries(methodStats).sort((a, b) => b[1] - a[1])

    return (
        <div className="flex flex-col gap-6 p-4 md:p-8 bg-[#f1f5f9]/50 min-h-screen rounded-xl">
            {/* Header Section */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-slate-800">Finance & Trésorerie</h1>
                    <p className="text-slate-500 text-xs md:text-sm">Suivi des règlements : <span className="font-bold text-indigo-600">{activeLabel}</span></p>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
                {/* Estimation CA */}
                <Card className="rounded-2xl shadow-sm border-slate-100 border-l-[4px] border-l-indigo-600 bg-indigo-50/30">
                    <CardContent className="p-4 md:p-6 flex flex-col justify-center h-full">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUpIcon className="size-4 text-indigo-600" />
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Estimation CA</div>
                        </div>
                        <div className="text-2xl md:text-3xl font-bold text-indigo-700">{estimationCA.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</div>
                        <div className="text-xs text-indigo-600 font-medium mt-1">Total des contrats sur la période</div>
                    </CardContent>
                </Card>

                {/* Total Encaissé */}
                <Card className="rounded-2xl shadow-sm border-slate-100 border-l-[4px] border-l-emerald-600">
                    <CardContent className="p-4 md:p-6 flex flex-col justify-center h-full">
                        <div className="flex items-center gap-2 mb-2">
                            <WalletIcon className="size-4 text-emerald-600" />
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Encaissé</div>
                        </div>
                        <div className="text-2xl md:text-3xl font-bold text-emerald-700">{totalEncaisse.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</div>
                        <div className="text-xs text-emerald-600 font-medium mt-1">Trésorerie réelle sur la période</div>
                    </CardContent>
                </Card>

                {/* Acomptes */}
                <Card className="rounded-2xl shadow-sm border-slate-100 border-l-[4px] border-l-blue-500">
                    <CardContent className="p-4 md:p-6 flex flex-col justify-center h-full">
                        <div className="flex items-center gap-2 mb-2">
                            <BanknoteIcon className="size-4 text-blue-500" />
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Acomptes Reçus</div>
                        </div>
                        <div className="text-xl md:text-2xl font-bold text-slate-700">{totalAcomptes.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</div>
                        <div className="text-xs text-slate-400 mt-1">Avances sur commandes</div>
                    </CardContent>
                </Card>

                {/* Soldes */}
                <Card className="rounded-2xl shadow-sm border-slate-100 border-l-[4px] border-l-indigo-500">
                    <CardContent className="p-4 md:p-6 flex flex-col justify-center h-full">
                        <div className="flex items-center gap-2 mb-2">
                            <CreditCardIcon className="size-4 text-indigo-500" />
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Soldes Réglés</div>
                        </div>
                        <div className="text-xl md:text-2xl font-bold text-slate-700">{totalSoldes.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</div>
                        <div className="text-xs text-slate-400 mt-1">Finalisation de paiement</div>
                    </CardContent>
                </Card>

                {/* Reste à payer */}
                <Card className="rounded-2xl shadow-sm border-slate-100 border-l-[4px] border-l-amber-500">
                    <CardContent className="p-4 md:p-6 flex flex-col justify-center h-full">
                        <div className="flex items-center gap-2 mb-2">
                            <AlertCircleIcon className="size-4 text-amber-500" />
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">En Attente</div>
                        </div>
                        <div className="text-xl md:text-2xl font-bold text-amber-600">{resteAEncaisser.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</div>
                        <div className="text-xs text-amber-500 mt-1">Soldes ou acomptes non reçus</div>
                    </CardContent>
                </Card>
            </div>

            {/* NEW: Paiements en attente (Pending Payments) */}
            <Card className="rounded-2xl shadow-sm border-slate-100 overflow-hidden">
                <CardContent className="p-0">
                    <div className="p-4 md:p-6 bg-amber-50/50 border-b border-amber-100">
                        <h3 className="text-lg font-bold text-amber-800 flex items-center gap-2">
                            <ClockIcon className="text-amber-600 size-5" /> Paiements en attente
                        </h3>
                        <p className="text-xs text-amber-600/80 mt-1">Liste des règlements à percevoir (acomptes et soldes) classés par date d'événement.</p>
                    </div>

                    <div className="max-h-[300px] overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                                    <TableHead>Date prévue</TableHead>
                                    <TableHead>Client</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead className="text-right">Montant</TableHead>
                                    <TableHead className="text-center">Statut</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pendingTransactions.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-slate-500 italic">
                                            Aucun paiement en attente. Tout est à jour !
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    pendingTransactions.map((tx) => (
                                        <TableRow key={tx.id} className="hover:bg-amber-50/30">
                                            <TableCell className="font-medium text-slate-600">
                                                {format(new Date(tx.dueDate), 'dd/MM/yyyy')}
                                            </TableCell>
                                            <TableCell className="font-semibold text-slate-700">{tx.client}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={tx.type === 'Acompte' ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-indigo-50 text-indigo-700 border-indigo-200"}>
                                                    {tx.type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-slate-800">
                                                {tx.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {tx.isOverdue ? (
                                                    <Badge variant="destructive" className="text-[10px] pointer-events-none">En retard</Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="text-[10px] pointer-events-none">À venir</Badge>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Bottom Grid: Methods & Details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 pb-20 md:pb-0">
                {/* Methods Breakdown */}
                <Card className="rounded-2xl shadow-sm border-slate-100">
                    <CardContent className="p-4 md:p-6">
                        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <ArrowRightLeftIcon className="text-indigo-500 size-5" /> Répartition par mode de paiement
                        </h3>

                        <div className="space-y-4">
                            {sortedMethods.length > 0 ? (
                                sortedMethods.map(([method, amount], idx) => {
                                    const percentage = totalEncaisse > 0 ? (amount / totalEncaisse) * 100 : 0
                                    return (
                                        <div key={idx} className="space-y-1">
                                            <div className="flex justify-between text-sm font-medium">
                                                <span className="text-slate-700 capitalize">{method}</span>
                                                <span className="text-slate-900 font-bold">{amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>
                                            </div>
                                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${['Especes', 'Espèces', 'Especes'].includes(method) ? 'bg-green-500' : 'bg-indigo-500'}`}
                                                    style={{ width: `${percentage}%` }}
                                                />
                                            </div>
                                            <div className="text-xs text-slate-400 text-right">{percentage.toFixed(1)}%</div>
                                        </div>
                                    )
                                })
                            ) : (
                                <div className="text-center py-10 text-slate-400 italic">
                                    Aucun règlement enregistré sur cette période.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Transaction Ledger Table (Collapsible) */}
                <Card className="rounded-2xl shadow-sm border-slate-100 lg:col-span-2">
                    <CardContent className="p-0">
                        {/* Header Toggle */}
                        <div
                            className="p-4 md:p-6 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                            onClick={() => setIsLedgerOpen(!isLedgerOpen)}
                        >
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <BanknoteIcon className="text-emerald-500 size-5" /> Historique des Règlements
                            </h3>
                            <Button variant="ghost" size="sm" className="gap-2 text-slate-500">
                                {isLedgerOpen ? "Masquer" : "Afficher"}
                                {isLedgerOpen ? <CheckCircleIcon className="size-4" /> : <ClockIcon className="size-4" />}
                            </Button>
                        </div>

                        {/* Collapsible Content */}
                        {isLedgerOpen && (
                            <div className="border-t border-slate-100 p-4 pt-0">
                                <div className="rounded-md border mt-4">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[120px]">Date du règlement</TableHead>
                                                <TableHead>Client</TableHead>
                                                <TableHead>Type</TableHead>
                                                <TableHead className="text-right">Montant</TableHead>
                                                <TableHead className="text-right">Méthode</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {(() => {
                                                // Derive transactions
                                                const transactions = activeContratsList.flatMap(contrat => {
                                                    const txs = []
                                                    const total = parseCurrency(contrat.prix_total)
                                                    const acompte = parseCurrency(contrat.acompte_recu)
                                                    const solde = total - acompte

                                                    if (contrat.acompte_paye) {
                                                        txs.push({
                                                            id: `${contrat.id}-acompte`,
                                                            date: contrat.acompte_date || contrat.date_debut,
                                                            isEstimated: !contrat.acompte_date,
                                                            client: contrat.nom_client,
                                                            type: 'Acompte',
                                                            amount: acompte,
                                                            method: contrat.acompte_methode
                                                        })
                                                    }

                                                    if (contrat.solde_paye) {
                                                        txs.push({
                                                            id: `${contrat.id}-solde`,
                                                            date: contrat.solde_date || contrat.date_debut,
                                                            isEstimated: !contrat.solde_date,
                                                            client: contrat.nom_client,
                                                            type: 'Solde',
                                                            amount: solde,
                                                            method: contrat.solde_methode
                                                        })
                                                    }
                                                    return txs
                                                }).sort((a, b) => {
                                                    if (!a.date) return 1
                                                    if (!b.date) return -1
                                                    return new Date(b.date).getTime() - new Date(a.date).getTime()
                                                })

                                                if (transactions.length === 0) {
                                                    return (
                                                        <TableRow>
                                                            <TableCell colSpan={5} className="h-24 text-center text-slate-500 italic">
                                                                Aucun règlement enregistré sur cette période.
                                                            </TableCell>
                                                        </TableRow>
                                                    )
                                                }

                                                return transactions.map((tx) => (
                                                    <TableRow key={tx.id}>
                                                        <TableCell className="font-medium text-slate-600">
                                                            {tx.date ? (
                                                                <div className="flex flex-col">
                                                                    <span>{formatDate(tx.date)}</span>
                                                                    {tx.isEstimated && <span className="text-[10px] text-slate-400 italic">Date évènement</span>}
                                                                </div>
                                                            ) : "-"}
                                                        </TableCell>
                                                        <TableCell className="font-semibold text-slate-700">{tx.client || "Client Inconnu"}</TableCell>
                                                        <TableCell>
                                                            <Badge className={tx.type === 'Acompte' ? "bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200" : "bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-indigo-200"}>
                                                                {tx.type}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right font-bold text-slate-800">
                                                            {tx.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <span className="text-xs font-medium text-slate-500 flex items-center justify-end gap-1">
                                                                {tx.method || "Inconnu"}
                                                                {['Especes', 'Espèces', 'Especes'].includes(tx.method || "") ? <BanknoteIcon className="size-3" /> : <CreditCardIcon className="size-3" />}
                                                            </span>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            })()}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        )}
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
