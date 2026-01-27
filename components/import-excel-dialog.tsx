"use client"

import React, { useState, useRef, useEffect } from "react"
import * as XLSX from "xlsx"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Loader2, Upload, FileUp, CheckCircle2, AlertCircle, X, Info, SearchX, FileSpreadsheet } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { format } from "date-fns"
import { supabase } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface ImportExcelDialogProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    onImport: (data: any[]) => Promise<void>
}

export function ImportExcelDialog({ isOpen, onOpenChange, onImport }: ImportExcelDialogProps) {
    const [file, setFile] = useState<File | null>(null)
    const [mappedPreviewData, setMappedPreviewData] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [step, setStep] = useState<"upload" | "preview">("upload")
    const [showSuccessBanner, setShowSuccessBanner] = useState(true)
    const [settings, setSettings] = useState<any>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        const fetchSettings = async () => {
            const { data } = await supabase.from('settings').select('data').single()
            if (data?.data) {
                setSettings(data.data)
            }
        }
        fetchSettings()
    }, [isOpen])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (selectedFile) {
            setFile(selectedFile)
            processFile(selectedFile)
        }
    }

    const processFile = (file: File) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            const data = e.target?.result
            const workbook = XLSX.read(data, { type: "binary", cellDates: true })
            const firstSheetName = workbook.SheetNames[0]
            const worksheet = workbook.Sheets[firstSheetName]

            const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

            const keywords = ["nom", "client", "date", "prix", "total", "tél", "tel", "mail", "lieu", "prestation", "forfait"]
            let headerRowIndex = -1

            for (let i = 0; i < Math.min(rows.length, 20); i++) {
                const row = rows[i] || []
                const hasKeyword = row.some(cell =>
                    cell && keywords.some(kw => cell.toString().toLowerCase().includes(kw))
                )
                if (hasKeyword) {
                    headerRowIndex = i
                    break
                }
            }

            if (headerRowIndex === -1 && rows.length > 0) headerRowIndex = 0
            if (headerRowIndex === -1) {
                toast({ title: "Fichier vide", description: "Aucune donnée détectée.", variant: "destructive" })
                return
            }

            const sheetHeaders = (rows[headerRowIndex] || []).map(h => h?.toString()?.trim() || "") as string[]
            const sheetData = rows.slice(headerRowIndex + 1).filter(row => row.some(cell => cell !== null && cell !== "")).map((row) => {
                const obj: any = {}
                sheetHeaders.forEach((header, index) => {
                    if (header) {
                        obj[header] = row[index]
                    }
                })
                return obj
            })

            if (sheetData.length === 0) {
                toast({ title: "Aucune donnée", description: "Le fichier semble ne contenir que des en-têtes.", variant: "destructive" })
                return
            }

            const mapped = sheetData.map(row => mapDataToSchema(row))
            setMappedPreviewData(mapped)
            setStep("preview")

            toast({
                title: "Analyse terminée",
                description: `${mapped.length} dossiers identifiés et prêts à l'importation.`,
                className: "bg-emerald-600 border-none text-white",
            })
        }
        reader.readAsBinaryString(file)
    }

    const mapDataToSchema = (rawItem: any) => {
        const findValue = (possibleNames: string[]) => {
            const keys = Object.keys(rawItem)
            const key = keys.find(k => k && possibleNames.some(p => k.toLowerCase().includes(p.toLowerCase())))
            return key ? rawItem[key] : null
        }

        const cleanString = (val: any) => {
            if (val === null || val === undefined) return ""
            return val.toString().replace(/"/g, '').trim()
        }

        const nom_client = cleanString(findValue(["nom", "client", "customer", "name"])) || "Inconnu"
        const email_client = cleanString(findValue(["email", "mail"]))
        const telephone_client = cleanString(findValue(["tel", "phone", "portable", "telephone", "tél"]))
        const date_debut_raw = findValue(["date", "evenement", "event", "événement"])
        const lieu = cleanString(findValue(["lieu", "adresse", "location", "place", "prestation"]))
        const prix_total_raw = findValue(["prix", "total", "montant", "amount", "price"])
        const forfaitRaw = cleanString(findValue(["offre", "formule", "package", "forfait"]))
        const nom_evenement = cleanString(findValue(["evenement", "titre", "type", "événement"]))
        const optionRaw = cleanString(findValue(["option", "supplément", "extra"]))
        const acompteRaw = findValue(["acompte", "deposit", "acom"])

        let formattedDate = ""
        if (date_debut_raw) {
            if (date_debut_raw instanceof Date) {
                const bufferDate = new Date(date_debut_raw.getTime() + (12 * 60 * 60 * 1000))
                formattedDate = format(bufferDate, "yyyy-MM-dd")
            } else if (typeof date_debut_raw === "number") {
                const date = new Date((date_debut_raw - (25567 + 2)) * 86400 * 1000)
                try {
                    const bufferDate = new Date(date.getTime() + (12 * 60 * 60 * 1000))
                    formattedDate = format(bufferDate, "yyyy-MM-dd")
                } catch (e) {
                    formattedDate = format(new Date(), "yyyy-MM-dd")
                }
            } else {
                try {
                    const parsedDate = new Date(date_debut_raw)
                    if (!isNaN(parsedDate.getTime())) {
                        const bufferDate = new Date(parsedDate.getTime() + (12 * 60 * 60 * 1000))
                        formattedDate = format(bufferDate, "yyyy-MM-dd")
                    }
                } catch (e) {
                    formattedDate = ""
                }
            }
        }

        let offre = ""
        let calculatedPrice = 0
        const catalogOffres = settings?.offres || []
        if (forfaitRaw) {
            const raw = forfaitRaw.toLowerCase()
            const match = catalogOffres.find((o: any) => o.name.toLowerCase().includes(raw) || raw.includes(o.name.toLowerCase()))
            if (match) {
                offre = match.name
                calculatedPrice = parseFloat(match.price) || 0
            } else {
                offre = forfaitRaw
            }
        }

        const selected_options: any[] = []
        const catalogOptions = settings?.options || []
        if (optionRaw) {
            const list = optionRaw.split(',').map((o: string) => o.trim().toLowerCase())
            list.forEach((optStr: string) => {
                const match = catalogOptions.find((o: any) => o.name.toLowerCase().includes(optStr) || optStr.includes(o.name.toLowerCase()))
                if (match) {
                    selected_options.push({ name: match.name, price: match.price })
                    calculatedPrice += (parseFloat(match.price) || 0)
                } else if (optStr) {
                    selected_options.push({ name: optStr, price: "0" })
                }
            })
        }

        const prix_total = (prix_total_raw !== null && prix_total_raw !== undefined && prix_total_raw !== "")
            ? cleanString(prix_total_raw).replace(',', '.')
            : calculatedPrice.toString()

        const acompte_recu = (acompteRaw !== null && acompteRaw !== undefined && acompteRaw !== "")
            ? cleanString(acompteRaw).replace(',', '.')
            : "0"

        return {
            nom_client,
            email_client,
            telephone_client,
            date_debut: formattedDate || format(new Date(), "yyyy-MM-dd"),
            lieu,
            prix_total,
            acompte_recu,
            acompte_paye: parseFloat(acompte_recu) > 0,
            offre,
            nom_evenement,
            selected_options,
            etat: "Contact",
        }
    }

    const handleImport = async () => {
        setIsLoading(true)
        try {
            await onImport(mappedPreviewData)
            toast({ title: "Importation réussie", description: `${mappedPreviewData.length} dossiers ont été importés.`, })
            reset()
            onOpenChange(false)
        } catch (error) {
            console.error("Import error:", error)
            toast({ title: "Erreur d'importation", description: "Vérifiez le format du fichier.", variant: "destructive", })
        } finally {
            setIsLoading(false)
        }
    }

    const reset = () => {
        setFile(null)
        setMappedPreviewData([])
        setStep("upload")
        if (fileInputRef.current) fileInputRef.current.value = ""
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!isLoading) onOpenChange(open); if (!open) reset(); }}>
            <DialogContent
                showCloseButton={false}
                className="fixed z-50 bg-background shadow-lg transition-all duration-200 
                left-0 top-0 w-full h-full max-w-none translate-x-0 translate-y-0 rounded-none border-none
                sm:left-[50%] sm:top-[50%] sm:w-[95vw] sm:max-w-5xl sm:h-[90vh] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border sm:shadow-2xl
                data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 
                sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95 
                sm:data-[state=closed]:slide-out-to-left-1/2 sm:data-[state=closed]:slide-out-to-top-[48%] 
                sm:data-[state=open]:slide-in-from-left-1/2 sm:data-[state=open]:slide-in-from-top-[48%]
                !flex flex-col p-0 gap-0 overflow-hidden bg-slate-50"
            >
                {/* Header Section */}
                <div className="flex-none bg-white px-4 py-4 sm:px-6 sm:py-6 border-b border-slate-200">
                    <div className="max-w-7xl mx-auto flex items-center justify-between">
                        <DialogHeader className="space-y-1 text-left">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600 hidden sm:block">
                                    <FileSpreadsheet className="size-6" />
                                </div>
                                <div className="space-y-0.5">
                                    <DialogTitle className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Importation de dossiers</DialogTitle>
                                    <DialogDescription className="text-slate-500 font-medium text-xs sm:text-sm">Analyse et structuration intelligente de votre fichier Excel</DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full hover:bg-slate-100 text-slate-400"
                            onClick={() => onOpenChange(false)}
                            disabled={isLoading}
                        >
                            <X className="size-5" />
                        </Button>
                    </div>
                </div>

                {/* Body Content */}
                <div className="flex-1 min-h-0 overflow-hidden flex flex-col relative w-full">
                    {step === "upload" ? (
                        <div className="h-full overflow-y-auto px-4 py-4 sm:px-6 sm:py-6 scrollbar-thin scrollbar-thumb-slate-200">
                            <div className="max-w-5xl mx-auto w-full h-full flex flex-col">
                                <div
                                    className="flex-1 min-h-[300px] border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center gap-6 bg-white hover:border-indigo-400 hover:bg-indigo-50/10 transition-all cursor-pointer group p-8 sm:p-12 shadow-sm"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <div className="size-16 rounded-2xl flex items-center justify-center text-slate-900 group-hover:scale-110 transition-transform duration-300">
                                        <Upload className="size-10" />
                                    </div>
                                    <div className="text-center space-y-2">
                                        <h3 className="font-bold text-xl text-slate-800 tracking-tight">Déposez votre fichier Excel</h3>
                                        <p className="text-slate-500 font-medium max-w-xs mx-auto text-sm leading-relaxed">
                                            Notre système détectera automatiquement vos colonnes et les liera à votre catalogue.
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                                        <Badge variant="outline" className="bg-slate-50 border-slate-200 text-slate-600 px-3 py-1 font-semibold uppercase tracking-wider text-[10px]">.xlsx</Badge>
                                        <Badge variant="outline" className="bg-slate-50 border-slate-200 text-slate-600 px-3 py-1 font-semibold uppercase tracking-wider text-[10px]">.xls</Badge>
                                        <Badge variant="outline" className="bg-slate-50 border-slate-200 text-slate-600 px-3 py-1 font-semibold uppercase tracking-wider text-[10px]">.csv</Badge>
                                    </div>
                                    <Input
                                        type="file"
                                        className="hidden"
                                        ref={fileInputRef}
                                        accept=".xlsx, .xls, .csv"
                                        onChange={handleFileChange}
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full">
                            {/* Alert Info Header */}
                            <div className="flex-none px-4 pt-4 sm:px-6 sm:pt-6 pb-2">
                                <div className="max-w-7xl mx-auto w-full flex flex-col gap-3">
                                    <div className="flex justify-end">
                                        <Button
                                            onClick={reset}
                                            variant="ghost"
                                            size="sm"
                                            className="text-slate-500 hover:text-slate-700 hover:bg-slate-100 font-bold h-8 px-3 rounded-lg text-xs"
                                        >
                                            <SearchX className="size-3.5 mr-2" />
                                            Changer de fichier
                                        </Button>
                                    </div>

                                    <div className="bg-amber-50 border border-amber-100 rounded-xl sm:rounded-2xl py-2 px-3 sm:px-4 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 shrink-0">
                                        <div className="flex items-center gap-3 sm:gap-4 w-full">
                                            <div className="size-8 sm:size-9 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                                                <AlertCircle className="size-4 sm:size-4.5" />
                                            </div>
                                            <div className="space-y-0.5 flex-1">
                                                <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dernière étape</p>
                                                <p className="text-xs sm:text-sm font-bold text-slate-700 leading-tight">Veuillez vérifier les montants et dates avant de lancer l'importation.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Scrollable Table Container */}
                            <div className="flex-1 min-h-0 overflow-hidden px-4 py-2 sm:px-6 sm:py-4 flex flex-col">
                                <div className="max-w-7xl mx-auto w-full h-full flex flex-col">
                                    <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
                                        <div className="flex-1 w-full overflow-x-auto">
                                            <div className="min-w-[800px] h-full flex flex-col">
                                                {/* Header Row */}
                                                <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-slate-100 bg-slate-50/80 text-[10px] font-bold text-slate-400 uppercase tracking-widest sticky top-0 z-10 backdrop-blur-sm">
                                                    <div className="col-span-3">Client</div>
                                                    <div className="col-span-2">Date</div>
                                                    <div className="col-span-2 text-center">Offre</div>
                                                    <div className="col-span-3">Lieu</div>
                                                    <div className="col-span-1 text-right">Acompte</div>
                                                    <div className="col-span-1 text-right">Total</div>
                                                </div>

                                                {/* Scrollable Body */}
                                                <div className="flex-1 overflow-y-auto">
                                                    {mappedPreviewData.slice(0, 100).map((row, i) => (
                                                        <div key={i} className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-slate-50 last:border-0 hover:bg-indigo-50/30 transition-all items-center group">
                                                            <div className="col-span-3">
                                                                <p className="font-bold text-slate-800 text-xs sm:text-sm truncate" title={row.nom_client}>{row.nom_client}</p>
                                                                <p className="text-[10px] text-slate-400 font-bold mt-0.5 truncate">{row.telephone_client || "–"}</p>
                                                            </div>
                                                            <div className="col-span-2">
                                                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] sm:text-[11px] font-bold border border-slate-200 whitespace-nowrap">
                                                                    {format(new Date(row.date_debut), 'dd/MM/yyyy')}
                                                                </span>
                                                            </div>
                                                            <div className="col-span-2 text-center flex items-center justify-center px-1">
                                                                {row.offre ? (
                                                                    <Badge variant="default" className="bg-indigo-600 hover:bg-indigo-700 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 truncate max-w-full block" title={row.offre}>
                                                                        {row.offre}
                                                                    </Badge>
                                                                ) : <span className="text-slate-300 italic text-[11px]">–</span>}
                                                            </div>
                                                            <div className="col-span-3">
                                                                <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 truncate" title={row.lieu}>
                                                                    {row.lieu || <span className="italic opacity-50">Non précisé</span>}
                                                                </p>
                                                            </div>
                                                            <div className="col-span-1 text-right">
                                                                <span className="font-bold text-[10px] sm:text-[11px] text-emerald-600 whitespace-nowrap">{parseFloat(row.acompte_recu).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}€</span>
                                                            </div>
                                                            <div className="col-span-1 text-right">
                                                                <span className="font-bold text-xs sm:text-sm text-indigo-600 whitespace-nowrap">{parseFloat(row.prix_total).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}€</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {mappedPreviewData.length > 100 && (
                                                        <div className="p-4 bg-slate-50/80 border-t border-slate-100 text-center flex items-center justify-center gap-2">
                                                            <Info className="size-4 text-indigo-500" />
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Affichage limité aux 100 premiers dossiers</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Bar */}
                {step === "preview" && (
                    <div className="flex-none bg-white px-4 py-4 sm:px-6 sm:py-6 border-t border-slate-200 shadow-[0_-8px_30px_rgb(0,0,0,0.04)] transition-all z-30">
                        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-6">
                            <div className="hidden sm:flex items-center gap-4 text-slate-500 text-center sm:text-left">
                                {/* Spacer or alternative content if needed */}
                            </div>
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <button
                                    onClick={() => onOpenChange(false)}
                                    className="flex-1 sm:flex-none px-4 sm:px-6 h-10 sm:h-12 rounded-xl text-slate-400 font-bold hover:text-slate-600 hover:bg-slate-50 transition-all border border-slate-200 text-sm sm:text-base"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleImport}
                                    disabled={isLoading}
                                    className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 h-12 rounded-xl bg-indigo-600 text-white font-bold text-base shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-0.5 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap"
                                >
                                    {isLoading ? (
                                        <Loader2 className="size-6 animate-spin" />
                                    ) : (
                                        <>
                                            <Upload className="size-5 shrink-0" />
                                            <span className="leading-none">Lancer l'importation</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog >
    )
}
