"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { BuildingIcon, FileTextIcon, SlidersIcon, CameraIcon, CreditCardIcon, FileIcon, SettingsIcon, CheckIcon, UploadIcon, PenToolIcon, TrashIcon, XIcon, EraserIcon, Loader2Icon, TagIcon, StarIcon, BoxIcon, TruckIcon, EyeIcon, PlusIcon, PlusCircleIcon } from "lucide-react"
import { supabase } from "@/lib/supabase"

// Define a type for our settings
type Settings = {
    // Identité
    nom_societe: string
    siret: string
    tva_intra: string
    code_naf: string
    email_contact: string
    adresse: string
    code_postal: string
    ville: string
    telephone_contact: string
    logo_base64?: string

    // Finance
    banque_titulaire: string
    banque_nom: string
    iban: string
    bic: string
    tva_active: boolean
    tva_taux: string
    acompte_type: "percent" | "fixed"
    acompte_valeur: string
    mention_tva: string
    footer_facture: string

    // Workflow
    workflow_steps: string[]
    msg_success: string
    relance_devis_active: boolean
    relance_devis_days: string
    relance_contrat_active: boolean
    relance_contrat_days: string

    // Documents
    mention_paiement: string
    feature_sign_quote: boolean
    cgv_text: string
    signature_base64?: string
    annexe_active: boolean
    annexe_titre: string
    annexe_texte: string
    annexe_logo_base64?: string

    // Catalogue
    offres: { name: string; price: string }[]
    options: { name: string; price: string; public: boolean }[]
    label_livraison: string
}

const defaultSettings: Settings = {
    nom_societe: "Mon Entreprise",
    siret: "",
    tva_intra: "",
    code_naf: "",
    email_contact: "",
    adresse: "",
    code_postal: "",
    ville: "",
    telephone_contact: "",
    banque_titulaire: "",
    banque_nom: "",
    iban: "",
    bic: "",
    tva_active: false,
    tva_taux: "20",
    acompte_type: "percent",
    acompte_valeur: "30",
    mention_tva: "TVA non applicable, art. 293 B du CGI",
    footer_facture: "",
    workflow_steps: ["Contrat signé", "Questionnaire reçu", "Design validé", "Matériel prêt"],
    msg_success: "",
    relance_devis_active: false,
    relance_devis_days: "7",
    relance_contrat_active: false,
    relance_contrat_days: "7",
    mention_paiement: "",
    feature_sign_quote: false,
    cgv_text: "",
    annexe_active: false,
    annexe_titre: "ANNEXE",
    annexe_texte: "",
    offres: [
        { name: "Basic", price: "150" },
        { name: "Eclat", price: "250" },
        { name: "Prestige", price: "350" }
    ],
    options: [],
    label_livraison: "Frais de déplacement"
}

