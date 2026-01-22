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
import { BuildingIcon, FileTextIcon, SlidersIcon, CameraIcon, CreditCardIcon, FileIcon, SettingsIcon, CheckIcon, UploadIcon, PenToolIcon, TrashIcon, XIcon, EraserIcon, Loader2Icon, TagIcon, StarIcon, BoxIcon, TruckIcon, EyeIcon, PlusIcon, PlusCircleIcon, MailIcon, InfoIcon, CheckCircleIcon, ListIcon } from "lucide-react"
import { RichTextEditor } from "@/components/rich-text-editor"
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
    logo_url?: string
    logo_width?: number

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

    // Emails
    email_devis_subject: string
    email_devis_body: string
    email_contrat_subject: string
    email_contrat_body: string
    email_facture_subject: string
    email_facture_body: string
    enabled_email_tags?: string[]
    mail_templates?: { id: string; name: string; subject: string; body: string; type: "devis" | "contrat" | "facture" }[]
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
    logo_url: "",
    logo_width: 100,
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
    label_livraison: "Frais de déplacement",
    email_devis_subject: "Votre Devis - {{company_name}}",
    email_devis_body: "Bonjour {{client_name}},\n\nVoici le devis {{doc_number}} concernant votre événement.\n\nCordialement,\n{{company_name}}",
    email_contrat_subject: "Votre Contrat - {{company_name}}",
    email_contrat_body: "Bonjour {{client_name}},\n\nVoici le contrat {{doc_number}}. Merci de le signer pour valider la réservation.\n\nCordialement,\n{{company_name}}",
    email_facture_subject: "Votre Facture - {{company_name}}",
    email_facture_body: "Bonjour {{client_name}},\n\nVoici la facture {{doc_number}}.\n\nCordialement,\n{{company_name}}",
    enabled_email_tags: [
        "{{client_name}}",
        "{{doc_number}}",
        "{{company_name}}",
        "{{event_date}}",
        "{{event_location}}",
        "{{deposit_amount}}",
        "{{balance_amount}}",
        "{{company_logo}}"
    ],
    mail_templates: []
}

const ALL_TAGS = [
    { id: "{{client_name}}", label: "Nom du client" },
    { id: "{{client_phone}}", label: "Téléphone client" },
    { id: "{{client_email}}", label: "Email client" },
    { id: "{{client_address}}", label: "Adresse client" },
    { id: "{{doc_number}}", label: "Numéro document" },
    { id: "{{doc_type}}", label: "Type de document" },
    { id: "{{company_name}}", label: "Votre entreprise" },
    { id: "{{event_date}}", label: "Date événement" },
    { id: "{{event_time}}", label: "Heure début" },
    { id: "{{event_end_time}}", label: "Heure fin" },
    { id: "{{event_location}}", label: "Lieu événement" },
    { id: "{{total_amount}}", label: "Prix TTC" },
    { id: "{{deposit_amount}}", label: "Montant Acompte" },
    { id: "{{balance_amount}}", label: "Montant Solde" },
    { id: "{{company_logo}}", label: "Logo Entreprise" },
]