export default function PersonnalisationPage() {
    const [settings, setSettings] = useState<Settings>(defaultSettings)
    const [isSaved, setIsSaved] = useState(false)
    const [isSigModalOpen, setIsSigModalOpen] = useState(false)

    const logoInputRef = useRef<HTMLInputElement>(null)
    const signatureInputRef = useRef<HTMLInputElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [isDrawing, setIsDrawing] = useState(false)

    const [isLoading, setIsLoading] = useState(true)
    const [currentRecordId, setCurrentRecordId] = useState<number | null>(null)

    // Load from Supabase
    useEffect(() => {
        fetchSettings()
    }, [])

    async function fetchSettings() {
        setIsLoading(true)
        try {
            // Discovery mode: try to find the first record available
            const { data: records, error } = await supabase
                .from('settings')
                .select('*')
                .limit(1)

            if (error) throw error

            if (records && records.length > 0) {
                const record = records[0]
                setCurrentRecordId(record.id)
                setSettings({ ...defaultSettings, ...record.data })
                console.log("Settings discovered (ID:", record.id, "):", record.data)
            } else {
                console.log("No settings record found. Using defaults.")
            }
        } catch (e) {
            console.error("Failed to fetch settings from Supabase", e)
        } finally {
            setIsLoading(false)
        }
    }

    const handleChange = (field: keyof Settings, value: any) => {
        setSettings(prev => ({ ...prev, [field]: value }))
        setIsSaved(false)
    }

    const handleWorkflowStepChange = (index: number, value: string) => {
        const newSteps = [...settings.workflow_steps]
        newSteps[index] = value
        setSettings(prev => ({ ...prev, workflow_steps: newSteps }))
        setIsSaved(false)
    }

    const addOffer = () => {
        setSettings(prev => ({
            ...prev,
            offres: [...prev.offres, { name: "", price: "" }]
        }))
    }

    const removeOffer = (index: number) => {
        setSettings(prev => ({
            ...prev,
            offres: prev.offres.filter((_, i) => i !== index)
        }))
    }

    const handleOfferChange = (index: number, field: "name" | "price", value: string) => {
        const newOffres = [...settings.offres]
        newOffres[index] = { ...newOffres[index], [field]: value }
        setSettings(prev => ({ ...prev, offres: newOffres }))
    }

    const addOption = () => {
        setSettings(prev => ({
            ...prev,
            options: [...prev.options, { name: "", price: "", public: false }]
        }))
    }

    const removeOption = (index: number) => {
        setSettings(prev => ({
            ...prev,
            options: prev.options.filter((_, i) => i !== index)
        }))
    }

    const handleOptionChange = (index: number, field: "name" | "price" | "public", value: any) => {
        const newOptions = [...settings.options]
        newOptions[index] = { ...newOptions[index], [field]: value }
        setSettings(prev => ({ ...prev, options: newOptions }))
    }

    const handleSave = async () => {
        setIsLoading(true)
        try {
            const saveId = currentRecordId || 1
            const { error } = await supabase
                .from('settings')
                .upsert({ id: saveId, data: settings, updated_at: new Date().toISOString() })

            if (error) throw error

            // Refresh ID just in case it was a new creation
            if (!currentRecordId) {
                const { data } = await supabase.from('settings').select('id').limit(1).single()
                if (data) setCurrentRecordId(data.id)
            }

            setIsSaved(true)
            setTimeout(() => setIsSaved(false), 2000)
        } catch (e) {
            console.error("Failed to save settings to Supabase", e)
            alert("Erreur lors de la sauvegarde dans la base de données.")
        } finally {
            setIsLoading(false)
        }
    }

    // --- DATA MANAGEMENT ---
    const exportData = () => {
        const data = {
            appSettings: localStorage.getItem("appSettings"),
            devisList: localStorage.getItem("devisList"),
            contratsList: localStorage.getItem("contratsList"),
        }
        const blob = new Blob([JSON.stringify(data)], { type: "application/json" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `backup-photobooth-${new Date().toISOString().split('T')[0]}.json`
        a.click()
    }

    const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target?.result as string)
                if (data.appSettings) localStorage.setItem("appSettings", data.appSettings)
                if (data.devisList) localStorage.setItem("devisList", data.devisList)
                if (data.contratsList) localStorage.setItem("contratsList", data.contratsList)
                alert("Importation réussie ! La page va s'actualiser.")
                window.location.reload()
            } catch (err) {
                alert("Erreur lors de l'importation du fichier.")
            }
        }
        reader.readAsText(file)
    }

    // --- LOGO UPLOAD ---
    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onloadend = () => {
                handleChange("logo_base64", reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const triggerLogoInput = () => logoInputRef.current?.click()
    const removeLogo = () => handleChange("logo_base64", undefined)

    // --- SIGNATURE UPLOAD ---
    const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onloadend = () => {
                handleChange("signature_base64", reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const triggerSignatureInput = () => signatureInputRef.current?.click()
    const removeSignature = () => handleChange("signature_base64", undefined)

    // --- SIGNATURE PAD ---
    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        setIsDrawing(true)
        const { offsetX, offsetY } = getCoordinates(e, canvas)
        ctx.beginPath()
        ctx.moveTo(offsetX, offsetY)
    }

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        const { offsetX, offsetY } = getCoordinates(e, canvas)
        ctx.lineTo(offsetX, offsetY)
        ctx.stroke()
    }

    const stopDrawing = () => {
        setIsDrawing(false)
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return
        ctx.closePath()
    }

    const getCoordinates = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
        // Handle touch events
        if ('touches' in e) {
            const rect = canvas.getBoundingClientRect()
            return {
                offsetX: e.touches[0].clientX - rect.left,
                offsetY: e.touches[0].clientY - rect.top
            }
        }
        // Handle mouse events
        return {
            offsetX: (e as React.MouseEvent).nativeEvent.offsetX,
            offsetY: (e as React.MouseEvent).nativeEvent.offsetY
        }
    }

    const clearCanvas = () => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return
        ctx.clearRect(0, 0, canvas.width, canvas.height)
    }

    const saveCanvasSignature = () => {
        const canvas = canvasRef.current
        if (!canvas) return
        const dataUrl = canvas.toDataURL("image/png")
        handleChange("signature_base64", dataUrl)
        setIsSigModalOpen(false)
    }

    // Initialize canvas style when modal opens
    useEffect(() => {
        if (isSigModalOpen && canvasRef.current) {
            const canvas = canvasRef.current
            canvas.width = canvas.parentElement?.clientWidth || 400
            canvas.height = 200
            const ctx = canvas.getContext("2d")
            if (ctx) {
                ctx.strokeStyle = "#000"
                ctx.lineWidth = 2
                ctx.lineCap = "round"
            }
        }
    }, [isSigModalOpen])

    return (
        <div className="flex flex-1 flex-col gap-6 p-4 md:p-8 bg-[#f1f5f9]/50 min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <SettingsIcon className="size-6 text-primary" />
                        Paramètres
                    </h1>
                    <p className="text-muted-foreground">Configurez votre identité, vos prix et vos documents.</p>
                </div>
                <div className="flex items-center gap-2">
                    {isLoading && <Loader2Icon className="size-4 animate-spin text-muted-foreground mr-2" />}
                    <Button variant="outline" onClick={exportData} title="Exporter les données (Backup)">
                        <UploadIcon className="size-4 mr-2 rotate-180" /> Exporter
                    </Button>
                    <div className="relative">
                        <input type="file" accept=".json" onChange={importData} className="hidden" id="import-btn" />
                        <Button variant="outline" asChild>
                            <label htmlFor="import-btn" className="cursor-pointer">
                                <UploadIcon className="size-4 mr-2" /> Importer
                            </label>
                        </Button>
                    </div>
                    <Button onClick={handleSave} className="gap-2 shadow-lg hover:shadow-xl transition-all" disabled={isLoading}>
                        {isSaved ? <CheckIcon className="size-4" /> : <SettingsIcon className="size-4" />}
                        {isSaved ? "Enregistré !" : "Enregistrer"}
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="identite" className="w-full space-y-6">
                <TabsList className="bg-white p-1 border h-auto flex-wrap justify-start">
                    <TabsTrigger value="identite" className="gap-2 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600">
                        <BuildingIcon className="size-4" /> Identité
                    </TabsTrigger>
                    <TabsTrigger value="finance" className="gap-2 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600">
                        <CreditCardIcon className="size-4" /> Finance
                    </TabsTrigger>
                    <TabsTrigger value="catalogue" className="gap-2 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600">
                        <TagIcon className="size-4" /> Catalogue
                    </TabsTrigger>
                    <TabsTrigger value="workflow" className="gap-2 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600">
                        <SlidersIcon className="size-4" /> Workflow
                    </TabsTrigger>
                    <TabsTrigger value="documents" className="gap-2 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600">
                        <FileTextIcon className="size-4" /> Documents
                    </TabsTrigger>
                </TabsList>

                {/* --- TAB: IDENTITÉ --- */}
                <TabsContent value="identite">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="md:col-span-2">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><BuildingIcon className="size-5 text-indigo-500" /> Informations Société</CardTitle>
                                <CardDescription>Apparaît sur tous vos documents.</CardDescription>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2 md:col-span-2">
                                    <Label>Nom Commercial / Raison Sociale</Label>
                                    <Input
                                        value={settings.nom_societe}
                                        onChange={(e) => handleChange("nom_societe", e.target.value)}
                                        className="font-bold text-lg"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>SIRET</Label>
                                    <Input value={settings.siret} onChange={(e) => handleChange("siret", e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>TVA Intracommunautaire</Label>
                                    <Input value={settings.tva_intra} onChange={(e) => handleChange("tva_intra", e.target.value)} placeholder="FR..." />
                                </div>
                                <div className="space-y-2">
                                    <Label>Email Contact</Label>
                                    <Input value={settings.email_contact} onChange={(e) => handleChange("email_contact", e.target.value)} type="email" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Téléphone</Label>
                                    <Input value={settings.telephone_contact} onChange={(e) => handleChange("telephone_contact", e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Code NAF (APE)</Label>
                                    <Input value={settings.code_naf} onChange={(e) => handleChange("code_naf", e.target.value)} placeholder="Ex: 7739Z" />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label>Adresse</Label>
                                    <Input value={settings.adresse} onChange={(e) => handleChange("adresse", e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Code Postal</Label>
                                    <Input value={settings.code_postal} onChange={(e) => handleChange("code_postal", e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Ville</Label>
                                    <Input value={settings.ville} onChange={(e) => handleChange("ville", e.target.value)} />
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><CameraIcon className="size-5 text-indigo-500" /> Logo</CardTitle>
                            </CardHeader>
                            <CardContent className="flex flex-col items-center justify-center p-6">
                                <div className="w-full h-32 bg-slate-50 border-2 border-dashed rounded-lg flex items-center justify-center mb-4 overflow-hidden relative">
                                    {settings.logo_base64 ? (
                                        <img src={settings.logo_base64} alt="Logo" className="max-h-full max-w-full object-contain" />
                                    ) : (
                                        <span className="text-slate-400 italic text-sm">Aucun logo</span>
                                    )}
                                </div>
                                <div className="w-full space-y-2">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        ref={logoInputRef}
                                        onChange={handleLogoUpload}
                                    />
                                    <Button variant="outline" className="w-full gap-2" onClick={triggerLogoInput}>
                                        <UploadIcon className="size-4" /> Importer
                                    </Button>
                                    {settings.logo_base64 && (
                                        <Button variant="ghost" className="w-full text-red-500 hover:text-red-700 hover:bg-red-50 gap-2" onClick={removeLogo}>
                                            <TrashIcon className="size-4" /> Supprimer
                                        </Button>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-2 text-center">Format PNG recommandé.</p>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* --- TAB: FINANCE --- */}
                <TabsContent value="finance">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><CreditCardIcon className="size-5 text-indigo-500" /> Coordonnées Bancaires</CardTitle>
                                <CardDescription>Pour les virements sur vos factures.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Titulaire du compte</Label>
                                    <Input value={settings.banque_titulaire} onChange={(e) => handleChange("banque_titulaire", e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Nom de la Banque</Label>
                                    <Input value={settings.banque_nom} onChange={(e) => handleChange("banque_nom", e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>IBAN</Label>
                                    <Input value={settings.iban} onChange={(e) => handleChange("iban", e.target.value)} className="font-mono text-primary" placeholder="FR76..." />
                                </div>
                                <div className="space-y-2">
                                    <Label>BIC / SWIFT</Label>
                                    <Input value={settings.bic} onChange={(e) => handleChange("bic", e.target.value)} className="font-mono" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><SettingsIcon className="size-5 text-indigo-500" /> Politique Tarifaire</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="bg-muted/50 p-4 rounded-lg space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label className="font-semibold text-indigo-900">Assujetti à la TVA ?</Label>
                                        <Switch
                                            checked={settings.tva_active}
                                            onCheckedChange={(checked) => handleChange("tva_active", checked)}
                                        />
                                    </div>
                                    {settings.tva_active && (
                                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                            <Label>Taux par défaut (%)</Label>
                                            <Input
                                                type="number"
                                                value={settings.tva_taux}
                                                onChange={(e) => handleChange("tva_taux", e.target.value)}
                                                className="w-24 text-center font-bold"
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="bg-muted/50 p-4 rounded-lg space-y-4">
                                    <Label className="font-semibold text-indigo-900">Acompte par défaut</Label>
                                    <div className="flex items-center gap-4">
                                        <RadioGroup
                                            value={settings.acompte_type}
                                            onValueChange={(val) => handleChange("acompte_type", val)}
                                            className="flex gap-2"
                                        >
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="percent" id="acompte-percent" />
                                                <Label htmlFor="acompte-percent">%</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="fixed" id="acompte-fixed" />
                                                <Label htmlFor="acompte-fixed">€</Label>
                                            </div>
                                        </RadioGroup>
                                        <div className="relative w-24">
                                            <Input
                                                type="number"
                                                value={settings.acompte_valeur}
                                                onChange={(e) => handleChange("acompte_valeur", e.target.value)}
                                                className="pr-8 text-right font-bold"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                                                {settings.acompte_type === "percent" ? "%" : "€"}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground">Proposé automatiquement lors de la création d'un contrat.</p>
                                </div>

                                <div className="space-y-2 border-t pt-4">
                                    <Label className="text-sm font-semibold">Mention TVA / Régime Fiscal</Label>
                                    <Input
                                        value={settings.mention_tva}
                                        onChange={(e) => handleChange("mention_tva", e.target.value)}
                                        placeholder="Ex: TVA non applicable, art. 293 B du CGI"
                                    />
                                    <p className="text-[10px] text-muted-foreground italic">Apparaît en bas des factures.</p>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold">Pied de page (Mentions légales)</Label>
                                    <Textarea
                                        value={settings.footer_facture}
                                        onChange={(e) => handleChange("footer_facture", e.target.value)}
                                        placeholder="Ex: Assurance RC Pro n°..."
                                        rows={3}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* --- TAB: CATALOGUE --- */}
                <TabsContent value="catalogue">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-6">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <div className="space-y-1">
                                        <CardTitle className="flex items-center gap-2"><StarIcon className="size-5 text-yellow-500" /> Formules (Packages)</CardTitle>
                                        <CardDescription>Liste des forfaits principaux proposés.</CardDescription>
                                    </div>
                                    <Button size="sm" variant="outline" onClick={addOffer} className="rounded-full bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100">
                                        <PlusIcon className="size-4 mr-1" /> Ajouter
                                    </Button>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {settings.offres.map((off, index) => (
                                        <div key={index} className="flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                                            <div className="relative flex-1">
                                                <TagIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-3 text-slate-400" />
                                                <Input
                                                    placeholder="Nom de la formule"
                                                    className="pl-8 text-sm"
                                                    value={off.name}
                                                    onChange={(e) => handleOfferChange(index, "name", e.target.value)}
                                                />
                                            </div>
                                            <div className="relative w-28">
                                                <Input
                                                    type="number"
                                                    placeholder="Prix"
                                                    className="pr-6 text-right font-mono text-sm"
                                                    value={off.price}
                                                    onChange={(e) => handleOfferChange(index, "price", e.target.value)}
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">€</span>
                                            </div>
                                            <Button size="icon" variant="ghost" className="text-slate-400 hover:text-red-500 hover:bg-red-50" onClick={() => removeOffer(index)}>
                                                <TrashIcon className="size-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    {settings.offres.length === 0 && (
                                        <p className="text-center text-xs text-muted-foreground italic py-4">Aucune formule configurée.</p>
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <div className="space-y-1">
                                        <CardTitle className="flex items-center gap-2"><BoxIcon className="size-5 text-pink-500" /> Options (Extras)</CardTitle>
                                        <CardDescription>Cochez l'œil pour rendre l'option visible par défaut.</CardDescription>
                                    </div>
                                    <Button size="sm" variant="outline" onClick={addOption} className="rounded-full bg-pink-50 text-pink-600 border-pink-100 hover:bg-pink-100">
                                        <PlusIcon className="size-4 mr-1" /> Ajouter
                                    </Button>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {settings.options.map((opt, index) => (
                                        <div key={index} className="flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                                            <div className="relative flex-1">
                                                <TagIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-3 text-slate-400" />
                                                <Input
                                                    placeholder="Nom de l'option"
                                                    className="pl-8 text-sm"
                                                    value={opt.name}
                                                    onChange={(e) => handleOptionChange(index, "name", e.target.value)}
                                                />
                                            </div>
                                            <div className="relative w-28">
                                                <Input
                                                    type="number"
                                                    placeholder="Prix"
                                                    className="pr-6 text-right font-mono text-sm"
                                                    value={opt.price}
                                                    onChange={(e) => handleOptionChange(index, "price", e.target.value)}
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">€</span>
                                            </div>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className={`size-9 border transition-colors ${opt.public ? "text-indigo-600 bg-indigo-50 border-indigo-200" : "text-slate-300 bg-slate-50 border-slate-200"}`}
                                                onClick={() => handleOptionChange(index, "public", !opt.public)}
                                                title={opt.public ? "Visible par le client" : "Caché par défaut"}
                                            >
                                                <EyeIcon className="size-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="text-slate-400 hover:text-red-500 hover:bg-red-50" onClick={() => removeOption(index)}>
                                                <TrashIcon className="size-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    {settings.options.length === 0 && (
                                        <p className="text-center text-xs text-muted-foreground italic py-4">Aucune option configurée.</p>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        <div className="space-y-6">
                            <Card className="h-fit">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><TruckIcon className="size-5 text-emerald-500" /> Livraison & Déplacement</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100 mb-4">
                                        <p className="text-xs text-emerald-800 leading-relaxed">
                                            <strong>Distance & Installation :</strong><br />
                                            Définissez l'intitulé qui apparaîtra sur vos documents. Le montant exact est à définir lors de l'édition de chaque devis.
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Intitulé sur les documents</Label>
                                        <Input
                                            value={settings.label_livraison}
                                            onChange={(e) => handleChange("label_livraison", e.target.value)}
                                            className="font-medium"
                                            placeholder='Ex: "Frais de déplacement", "Livraison & Installation"...'
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                {/* --- TAB: WORKFLOW --- */}
                <TabsContent value="workflow">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><SlidersIcon className="size-5 text-indigo-500" /> Suivi des dossiers</CardTitle>
                            <CardDescription>Personnalisez les étapes de votre checklist.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="bg-slate-50 p-6 rounded-xl border flex justify-between items-center text-center">
                                {settings.workflow_steps.map((step, index) => (
                                    <div key={index} className="flex-1 px-2 relative group">
                                        <div className="size-8 mx-auto rounded-full bg-white border-2 border-indigo-500 flex items-center justify-center text-sm font-bold text-indigo-600 mb-2 shadow-sm">
                                            {index + 1}
                                        </div>
                                        <div className="text-xs font-medium truncate">{step || `Étape ${index + 1}`}</div>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {settings.workflow_steps.map((step, index) => (
                                    <div key={index} className="space-y-2">
                                        <Label className="text-indigo-600 font-bold">Étape {index + 1}</Label>
                                        <Input
                                            value={step}
                                            onChange={(e) => handleWorkflowStepChange(index, e.target.value)}
                                            placeholder={`Ex: Étape ${index + 1}`}
                                        />
                                    </div>
                                ))}
                            </div>

                            <Separator />

                            <div className="space-y-4">
                                <h3 className="font-semibold flex items-center gap-2"><SettingsIcon className="size-4" /> Automatisation</h3>

                                <div className="bg-indigo-50/50 p-4 rounded-lg border border-indigo-100 flex items-center justify-between">
                                    <div>
                                        <div className="font-medium text-indigo-900">Relance de Devis</div>
                                        <div className="text-xs text-indigo-700">Notification si un devis reste sans réponse.</div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type="number"
                                                className="w-16 text-center h-8"
                                                value={settings.relance_devis_days}
                                                onChange={(e) => handleChange("relance_devis_days", e.target.value)}
                                            />
                                            <span className="text-xs font-medium">jours</span>
                                        </div>
                                        <Switch
                                            checked={settings.relance_devis_active}
                                            onCheckedChange={(checked) => handleChange("relance_devis_active", checked)}
                                        />
                                    </div>
                                </div>

                                <div className="bg-indigo-50/50 p-4 rounded-lg border border-indigo-100 flex items-center justify-between">
                                    <div>
                                        <div className="font-medium text-indigo-900">Relance de Contrat</div>
                                        <div className="text-xs text-indigo-700">Alerte si un contrat n'est pas signé.</div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type="number"
                                                className="w-16 text-center h-8"
                                                value={settings.relance_contrat_days}
                                                onChange={(e) => handleChange("relance_contrat_days", e.target.value)}
                                            />
                                            <span className="text-xs font-medium">jours</span>
                                        </div>
                                        <Switch
                                            checked={settings.relance_contrat_active}
                                            onCheckedChange={(checked) => handleChange("relance_contrat_active", checked)}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2 border-t pt-4">
                                    <Label className="font-semibold text-slate-700">Message de confirmation</Label>
                                    <Textarea
                                        value={settings.msg_success}
                                        onChange={(e) => handleChange("msg_success", e.target.value)}
                                        placeholder="Merci ! Nous avons bien reçu votre demande..."
                                        rows={3}
                                    />
                                    <p className="text-[10px] text-slate-500 italic">Affiché après une réservation réussie.</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- TAB: DOCUMENTS --- */}
                <TabsContent value="documents">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><FileIcon className="size-5 text-indigo-500" /> Textes Légaux</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Instructions de Paiement</Label>
                                    <Textarea
                                        rows={4}
                                        placeholder="Merci de régler l'acompte sous 7 jours..."
                                        value={settings.mention_paiement}
                                        onChange={(e) => handleChange("mention_paiement", e.target.value)}
                                    />
                                    <p className="text-xs text-muted-foreground">Affiché sur les factures/devis.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label>Conditions Générales (CGV)</Label>
                                    <Textarea
                                        rows={8}
                                        value={settings.cgv_text}
                                        onChange={(e) => handleChange("cgv_text", e.target.value)}
                                        placeholder="Article 1..."
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><FileTextIcon className="size-5 text-indigo-500" /> Signature</CardTitle>
                            </CardHeader>
                            <CardContent className="flex flex-col items-center justify-center p-6 space-y-4">
                                <p className="text-sm text-center text-muted-foreground">Votre signature pour les documents.</p>
                                <div className="w-full h-32 bg-slate-50 border-2 border-dashed rounded-lg flex items-center justify-center overflow-hidden relative">
                                    {settings.signature_base64 ? (
                                        <img src={settings.signature_base64} alt="Signature" className="max-h-full max-w-full object-contain" />
                                    ) : (
                                        <span className="text-slate-400 italic text-sm">Aucune signature</span>
                                    )}
                                </div>
                                <div className="flex gap-2 w-full flex-col sm:flex-row">
                                    <Button variant="default" className="flex-1 bg-indigo-600 hover:bg-indigo-700 gap-2" onClick={() => setIsSigModalOpen(true)}>
                                        <PenToolIcon className="size-4" /> Dessiner
                                    </Button>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        ref={signatureInputRef}
                                        onChange={handleSignatureUpload}
                                    />
                                    <Button variant="outline" className="flex-1 gap-2" onClick={triggerSignatureInput}>
                                        <UploadIcon className="size-4" /> Importer
                                    </Button>
                                </div>
                                {settings.signature_base64 && (
                                    <Button variant="ghost" className="w-full text-red-500 hover:text-red-700 hover:bg-red-50 gap-2" onClick={removeSignature}>
                                        <TrashIcon className="size-4" /> Supprimer la signature
                                    </Button>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="md:col-span-2 shadow-sm border-indigo-100">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="flex items-center gap-2"><FileTextIcon className="size-5 text-indigo-500" /> Signature des devis</CardTitle>
                                <Switch
                                    checked={settings.feature_sign_quote}
                                    onCheckedChange={(checked) => handleChange("feature_sign_quote", checked)}
                                />
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    Permet au client de signer électroniquement ses devis en ligne ("Bon pour accord"). Cela transforme automatiquement le devis en contrat une fois signé.
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="md:col-span-2">
                            <CardHeader className="flex flex-row items-center justify-between border-b pb-4 mb-4">
                                <div className="space-y-1">
                                    <CardTitle className="flex items-center gap-2 font-bold"><PenToolIcon className="size-5 text-indigo-500" /> Annexe Optionnelle</CardTitle>
                                    <CardDescription>Ajoutez une page supplémentaire à vos contrats.</CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-indigo-600">Activer</span>
                                    <Switch
                                        checked={settings.annexe_active}
                                        onCheckedChange={(checked) => handleChange("annexe_active", checked)}
                                    />
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {settings.annexe_active && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                                        <div className="space-y-2">
                                            <Label>Titre de l'annexe</Label>
                                            <Input
                                                value={settings.annexe_titre}
                                                onChange={(e) => handleChange("annexe_titre", e.target.value)}
                                                placeholder="Ex: ANNEXE TECHNIQUE"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Texte de l'annexe</Label>
                                            <Textarea
                                                value={settings.annexe_texte}
                                                onChange={(e) => handleChange("annexe_texte", e.target.value)}
                                                rows={5}
                                                placeholder="Contenu de votre annexe..."
                                            />
                                        </div>
                                    </div>
                                )}
                                {!settings.annexe_active && (
                                    <p className="text-center text-sm text-muted-foreground italic py-8">
                                        L'annexe est désactivée. Activez-la pour configurer une page supplémentaire.
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>

            {/* Signature Dialog */}
            <Dialog open={isSigModalOpen} onOpenChange={setIsSigModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Dessinez votre signature</DialogTitle>
                        <DialogDescription>
                            Utilisez votre souris ou le doigt (mobile) pour signer ci-dessous.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="border-2 border-dashed border-indigo-200 rounded-xl bg-slate-50 touch-none overflow-hidden cursor-crosshair h-[200px] flex items-center justify-center">
                        <canvas
                            ref={canvasRef}
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            onTouchStart={startDrawing}
                            onTouchMove={draw}
                            onTouchEnd={stopDrawing}
                            className="bg-transparent"
                        />
                    </div>
                    <DialogFooter className="flex flex-row justify-between sm:justify-between items-center sm:space-x-2">
                        <Button variant="ghost" onClick={clearCanvas} className="text-red-500 hover:text-red-700 hover:bg-red-50 gap-2">
                            <EraserIcon className="size-4" /> Effacer
                        </Button>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setIsSigModalOpen(false)}>Annuler</Button>
                            <Button onClick={saveCanvasSignature}>Valider</Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