export default function PersonnalisationPage() {
    const [settings, setSettings] = useState<Settings>(defaultSettings)
    const [isSaved, setIsSaved] = useState(false)
    const [isSigModalOpen, setIsSigModalOpen] = useState(false)
    const [isTagsModalOpen, setIsTagsModalOpen] = useState(false)
    const [isMounted, setIsMounted] = useState(false)

    const logoInputRef = useRef<HTMLInputElement>(null)
    const signatureInputRef = useRef<HTMLInputElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [isDrawing, setIsDrawing] = useState(false)

    const [isLoading, setIsLoading] = useState(true)
    const [currentRecordId, setCurrentRecordId] = useState<number | null>(null)

    // Load from Supabase
    useEffect(() => {
        setIsMounted(true)
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

    // --- MAIL TEMPLATES ---
    const addMailTemplate = () => {
        const newTemplate = {
            id: Math.random().toString(36).substring(2, 9),
            name: "Nouveau template",
            subject: "Sujet du mail",
            body: "Corps du mail...",
            type: "devis" as const
        }
        setSettings(prev => ({
            ...prev,
            mail_templates: [...(prev.mail_templates || []), newTemplate]
        }))
    }

    const removeMailTemplate = (id: string) => {
        setSettings(prev => ({
            ...prev,
            mail_templates: (prev.mail_templates || []).filter(t => t.id !== id)
        }))
    }

    const handleMailTemplateChange = (id: string, field: string, value: any) => {
        setSettings(prev => ({
            ...prev,
            mail_templates: (prev.mail_templates || []).map(t => t.id === id ? { ...t, [field]: value } : t)
        }))
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
    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            // Upload to Supabase Storage
            const fileExt = file.name.split('.').pop()
            const fileName = `logo-${Date.now()}.${fileExt}`
            const filePath = `${fileName}`

            // 1. Upload
            const { error: uploadError } = await supabase.storage
                .from('assets')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                })

            if (uploadError) {
                console.error("Upload error:", uploadError)
                alert(`Erreur upload: ${uploadError.message}. Assurez-vous d'avoir créé le bucket 'assets' en Public dans Supabase.`)
                return
            }

            // 2. Get Public URL
            const { data } = supabase.storage
                .from('assets')
                .getPublicUrl(filePath)

            if (data?.publicUrl) {
                handleChange("logo_url", data.publicUrl)
            }

        } catch (error) {
            console.error("Logo upload failed", error)
            alert("Erreur imprévue lors de l'upload.")
        }
    }

    const triggerLogoInput = () => logoInputRef.current?.click()
    const removeLogo = () => {
        handleChange("logo_base64", undefined)
        handleChange("logo_url", undefined)
    }

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
                    <p className="text-sm text-muted-foreground">Configurez votre identité, vos prix et vos documents.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    {isLoading && <Loader2Icon className="size-4 animate-spin text-muted-foreground mr-2" />}
                    <Button variant="outline" size="sm" onClick={exportData} title="Exporter les données (Backup)" className="flex-1 md:flex-none">
                        <UploadIcon className="size-4 md:mr-2 rotate-180" /> <span className="hidden md:inline">Exporter</span>
                    </Button>
                    <div className="relative flex-1 md:flex-none">
                        <input type="file" accept=".json" onChange={importData} className="hidden" id="import-btn" />
                        <Button variant="outline" size="sm" asChild className="w-full">
                            <label htmlFor="import-btn" className="cursor-pointer flex items-center justify-center">
                                <UploadIcon className="size-4 md:mr-2" /> <span className="hidden md:inline">Importer</span>
                            </label>
                        </Button>
                    </div>
                    <Button onClick={handleSave} size="sm" className="gap-2 shadow-lg hover:shadow-xl transition-all flex-1 md:flex-none" disabled={isLoading}>
                        {isSaved ? <CheckIcon className="size-4" /> : <SettingsIcon className="size-4" />}
                        {isSaved ? "Enregistré !" : <span className="">Enregistrer</span>}
                    </Button>
                </div>
            </div>

            {!isMounted ? (
                <div className="flex justify-center py-20">
                    <Loader2Icon className="size-8 animate-spin text-indigo-600" />
                </div>
            ) : (
                <Tabs defaultValue="identite" className="w-full space-y-6">
                    <TabsList className="bg-white p-1 border h-auto flex-nowrap justify-start overflow-x-auto no-scrollbar w-full">
                        <TabsTrigger value="identite" className="shrink-0 gap-2 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600">
                            <BuildingIcon className="size-4" /> Identité
                        </TabsTrigger>
                        <TabsTrigger value="emails" className="shrink-0 gap-2 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600">
                            <MailIcon className="size-4" /> Emails
                        </TabsTrigger>
                        <TabsTrigger value="finance" className="shrink-0 gap-2 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600">
                            <CreditCardIcon className="size-4" /> Finance
                        </TabsTrigger>
                        <TabsTrigger value="catalogue" className="shrink-0 gap-2 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600">
                            <TagIcon className="size-4" /> Catalogue
                        </TabsTrigger>
                        <TabsTrigger value="workflow" className="shrink-0 gap-2 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600">
                            <SlidersIcon className="size-4" /> Workflow
                        </TabsTrigger>
                        <TabsTrigger value="documents" className="shrink-0 gap-2 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600">
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
                                        {settings.logo_url || settings.logo_base64 ? (
                                            <img src={settings.logo_url || settings.logo_base64} alt="Logo" className="max-h-full max-w-full object-contain" />
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
                                        {(settings.logo_url || settings.logo_base64) && (
                                            <Button variant="ghost" className="w-full text-red-500 hover:text-red-700 hover:bg-red-50 gap-2" onClick={removeLogo}>
                                                <TrashIcon className="size-4" /> Supprimer
                                            </Button>
                                        )}
                                    </div>

                                    {(settings.logo_url || settings.logo_base64) && (
                                        <div className="w-full mt-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                            <Label className="text-xs font-semibold mb-2 block">Taille du logo (pixels)</Label>
                                            <div className="flex items-center gap-3">
                                                <Input
                                                    type="number"
                                                    value={settings.logo_width || 100}
                                                    onChange={(e) => handleChange("logo_width", parseInt(e.target.value) || 0)}
                                                    className="h-8 w-24"
                                                    min="20"
                                                    max="500"
                                                />
                                                <span className="text-xs text-muted-foreground whitespace-nowrap">px de large</span>
                                            </div>
                                        </div>
                                    )}

                                    <p className="text-xs text-muted-foreground mt-2 text-center">Format PNG recommandé.</p>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* --- TAB: EMAILS --- */}
                    <TabsContent value="emails">
                        <Card className="mb-6 bg-blue-50/50 border-blue-100">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="flex items-center gap-2 text-blue-800 text-base"><CameraIcon className="size-5 text-blue-500" /> Variables Disponibles</CardTitle>
                                <Button variant="outline" size="sm" onClick={() => setIsTagsModalOpen(true)} className="h-8 gap-2 border-blue-200 text-blue-700 hover:bg-blue-100">
                                    <SettingsIcon className="size-3" /> Gérer les balises
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <p className="text-xs text-blue-600 mb-3 flex items-center gap-1">
                                    <InfoIcon className="size-3" />
                                    Glissez-déposez ces variables dans les champs ci-dessous pour les insérer.
                                </p>
                                <div className="flex flex-wrap gap-2 text-sm">
                                    {ALL_TAGS.filter(tag => (settings.enabled_email_tags || []).includes(tag.id)).map(tag => (
                                        <div
                                            key={tag.id}
                                            draggable
                                            onDragStart={(e) => e.dataTransfer.setData("text/plain", tag.id)}
                                            className="bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-full font-semibold border border-indigo-200 cursor-grab active:cursor-grabbing hover:bg-indigo-200 hover:shadow-sm transition-all select-none"
                                            title="Glisser pour insérer"
                                        >
                                            {tag.label}
                                        </div>
                                    ))}
                                    {(settings.enabled_email_tags || []).length === 0 && (
                                        <p className="text-xs italic text-blue-400 py-2">Aucune balise activée. Cliquez sur "Gérer les balises" pour en ajouter.</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* DEVIS */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-indigo-700">
                                        <FileTextIcon className="size-5" /> Email Devis
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Sujet</Label>
                                        <Input
                                            value={settings.email_devis_subject}
                                            onChange={(e) => handleChange("email_devis_subject", e.target.value)}
                                            placeholder="Sujet du mail..."
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Message (HTML)</Label>
                                        <RichTextEditor
                                            value={settings.email_devis_body || ""}
                                            onChange={(html) => handleChange("email_devis_body", html)}
                                            placeholder="Corps du mail..."
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* CONTRAT */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-purple-700">
                                        <FileIcon className="size-5" /> Email Contrat
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Sujet</Label>
                                        <Input
                                            value={settings.email_contrat_subject}
                                            onChange={(e) => handleChange("email_contrat_subject", e.target.value)}
                                            placeholder="Sujet du mail..."
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Message (HTML)</Label>
                                        <RichTextEditor
                                            value={settings.email_contrat_body || ""}
                                            onChange={(html) => handleChange("email_contrat_body", html)}
                                            placeholder="Corps du mail..."
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* FACTURE */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-emerald-700">
                                        <CreditCardIcon className="size-5" /> Email Facture
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Sujet</Label>
                                        <Input
                                            value={settings.email_facture_subject}
                                            onChange={(e) => handleChange("email_facture_subject", e.target.value)}
                                            placeholder="Sujet du mail..."
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Message (HTML)</Label>
                                        <RichTextEditor
                                            value={settings.email_facture_body || ""}
                                            onChange={(html) => handleChange("email_facture_body", html)}
                                            placeholder="Corps du mail..."
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* --- MAIL TEMPLATES SECTION --- */}
                        <div className="mt-12 space-y-6">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div>
                                    <h3 className="text-lg font-bold flex items-center gap-2">
                                        <ListIcon className="size-5 text-indigo-600" />
                                        Modèles d'emails additionnels
                                    </h3>
                                    <p className="text-sm text-muted-foreground">Créez des variantes pour vos différents besoins.</p>
                                </div>
                                <Button onClick={addMailTemplate} size="sm" variant="outline" className="gap-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50">
                                    <PlusIcon className="size-4" /> Ajouter un modèle
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {(settings.mail_templates || []).map((template) => (
                                    <Card key={template.id} className="border-indigo-100 shadow-sm hover:shadow-md transition-all group overflow-hidden">
                                        <div className="h-1.5 w-full bg-indigo-500" />
                                        <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                                            <div className="space-y-1 w-full mr-4">
                                                <Input
                                                    value={template.name}
                                                    onChange={(e) => handleMailTemplateChange(template.id, "name", e.target.value)}
                                                    className="h-8 font-bold border-none p-0 focus-visible:ring-0 text-indigo-900 bg-transparent"
                                                    placeholder="Nom du modèle"
                                                />
                                                <div className="flex items-center gap-1.5 pt-1">
                                                    <select
                                                        value={template.type}
                                                        onChange={(e) => handleMailTemplateChange(template.id, "type", e.target.value)}
                                                        className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded outline-none border-none cursor-pointer"
                                                    >
                                                        <option value="devis">Devis</option>
                                                        <option value="contrat">Contrat</option>
                                                        <option value="facture">Facture</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-slate-300 hover:text-red-500 h-8 w-8 -mr-2"
                                                onClick={() => removeMailTemplate(template.id)}
                                            >
                                                <TrashIcon className="size-4" />
                                            </Button>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] uppercase font-bold text-slate-400">Sujet</Label>
                                                <Input
                                                    value={template.subject}
                                                    onChange={(e) => handleMailTemplateChange(template.id, "subject", e.target.value)}
                                                    className="h-8 text-xs bg-slate-50/50"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] uppercase font-bold text-slate-400">Message (HTML)</Label>
                                                <RichTextEditor
                                                    value={template.body || ""}
                                                    onChange={(html) => handleMailTemplateChange(template.id, "body", html)}
                                                    placeholder="Corps du mail..."
                                                />
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}

                                {(settings.mail_templates || []).length === 0 && (
                                    <div className="md:col-span-2 lg:col-span-3 py-12 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center bg-slate-50/50">
                                        <MailIcon className="size-10 text-slate-200 mb-3" />
                                        <p className="text-slate-400 font-medium">Aucun modèle additionnel créé.</p>
                                        <p className="text-slate-400 text-xs">Cliquez sur le bouton "Ajouter" pour créer un nouveau modèle.</p>
                                    </div>
                                )}
                            </div>
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
                                                    <RadioGroupItem value="percent" id="r1" />
                                                    <Label htmlFor="r1" className="cursor-pointer">Pourcent (%)</Label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <RadioGroupItem value="fixed" id="r2" />
                                                    <Label htmlFor="r2" className="cursor-pointer">Fixe (€)</Label>
                                                </div>
                                            </RadioGroup>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type="number"
                                                value={settings.acompte_valeur}
                                                onChange={(e) => handleChange("acompte_valeur", e.target.value)}
                                                className="w-24 font-bold"
                                            />
                                            <span className="text-sm font-medium">{settings.acompte_type === 'percent' ? '%' : '€'}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* --- TAB: CATALOGUE --- */}
                    <TabsContent value="catalogue">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card>
                                <CardHeader>
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="flex items-center gap-2"><BoxIcon className="size-5 text-indigo-500" /> Vos Offres (Packs)</CardTitle>
                                        <Button onClick={addOffer} size="sm" variant="outline" className="h-8 gap-1">
                                            <PlusIcon className="size-3" /> Ajouter
                                        </Button>
                                    </div>
                                    <CardDescription>Liste des forfaits principaux.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {settings.offres.map((offre, index) => (
                                        <div key={index} className="flex gap-2 items-end p-3 bg-slate-50 rounded-lg border border-slate-100 group">
                                            <div className="flex-1 space-y-1.5">
                                                <Label className="text-xs">Nom du pack</Label>
                                                <Input value={offre.name} onChange={(e) => handleOfferChange(index, "name", e.target.value)} placeholder="Ex: Pack Mariage" />
                                            </div>
                                            <div className="w-24 space-y-1.5">
                                                <Label className="text-xs">Prix (€)</Label>
                                                <Input type="number" value={offre.price} onChange={(e) => handleOfferChange(index, "price", e.target.value)} placeholder="0" />
                                            </div>
                                            <Button variant="ghost" size="icon" className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeOffer(index)}>
                                                <TrashIcon className="size-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="flex items-center gap-2"><StarIcon className="size-5 text-amber-500" /> Options (Extras)</CardTitle>
                                        <Button onClick={addOption} size="sm" variant="outline" className="h-8 gap-1">
                                            <PlusIcon className="size-3" /> Ajouter
                                        </Button>
                                    </div>
                                    <CardDescription>Suppléments que le client peut choisir.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="bg-indigo-50 p-4 rounded-lg mb-4 flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label className="text-indigo-900">Libellé Frais de Livraison</Label>
                                            <p className="text-[10px] text-indigo-600">Comment appeler les frais de déplacement.</p>
                                        </div>
                                        <Input
                                            value={settings.label_livraison}
                                            onChange={(e) => handleChange("label_livraison", e.target.value)}
                                            className="w-48 bg-white border-indigo-100"
                                        />
                                    </div>

                                    {settings.options.map((option, index) => (
                                        <div key={index} className="space-y-3 p-3 bg-slate-50 rounded-lg border border-slate-100 group">
                                            <div className="flex gap-2 items-end">
                                                <div className="flex-1 space-y-1.5">
                                                    <Input value={option.name} onChange={(e) => handleOptionChange(index, "name", e.target.value)} placeholder="Nom de l'option" />
                                                </div>
                                                <div className="w-24 space-y-1.5">
                                                    <Input type="number" value={option.price} onChange={(e) => handleOptionChange(index, "price", e.target.value)} placeholder="0" />
                                                </div>
                                                <Button variant="ghost" size="icon" className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeOption(index)}>
                                                    <TrashIcon className="size-4" />
                                                </Button>
                                            </div>
                                            <div className="flex items-center gap-2 px-1">
                                                <Switch
                                                    id={`public-${index}`}
                                                    checked={option.public}
                                                    onCheckedChange={(val) => handleOptionChange(index, "public", val)}
                                                    className="scale-75"
                                                />
                                                <Label htmlFor={`public-${index}`} className="text-[11px] text-muted-foreground cursor-pointer">Visible sur le questionnaire client</Label>
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* --- TAB: WORKFLOW --- */}
                    <TabsContent value="workflow">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><SlidersIcon className="size-5 text-indigo-500" /> Étapes du Dossier</CardTitle>
                                <CardDescription>Personnalisez les étapes de votre pipeline commercial.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 max-w-lg">
                                {settings.workflow_steps.map((step, index) => (
                                    <div key={index} className="flex gap-3 items-center">
                                        <div className="size-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">{index + 1}</div>
                                        <Input
                                            value={step}
                                            onChange={(e) => handleWorkflowStepChange(index, e.target.value)}
                                        />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-red-400"
                                            onClick={() => {
                                                const newSteps = settings.workflow_steps.filter((_, i) => i !== index)
                                                handleChange("workflow_steps", newSteps)
                                            }}
                                        >
                                            <XIcon className="size-4" />
                                        </Button>
                                    </div>
                                ))}
                                <Button
                                    variant="outline"
                                    className="w-full border-dashed"
                                    onClick={() => handleChange("workflow_steps", [...settings.workflow_steps, "Nouvelle étape"])}
                                >
                                    <PlusIcon className="size-4 mr-2" /> Ajouter une étape
                                </Button>

                                <Separator className="my-6" />

                                <div className="space-y-4">
                                    <Label className="font-bold flex items-center gap-2"><CheckCircleIcon className="size-4 text-emerald-500" /> Message de Confirmation</Label>
                                    <CardDescription>Affiché au client après la signature du contrat ou validation du questionnaire.</CardDescription>
                                    <Textarea
                                        value={settings.msg_success}
                                        onChange={(e) => handleChange("msg_success", e.target.value)}
                                        placeholder="Merci ! Votre réservation est bien confirmée..."
                                        rows={4}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* --- TAB: DOCUMENTS --- */}
                    <TabsContent value="documents">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><FileTextIcon className="size-5 text-indigo-500" /> Mentions Légales</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="space-y-2">
                                        <Label>Mention TVA (Pied de facture)</Label>
                                        <Input value={settings.mention_tva} onChange={(e) => handleChange("mention_tva", e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Conditions de Paiement / Retard</Label>
                                        <Textarea value={settings.mention_paiement} onChange={(e) => handleChange("mention_paiement", e.target.value)} rows={3} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Pied de page (Facture / Devis)</Label>
                                        <Input value={settings.footer_facture} onChange={(e) => handleChange("footer_facture", e.target.value)} placeholder="Ex: SARL au capital de 1000€..." />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><PenToolIcon className="size-5 text-indigo-500" /> Signature & CGV</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="bg-slate-50 p-4 rounded-lg border space-y-4">
                                        <div className="flex items-center justify-between">
                                            <Label className="font-semibold text-indigo-900">Activer Signature en ligne</Label>
                                            <Switch
                                                checked={settings.feature_sign_quote}
                                                onCheckedChange={(checked) => handleChange("feature_sign_quote", checked)}
                                            />
                                        </div>

                                        <Label className="block pt-2">Votre Signature par défaut</Label>
                                        <div className="h-32 bg-white border border-dashed rounded flex items-center justify-center mb-2 overflow-hidden relative group">
                                            {settings.signature_base64 ? (
                                                <>
                                                    <img src={settings.signature_base64} alt="Signature" className="max-h-full max-w-full object-contain" />
                                                    <Button variant="destructive" size="icon" className="absolute top-1 right-1 size-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={removeSignature}>
                                                        <TrashIcon className="size-3" />
                                                    </Button>
                                                </>
                                            ) : (
                                                <span className="text-slate-300 text-xs italic">Aucune signature enregistrée</span>
                                            )}
                                        </div>

                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm" className="flex-1 gap-2" onClick={() => setIsSigModalOpen(true)}>
                                                <PenToolIcon className="size-3" /> Dessiner
                                            </Button>
                                            <Button variant="outline" size="sm" className="flex-1 gap-2" onClick={triggerSignatureInput}>
                                                <UploadIcon className="size-3" /> Importer
                                            </Button>
                                            <input type="file" accept="image/*" ref={signatureInputRef} onChange={handleSignatureUpload} className="hidden" />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Conditions Générales de Vente (CGV)</Label>
                                        <Textarea
                                            value={settings.cgv_text}
                                            onChange={(e) => handleChange("cgv_text", e.target.value)}
                                            rows={8}
                                            className="text-xs font-mono"
                                            placeholder="Texte complet de vos CGV qui apparaîtra sur le contrat..."
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="md:col-span-2">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <ListIcon className="size-5 text-indigo-500" />
                                            <CardTitle>Annexe (Questionnaire Client)</CardTitle>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Label htmlFor="annexe-active">Activer</Label>
                                            <Switch
                                                id="annexe-active"
                                                checked={settings.annexe_active}
                                                onCheckedChange={(v) => handleChange("annexe_active", v)}
                                            />
                                        </div>
                                    </div>
                                    <CardDescription>Le client peut remplir ces informations lors de la signature.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Titre de l'annexe</Label>
                                        <Input
                                            value={settings.annexe_titre}
                                            onChange={(e) => handleChange("annexe_titre", e.target.value)}
                                            placeholder="Ex: INFORMATIONS LOGISTIQUES"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Contenu / Consignes de l'annexe</Label>
                                        <Textarea
                                            value={settings.annexe_texte}
                                            onChange={(e) => handleChange("annexe_texte", e.target.value)}
                                            rows={5}
                                            placeholder="Veuillez préciser l'étage, l'accès parking, etc..."
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            )}

            {/* Signature Draw Modal */}
            <Dialog open={isSigModalOpen} onOpenChange={setIsSigModalOpen}>
                <DialogContent className="sm:max-w-[450px]">
                    <DialogHeader>
                        <DialogTitle>Dessiner votre signature</DialogTitle>
                    </DialogHeader>
                    <div className="bg-white border rounded-lg overflow-hidden touch-none p-4">
                        <canvas
                            ref={canvasRef}
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            onTouchStart={startDrawing}
                            onTouchMove={draw}
                            onTouchEnd={stopDrawing}
                            className="w-full h-[200px] border border-dashed border-slate-200 bg-slate-50 rounded"
                        />
                    </div>
                    <DialogFooter className="flex gap-2">
                        <Button variant="ghost" className="gap-2" onClick={clearCanvas}>
                            <EraserIcon className="size-4" /> Effacer
                        </Button>
                        <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2" onClick={saveCanvasSignature}>
                            <CheckIcon className="size-4" /> Enregistrer la signature
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {/* Modal: Gérer les balises */}
            <Dialog open={isTagsModalOpen} onOpenChange={setIsTagsModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Gérer les balises email</DialogTitle>
                        <DialogDescription>
                            Sélectionnez les variables que vous souhaitez voir apparaître dans votre barre d'outils personnalisation.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-1 gap-3 py-4 max-h-[60vh] overflow-y-auto pr-2">
                        {ALL_TAGS.map((tag) => {
                            const isEnabled = (settings.enabled_email_tags || []).includes(tag.id);
                            return (
                                <div
                                    key={tag.id}
                                    className={`flex items-center justify-between p-3 rounded-lg border transition-all ${isEnabled ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-slate-50 border-slate-100 opacity-60'}`}
                                >
                                    <div className="flex flex-col">
                                        <span className={`text-sm font-bold ${isEnabled ? 'text-indigo-900' : 'text-slate-500'}`}>{tag.label}</span>
                                        <code className="text-[10px] text-slate-400">{tag.id}</code>
                                    </div>
                                    <Switch
                                        checked={isEnabled}
                                        onCheckedChange={(checked) => {
                                            const current = settings.enabled_email_tags || [];
                                            if (checked) {
                                                handleChange("enabled_email_tags", [...current, tag.id]);
                                            } else {
                                                handleChange("enabled_email_tags", current.filter(id => id !== tag.id));
                                            }
                                        }}
                                    />
                                </div>
                            );
                        })}
                    </div>

                    <DialogFooter>
                        <Button onClick={() => setIsTagsModalOpen(false)} className="w-full bg-indigo-600 hover:bg-indigo-700"> Terminer </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
