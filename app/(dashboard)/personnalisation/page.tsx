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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
    rib_text?: string
    rib_url?: string

    // Catalogue
    offres: { name: string; price: string }[]
    options: { name: string; price: string; public: boolean }[]
    label_livraison: string

    // Emails
    email_devis_name?: string
    email_devis_subject: string
    email_devis_body: string
    email_contrat_name?: string
    email_contrat_subject: string
    email_contrat_body: string
    email_facture_name?: string
    email_facture_subject: string
    email_facture_body: string
    email_signature_name?: string
    email_signature_subject: string
    email_signature_body: string
    enabled_email_tags?: string[]
    mail_templates?: { id: string; name: string; subject: string; body: string; type: "devis" | "contrat" | "facture" | "signature" }[]
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
    rib_text: "",
    rib_url: "",
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
    email_devis_name: "Modèle standard Devis",
    email_devis_subject: "Votre Devis - {{company_name}}",
    email_devis_body: "Bonjour {{client_name}},\n\nVoici le devis {{doc_number}} concernant votre événement.\n\nCordialement,\n{{company_name}}",
    email_contrat_name: "Modèle standard Contrat",
    email_contrat_subject: "Votre Contrat - {{company_name}}",
    email_contrat_body: "Bonjour {{client_name}},\n\nVoici le contrat {{doc_number}}. Merci de le signer pour valider la réservation.\n\nCordialement,\n{{company_name}}",
    email_facture_name: "Modèle standard Facture",
    email_facture_subject: "Votre Facture - {{company_name}}",
    email_facture_body: "Bonjour {{client_name}},\n\nVoici la facture {{doc_number}}.\n\nCordialement,\n{{company_name}}",
    email_signature_name: "Confirmation de signature",
    email_signature_subject: "Contrat signé - {{company_name}}",
    email_signature_body: "Bonjour {{client_name}},\n\nNous vous confirmons que votre contrat {{doc_number}} a bien été signé électroniquement.\n\nDate de l'événement : {{event_date}}\nLieu : {{event_location}}\n\nMerci pour votre confiance !\n\nCordialement,\n{{company_name}}",
    enabled_email_tags: [
        "{{client_name}}",
        "{{doc_number}}",
        "{{company_name}}",
        "{{event_date}}",
        "{{event_location}}",
        "{{deposit_amount}}",
        "{{balance_amount}}",
        "{{company_logo}}",
        "{{signature_date}}",
        "{{signature_link}}"
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
    { id: "{{signature_date}}", label: "Date de signature" },
    { id: "{{signature_link}}", label: "Lien de signature" },
]


export default function PersonnalisationPage() {
    const [settings, setSettings] = useState<Settings>(defaultSettings)
    const [isSaved, setIsSaved] = useState(false)
    const [isSigModalOpen, setIsSigModalOpen] = useState(false)
    const [isTagsModalOpen, setIsTagsModalOpen] = useState(false)
    const [isMounted, setIsMounted] = useState(false)
    const [activeDevisTemplate, setActiveDevisTemplate] = useState("devis-default")
    const [activeContratTemplate, setActiveContratTemplate] = useState("contrat-default")
    const [activeFactureTemplate, setActiveFactureTemplate] = useState("facture-default")
    const [activeSignatureTemplate, setActiveSignatureTemplate] = useState("signature-default")

    const logoInputRef = useRef<HTMLInputElement>(null)
    const ribInputRef = useRef<HTMLInputElement>(null)
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
                const loadedData = record.data || {}

                // CRITICAL: Merge email tags to ensure NEW standard tags are enabled for existing users
                const mergedTags = [...new Set([
                    ...(defaultSettings.enabled_email_tags || []),
                    ...(loadedData.enabled_email_tags || [])
                ])]

                setCurrentRecordId(record.id)
                setSettings({
                    ...defaultSettings,
                    ...loadedData,
                    enabled_email_tags: mergedTags
                })
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
    const addMailTemplate = (type: "devis" | "contrat" | "facture" | "signature" = "devis") => {
        const typeLabels = {
            devis: "Modèle Devis",
            contrat: "Modèle Contrat",
            facture: "Modèle Facture",
            signature: "Modèle Signature"
        }
        const newTemplate = {
            id: Math.random().toString(36).substring(2, 9),
            name: typeLabels[type],
            subject: "Sujet du mail",
            body: "Corps du mail...",
            type: type as "devis" | "contrat" | "facture" | "signature"
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

    // --- RIB UPLOAD ---
    const handleRibUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `rib-${Date.now()}.${fileExt}`
            const filePath = `${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('assets')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                })

            if (uploadError) throw uploadError

            const { data } = supabase.storage
                .from('assets')
                .getPublicUrl(filePath)

            if (data?.publicUrl) {
                handleChange("rib_url", data.publicUrl)
            }
        } catch (error: any) {
            console.error("RIB upload failed", error)
            alert(`Erreur upload RIB: ${error.message}`)
        }
    }

    const triggerRibInput = () => ribInputRef.current?.click()
    const removeRib = () => handleChange("rib_url", undefined)

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
            {!isMounted ? (
                <div className="flex justify-center py-20">
                    <Loader2Icon className="size-8 animate-spin text-indigo-600" />
                </div>
            ) : (
                <Tabs defaultValue="identite" className="w-full space-y-0">
                    <div className="sticky top-0 z-30 bg-[#f1f5f9] pb-2 border-b-0 space-y-4">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pt-4 px-1 bg-[#f1f5f9]">
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

                        <TabsList className="bg-white p-1 border h-auto flex flex-nowrap justify-start overflow-x-auto no-scrollbar w-full shadow-sm rounded-lg">
                            <TabsTrigger value="identite" className="shrink-0 gap-2 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600 px-4 py-2.5 text-xs sm:text-sm font-semibold">
                                <BuildingIcon className="size-4" /> <span className="hidden md:inline">Identité</span>
                            </TabsTrigger>
                            <TabsTrigger value="emails" className="shrink-0 gap-2 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600 px-4 py-2.5 text-xs sm:text-sm font-semibold">
                                <MailIcon className="size-4" /> <span className="hidden md:inline">Emails</span>
                            </TabsTrigger>
                            <TabsTrigger value="finance" className="shrink-0 gap-2 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600 px-4 py-2.5 text-xs sm:text-sm font-semibold">
                                <CreditCardIcon className="size-4" /> <span className="hidden md:inline">Finance</span>
                            </TabsTrigger>
                            <TabsTrigger value="catalogue" className="shrink-0 gap-2 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600 px-4 py-2.5 text-xs sm:text-sm font-semibold">
                                <TagIcon className="size-4" /> <span className="hidden md:inline">Catalogue</span>
                            </TabsTrigger>
                            <TabsTrigger value="workflow" className="shrink-0 gap-2 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600 px-4 py-2.5 text-xs sm:text-sm font-semibold">
                                <SlidersIcon className="size-4" /> <span className="hidden md:inline">Workflow</span>
                            </TabsTrigger>
                            <TabsTrigger value="documents" className="shrink-0 gap-2 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600 px-4 py-2.5 text-xs sm:text-sm font-semibold">
                                <FileTextIcon className="size-4" /> <span className="hidden md:inline">Documents</span>
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="pt-0">

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
                        <TabsContent value="emails" className="mt-2">
                            <div className="flex flex-col lg:flex-row gap-3 sm:gap-8 items-start relative">
                                {/* Left: Main Content (Large Editor Area) */}
                                <div className="flex-1 min-w-0 w-full">
                                    <Tabs defaultValue="devis" className="w-full">
                                        <TabsList className="grid grid-cols-4 mb-3 sm:mb-4 bg-slate-100 p-1 h-9 sm:h-10 rounded-xl">
                                            <TabsTrigger value="devis" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm gap-1.5 font-bold text-[10px] sm:text-xs">
                                                <FileTextIcon className="size-4 sm:size-3.5" /> <span className="hidden md:inline">Devis</span>
                                            </TabsTrigger>
                                            <TabsTrigger value="contrat" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-sm gap-1.5 font-bold text-[10px] sm:text-xs">
                                                <FileIcon className="size-4 sm:size-3.5" /> <span className="hidden md:inline">Contrat</span>
                                            </TabsTrigger>
                                            <TabsTrigger value="facture" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm gap-1.5 font-bold text-[10px] sm:text-xs">
                                                <CreditCardIcon className="size-4 sm:size-3.5" /> <span className="hidden md:inline">Facture</span>
                                            </TabsTrigger>
                                            <TabsTrigger value="signature" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-pink-600 data-[state=active]:shadow-sm gap-1.5 font-bold text-[10px] sm:text-xs">
                                                <PenToolIcon className="size-4 sm:size-3.5" /> <span className="hidden md:inline">Signature</span>
                                            </TabsTrigger>
                                        </TabsList>

                                        {/* DEVIS TAB */}
                                        <TabsContent value="devis" className="space-y-6">
                                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b pb-2 mb-3 gap-3">
                                                <div className="order-1 sm:order-none">
                                                    <h3 className="text-sm font-bold text-indigo-900 uppercase tracking-tight">E-mails Devis</h3>
                                                    <p className="text-[10px] text-slate-500 hidden sm:block">Envoyés avec vos propositions commerciales.</p>
                                                </div>
                                                <div className="flex items-center gap-2 w-full sm:w-auto order-2 sm:order-none">
                                                    <Select value={activeDevisTemplate} onValueChange={setActiveDevisTemplate}>
                                                        <SelectTrigger className="w-full sm:w-[130px] bg-white border-indigo-200 text-indigo-700 font-bold h-8 text-xs">
                                                            <SelectValue placeholder="Choisir un modèle..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="devis-default" className="font-bold text-indigo-700">
                                                                {settings.email_devis_name || "PAR DÉFAUT"}
                                                            </SelectItem>
                                                            {(settings.mail_templates || []).filter(t => t.type === "devis").map(template => (
                                                                <SelectItem key={template.id} value={template.id} className="font-bold text-indigo-700 uppercase">
                                                                    {template.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <Button onClick={() => addMailTemplate("devis")} size="sm" className="h-8 text-[10px] sm:text-xs bg-indigo-600 hover:bg-indigo-700 font-bold gap-1 shrink-0 px-3">
                                                        <PlusIcon className="size-3" /> <span className="hidden sm:inline">Ajouter</span><span className="sm:hidden">Ajouter</span>
                                                    </Button>
                                                </div>
                                            </div>

                                            <Tabs value={activeDevisTemplate} onValueChange={setActiveDevisTemplate} className="w-full">

                                                <TabsContent value="devis-default" className="mt-0">
                                                    <Card className="border-indigo-200 shadow-md relative overflow-hidden ring-2 ring-indigo-500/10 min-h-[300px]">
                                                        <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-md uppercase">Par Défaut</div>
                                                        <CardContent className="p-2 sm:p-4 space-y-2 sm:space-y-3">
                                                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                                                <Label className="shrink-0 text-[10px] sm:text-xs text-slate-500 uppercase font-bold sm:font-semibold pl-1 sm:pl-0">Nom du modèle :</Label>
                                                                <Input
                                                                    value={settings.email_devis_name}
                                                                    onChange={(e) => handleChange("email_devis_name", e.target.value)}
                                                                    className="h-8 bg-white border-dashed border-indigo-200 text-xs sm:text-sm font-medium w-full"
                                                                    placeholder="Nom du modèle"
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sujet de l&apos;email</Label>
                                                                <RichTextEditor
                                                                    value={settings.email_devis_subject}
                                                                    onChange={(html) => handleChange("email_devis_subject", html)}
                                                                    singleLine={true}
                                                                    placeholder="Sujet de l'email..."
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Message</Label>
                                                                <RichTextEditor
                                                                    value={settings.email_devis_body || ""}
                                                                    onChange={(html) => handleChange("email_devis_body", html)}
                                                                />
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                </TabsContent>

                                                {(settings.mail_templates || []).filter(t => t.type === "devis").map((template) => (
                                                    <TabsContent key={template.id} value={template.id} className="mt-0">
                                                        <Card className="border-indigo-200 shadow-md relative overflow-hidden ring-2 ring-indigo-500/10 min-h-[300px]">
                                                            <CardContent className="p-2 sm:p-4 space-y-2 sm:space-y-3">
                                                                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                                                    <div className="flex items-center justify-between w-full sm:w-auto gap-2 flex-1">
                                                                        <Label className="shrink-0 text-[10px] sm:text-xs text-slate-500 uppercase font-bold sm:font-semibold pl-1 sm:pl-0">Nom du modèle :</Label>
                                                                        <Button variant="ghost" size="icon" className="text-slate-300 hover:text-red-500 h-6 w-6 sm:h-8 sm:w-8 shrink-0 sm:hidden" onClick={() => removeMailTemplate(template.id)}>
                                                                            <TrashIcon className="size-3 sm:size-4" />
                                                                        </Button>
                                                                    </div>
                                                                    <Input
                                                                        value={template.name}
                                                                        onChange={(e) => handleMailTemplateChange(template.id, "name", e.target.value)}
                                                                        className="h-8 bg-white border-dashed border-indigo-200 text-xs sm:text-sm font-medium w-full flex-1"
                                                                        placeholder="Nom du modèle"
                                                                    />
                                                                    <Button variant="ghost" size="icon" className="hidden sm:inline-flex text-slate-300 hover:text-red-500 h-8 w-8 shrink-0" onClick={() => removeMailTemplate(template.id)}>
                                                                        <TrashIcon className="size-4" />
                                                                    </Button>
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sujet de l&apos;email</Label>
                                                                    <RichTextEditor
                                                                        value={template.subject}
                                                                        onChange={(html) => handleMailTemplateChange(template.id, "subject", html)}
                                                                        singleLine={true}
                                                                        placeholder="Sujet de l'email..."
                                                                    />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Message</Label>
                                                                    <RichTextEditor
                                                                        value={template.body || ""}
                                                                        onChange={(html) => handleMailTemplateChange(template.id, "body", html)}
                                                                        minHeight="100px"
                                                                    />
                                                                </div>
                                                            </CardContent>
                                                        </Card>
                                                    </TabsContent>
                                                ))}
                                            </Tabs>
                                        </TabsContent>

                                        {/* CONTRAT TAB */}
                                        <TabsContent value="contrat" className="space-y-6">
                                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b pb-2 mb-3 gap-3">
                                                <div className="order-1 sm:order-none">
                                                    <h3 className="text-sm font-bold text-purple-900 uppercase tracking-tight">E-mails Contrat</h3>
                                                    <p className="text-[10px] text-slate-500 hidden sm:block">Envoyés pour signature et confirmation.</p>
                                                </div>
                                                <div className="flex items-center gap-2 w-full sm:w-auto order-2 sm:order-none">
                                                    <Select value={activeContratTemplate} onValueChange={setActiveContratTemplate}>
                                                        <SelectTrigger className="w-full sm:w-[130px] bg-white border-purple-200 text-purple-700 font-bold h-8 text-xs">
                                                            <SelectValue placeholder="Choisir un modèle..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="contrat-default" className="font-bold text-purple-700">
                                                                {settings.email_contrat_name || "PAR DÉFAUT"}
                                                            </SelectItem>
                                                            {(settings.mail_templates || []).filter(t => t.type === "contrat").map(template => (
                                                                <SelectItem key={template.id} value={template.id} className="font-bold text-purple-700 uppercase">
                                                                    {template.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <Button onClick={() => addMailTemplate("contrat")} size="sm" className="h-8 text-[10px] sm:text-xs bg-purple-600 hover:bg-purple-700 font-bold gap-1 shrink-0 px-3">
                                                        <PlusIcon className="size-3" /> <span className="hidden sm:inline">Ajouter</span><span className="sm:hidden">Ajouter</span>
                                                    </Button>
                                                </div>
                                            </div>

                                            <Tabs value={activeContratTemplate} onValueChange={setActiveContratTemplate} className="w-full">

                                                <TabsContent value="contrat-default" className="mt-0">
                                                    <Card className="border-purple-200 shadow-md relative overflow-hidden ring-2 ring-purple-500/10 min-h-[300px]">
                                                        <div className="absolute top-0 right-0 bg-purple-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-md uppercase">Par Défaut</div>
                                                        <CardContent className="p-2 sm:p-4 space-y-2 sm:space-y-3">
                                                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                                                <Label className="shrink-0 text-[10px] sm:text-xs text-slate-500 uppercase font-bold sm:font-semibold pl-1 sm:pl-0">Nom du modèle :</Label>
                                                                <Input
                                                                    value={settings.email_contrat_name}
                                                                    onChange={(e) => handleChange("email_contrat_name", e.target.value)}
                                                                    className="h-8 bg-white border-dashed border-purple-200 text-xs sm:text-sm font-medium w-full"
                                                                    placeholder="Nom du modèle"
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sujet de l&apos;email</Label>
                                                                <RichTextEditor
                                                                    value={settings.email_contrat_subject}
                                                                    onChange={(html) => handleChange("email_contrat_subject", html)}
                                                                    singleLine={true}
                                                                    theme="purple"
                                                                    placeholder="Sujet de l'email..."
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Message</Label>
                                                                <RichTextEditor
                                                                    value={settings.email_contrat_body || ""}
                                                                    onChange={(html) => handleChange("email_contrat_body", html)}
                                                                    theme="purple"
                                                                />
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                </TabsContent>

                                                {(settings.mail_templates || []).filter(t => t.type === "contrat").map((template) => (
                                                    <TabsContent key={template.id} value={template.id} className="mt-0">
                                                        <Card className="border-purple-200 shadow-md relative overflow-hidden ring-2 ring-purple-500/10 min-h-[300px]">
                                                            <CardContent className="p-2 sm:p-4 space-y-2 sm:space-y-3">
                                                                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                                                    <div className="flex items-center justify-between w-full sm:w-auto gap-2 flex-1">
                                                                        <Label className="shrink-0 text-[10px] sm:text-xs text-slate-500 uppercase font-bold sm:font-semibold pl-1 sm:pl-0">Nom du modèle :</Label>
                                                                        <Button variant="ghost" size="icon" className="text-slate-300 hover:text-red-500 h-6 w-6 sm:h-8 sm:w-8 shrink-0 sm:hidden" onClick={() => removeMailTemplate(template.id)}>
                                                                            <TrashIcon className="size-3 sm:size-4" />
                                                                        </Button>
                                                                    </div>
                                                                    <Input
                                                                        value={template.name}
                                                                        onChange={(e) => handleMailTemplateChange(template.id, "name", e.target.value)}
                                                                        className="h-8 bg-white border-dashed border-purple-200 text-xs sm:text-sm font-medium w-full flex-1"
                                                                        placeholder="Nom du modèle"
                                                                    />
                                                                    <Button variant="ghost" size="icon" className="hidden sm:inline-flex text-slate-300 hover:text-red-500 h-8 w-8 shrink-0" onClick={() => removeMailTemplate(template.id)}>
                                                                        <TrashIcon className="size-4" />
                                                                    </Button>
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sujet de l&apos;email</Label>
                                                                    <RichTextEditor
                                                                        value={template.subject}
                                                                        onChange={(html) => handleMailTemplateChange(template.id, "subject", html)}
                                                                        singleLine={true}
                                                                        theme="purple"
                                                                        placeholder="Sujet de l'email..."
                                                                    />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Message</Label>
                                                                    <RichTextEditor
                                                                        value={template.body || ""}
                                                                        onChange={(html) => handleMailTemplateChange(template.id, "body", html)}
                                                                        minHeight="100px"
                                                                        theme="purple"
                                                                    />
                                                                </div>
                                                            </CardContent>
                                                        </Card>
                                                    </TabsContent>
                                                ))}
                                            </Tabs>
                                        </TabsContent>

                                        {/* FACTURE TAB */}
                                        <TabsContent value="facture" className="space-y-6">
                                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b pb-2 mb-3 gap-3">
                                                <div className="order-1 sm:order-none">
                                                    <h3 className="text-sm font-bold text-emerald-900 uppercase tracking-tight">E-mails Facture</h3>
                                                    <p className="text-[10px] text-slate-500 hidden sm:block">Envoyés avec vos factures.</p>
                                                </div>
                                                <div className="flex items-center gap-2 w-full sm:w-auto order-2 sm:order-none">
                                                    <Select value={activeFactureTemplate} onValueChange={setActiveFactureTemplate}>
                                                        <SelectTrigger className="w-full sm:w-[130px] bg-white border-emerald-200 text-emerald-700 font-bold h-8 text-xs">
                                                            <SelectValue placeholder="Choisir un modèle..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="facture-default" className="font-bold text-emerald-700">
                                                                {settings.email_facture_name || "PAR DÉFAUT"}
                                                            </SelectItem>
                                                            {(settings.mail_templates || []).filter(t => t.type === "facture").map(template => (
                                                                <SelectItem key={template.id} value={template.id} className="font-bold text-emerald-700 uppercase">
                                                                    {template.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <Button onClick={() => addMailTemplate("facture")} size="sm" className="h-8 text-[10px] sm:text-xs bg-emerald-600 hover:bg-emerald-700 font-bold gap-1 shrink-0 px-3">
                                                        <PlusIcon className="size-3" /> <span className="hidden sm:inline">Ajouter</span><span className="sm:hidden">Ajouter</span>
                                                    </Button>
                                                </div>
                                            </div>

                                            <Tabs value={activeFactureTemplate} onValueChange={setActiveFactureTemplate} className="w-full">

                                                <TabsContent value="facture-default" className="mt-0">
                                                    <Card className="border-emerald-200 shadow-md relative overflow-hidden ring-2 ring-emerald-500/10 min-h-[300px]">
                                                        <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-md uppercase">Par Défaut</div>
                                                        <CardContent className="p-2 sm:p-4 space-y-2 sm:space-y-3">
                                                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                                                <Label className="shrink-0 text-[10px] sm:text-xs text-slate-500 uppercase font-bold sm:font-semibold pl-1 sm:pl-0">Nom du modèle :</Label>
                                                                <Input
                                                                    value={settings.email_facture_name}
                                                                    onChange={(e) => handleChange("email_facture_name", e.target.value)}
                                                                    className="h-8 bg-white border-dashed border-emerald-200 text-xs sm:text-sm font-medium w-full"
                                                                    placeholder="Nom du modèle"
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sujet de l&apos;email</Label>
                                                                <RichTextEditor
                                                                    value={settings.email_facture_subject}
                                                                    onChange={(html) => handleChange("email_facture_subject", html)}
                                                                    singleLine={true}
                                                                    theme="emerald"
                                                                    placeholder="Sujet de l'email..."
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Message</Label>
                                                                <RichTextEditor
                                                                    value={settings.email_facture_body || ""}
                                                                    onChange={(html) => handleChange("email_facture_body", html)}
                                                                    theme="emerald"
                                                                />
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                </TabsContent>

                                                {(settings.mail_templates || []).filter(t => t.type === "facture").map((template) => (
                                                    <TabsContent key={template.id} value={template.id} className="mt-0">
                                                        <Card key={template.id} className="border-emerald-200 shadow-md relative overflow-hidden ring-2 ring-emerald-500/10 min-h-[300px]">
                                                            <CardContent className="p-2 sm:p-4 space-y-2 sm:space-y-3">
                                                                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                                                    <div className="flex items-center justify-between w-full sm:w-auto gap-2 flex-1">
                                                                        <Label className="shrink-0 text-[10px] sm:text-xs text-slate-500 uppercase font-bold sm:font-semibold pl-1 sm:pl-0">Nom du modèle :</Label>
                                                                        <Button variant="ghost" size="icon" className="text-slate-300 hover:text-red-500 h-6 w-6 sm:h-8 sm:w-8 shrink-0 sm:hidden" onClick={() => removeMailTemplate(template.id)}>
                                                                            <TrashIcon className="size-3 sm:size-4" />
                                                                        </Button>
                                                                    </div>
                                                                    <Input
                                                                        value={template.name}
                                                                        onChange={(e) => handleMailTemplateChange(template.id, "name", e.target.value)}
                                                                        className="h-8 bg-white border-dashed border-emerald-200 text-xs sm:text-sm font-medium w-full flex-1"
                                                                        placeholder="Nom du modèle"
                                                                    />
                                                                    <Button variant="ghost" size="icon" className="hidden sm:inline-flex text-slate-300 hover:text-red-500 h-8 w-8 shrink-0" onClick={() => removeMailTemplate(template.id)}>
                                                                        <TrashIcon className="size-4" />
                                                                    </Button>
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sujet de l&apos;email</Label>
                                                                    <RichTextEditor
                                                                        value={template.subject}
                                                                        onChange={(html) => handleMailTemplateChange(template.id, "subject", html)}
                                                                        singleLine={true}
                                                                        theme="emerald"
                                                                        placeholder="Sujet de l'email..."
                                                                    />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Message</Label>
                                                                    <RichTextEditor
                                                                        value={template.body || ""}
                                                                        onChange={(html) => handleMailTemplateChange(template.id, "body", html)}
                                                                        minHeight="100px"
                                                                        theme="emerald"
                                                                    />
                                                                </div>
                                                            </CardContent>
                                                        </Card>
                                                    </TabsContent>
                                                ))}
                                            </Tabs>
                                        </TabsContent>

                                        {/* SIGNATURE TAB */}
                                        <TabsContent value="signature" className="space-y-6">
                                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b pb-2 mb-3 gap-3">
                                                <div className="order-1 sm:order-none">
                                                    <h3 className="text-sm font-bold text-pink-900 uppercase tracking-tight">E-mails Signature</h3>
                                                    <p className="text-[10px] text-slate-500 hidden sm:block">Envoyés lors de la confirmation de signature électronique.</p>
                                                </div>
                                                <div className="flex items-center gap-2 w-full sm:w-auto order-2 sm:order-none">
                                                    <Select value={activeSignatureTemplate} onValueChange={setActiveSignatureTemplate}>
                                                        <SelectTrigger className="w-full sm:w-[130px] bg-white border-pink-200 text-pink-700 font-bold h-8 text-xs">
                                                            <SelectValue placeholder="Choisir un modèle..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="signature-default" className="font-bold text-pink-700">
                                                                {settings.email_signature_name || "PAR DÉFAUT"}
                                                            </SelectItem>
                                                            {(settings.mail_templates || []).filter(t => t.type === "signature").map(template => (
                                                                <SelectItem key={template.id} value={template.id} className="font-bold text-pink-700 uppercase">
                                                                    {template.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <Button onClick={() => addMailTemplate("signature")} size="sm" className="h-8 text-[10px] sm:text-xs bg-pink-600 hover:bg-pink-700 font-bold gap-1 shrink-0 px-3">
                                                        <PlusIcon className="size-3" /> <span className="hidden sm:inline">Ajouter</span><span className="sm:hidden">Ajouter</span>
                                                    </Button>
                                                </div>
                                            </div>

                                            <Tabs value={activeSignatureTemplate} onValueChange={setActiveSignatureTemplate} className="w-full">

                                                <TabsContent value="signature-default" className="mt-0">
                                                    <Card className="border-pink-200 shadow-md relative overflow-hidden ring-2 ring-pink-500/10 min-h-[300px]">
                                                        <div className="absolute top-0 right-0 bg-pink-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-md uppercase">Par Défaut</div>
                                                        <CardContent className="p-2 sm:p-4 space-y-2 sm:space-y-3">
                                                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                                                <Label className="shrink-0 text-[10px] sm:text-xs text-slate-500 uppercase font-bold sm:font-semibold pl-1 sm:pl-0">Nom du modèle :</Label>
                                                                <Input
                                                                    value={settings.email_signature_name}
                                                                    onChange={(e) => handleChange("email_signature_name", e.target.value)}
                                                                    className="h-8 bg-white border-dashed border-pink-200 text-xs sm:text-sm font-medium w-full"
                                                                    placeholder="Nom du modèle"
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sujet de l&apos;email</Label>
                                                                <RichTextEditor
                                                                    value={settings.email_signature_subject}
                                                                    onChange={(html) => handleChange("email_signature_subject", html)}
                                                                    singleLine={true}
                                                                    theme="pink"
                                                                    placeholder="Sujet de l'email..."
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Message</Label>
                                                                <RichTextEditor
                                                                    value={settings.email_signature_body || ""}
                                                                    onChange={(html) => handleChange("email_signature_body", html)}
                                                                    theme="pink"
                                                                />
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                </TabsContent>

                                                {(settings.mail_templates || []).filter(t => t.type === "signature").map((template) => (
                                                    <TabsContent key={template.id} value={template.id} className="mt-0">
                                                        <Card className="border-pink-200 shadow-md relative overflow-hidden ring-2 ring-pink-500/10 min-h-[300px]">
                                                            <CardContent className="p-2 sm:p-4 space-y-2 sm:space-y-3">
                                                                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                                                    <div className="flex items-center justify-between w-full sm:w-auto gap-2 flex-1">
                                                                        <Label className="shrink-0 text-[10px] sm:text-xs text-slate-500 uppercase font-bold sm:font-semibold pl-1 sm:pl-0">Nom du modèle :</Label>
                                                                        <Button variant="ghost" size="icon" className="text-slate-300 hover:text-red-500 h-6 w-6 sm:h-8 sm:w-8 shrink-0 sm:hidden" onClick={() => removeMailTemplate(template.id)}>
                                                                            <TrashIcon className="size-3 sm:size-4" />
                                                                        </Button>
                                                                    </div>
                                                                    <Input
                                                                        value={template.name}
                                                                        onChange={(e) => handleMailTemplateChange(template.id, "name", e.target.value)}
                                                                        className="h-8 bg-white border-dashed border-pink-200 text-xs sm:text-sm font-medium w-full flex-1"
                                                                        placeholder="Nom du modèle"
                                                                    />
                                                                    <Button variant="ghost" size="icon" className="hidden sm:inline-flex text-slate-300 hover:text-red-500 h-8 w-8 shrink-0" onClick={() => removeMailTemplate(template.id)}>
                                                                        <TrashIcon className="size-4" />
                                                                    </Button>
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sujet de l&apos;email</Label>
                                                                    <RichTextEditor
                                                                        value={template.subject}
                                                                        onChange={(html) => handleMailTemplateChange(template.id, "subject", html)}
                                                                        singleLine={true}
                                                                        theme="pink"
                                                                        placeholder="Sujet de l'email..."
                                                                    />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Message</Label>
                                                                    <RichTextEditor
                                                                        value={template.body || ""}
                                                                        onChange={(html) => handleMailTemplateChange(template.id, "body", html)}
                                                                        minHeight="100px"
                                                                        theme="pink"
                                                                    />
                                                                </div>
                                                            </CardContent>
                                                        </Card>
                                                    </TabsContent>
                                                ))}
                                            </Tabs>
                                        </TabsContent>
                                    </Tabs>
                                </div>

                                {/* Right: Sticky Tags Sidebar (Top on Mobile) */}
                                <div className="w-full lg:w-[260px] lg:sticky lg:top-24 space-y-4 shrink-0">
                                    <Card className="bg-white shadow-xl border-indigo-100 overflow-hidden">
                                        <div className="bg-indigo-600 p-3 flex items-center justify-between">
                                            <h4 className="text-white font-bold flex items-center gap-2 text-sm">
                                                <TagIcon className="size-4" /> Balises disponibles
                                            </h4>
                                            <Button variant="ghost" size="icon" onClick={() => setIsTagsModalOpen(true)} className="text-white/70 hover:text-white hover:bg-white/10 h-7 w-7">
                                                <SettingsIcon className="size-3.5" />
                                            </Button>
                                        </div>
                                        <CardContent className="p-3 space-y-3 max-h-[300px] lg:max-h-[600px] overflow-y-auto custom-scrollbar">
                                            <p className="text-[10px] text-slate-500 italic leading-tight">
                                                <InfoIcon className="inline size-3 mr-1" />
                                                Glissez une balise dans l&apos;éditeur ou tapez-la directement.
                                            </p>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-1.5 sm:gap-2">
                                                {ALL_TAGS.filter(tag => (settings.enabled_email_tags || []).includes(tag.id)).map(tag => (
                                                    <div
                                                        key={tag.id}
                                                        draggable
                                                        onDragStart={(e) => e.dataTransfer.setData("text/plain", tag.id)}
                                                        className="group flex flex-col p-1.5 px-2 rounded-md border border-indigo-50 bg-indigo-50/50 hover:bg-indigo-600 hover:border-indigo-600 transition-all cursor-grab active:cursor-grabbing shadow-sm"
                                                    >
                                                        <span className="text-[9px] sm:text-[10px] font-bold text-indigo-900 group-hover:text-white transition-colors truncate">{tag.label}</span>
                                                        <code className="text-[8px] text-indigo-400 group-hover:text-indigo-100 transition-colors opacity-70">{tag.id}</code>
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
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
                                        <Separator className="my-2" />
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label className="flex items-center gap-2 text-indigo-600 font-bold uppercase text-[10px] tracking-wider">
                                                    <FileIcon className="size-3" /> Informations RIB (Texte manuel)
                                                </Label>
                                                <Textarea
                                                    value={settings.rib_text || ""}
                                                    onChange={(e) => handleChange("rib_text", e.target.value)}
                                                    placeholder="Coller ici vos coordonnées complètes ou mentions spéciales RIB..."
                                                    rows={4}
                                                    className="text-xs bg-slate-50 border-indigo-100 focus:border-indigo-300"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="flex items-center gap-2 text-indigo-600 font-bold uppercase text-[10px] tracking-wider">
                                                    <UploadIcon className="size-3" /> Fichier RIB (Upload)
                                                </Label>
                                                <input
                                                    type="file"
                                                    accept=".pdf,image/*"
                                                    className="hidden"
                                                    ref={ribInputRef}
                                                    onChange={handleRibUpload}
                                                />
                                                <div className="flex flex-col gap-2">
                                                    {settings.rib_url ? (
                                                        <div className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                                                            <a href={settings.rib_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs font-medium text-indigo-700 hover:underline">
                                                                <FileIcon className="size-4" /> Voir le RIB actuel
                                                            </a>
                                                            <Button variant="ghost" size="icon" onClick={removeRib} className="h-8 w-8 text-red-500 hover:bg-red-50">
                                                                <TrashIcon className="size-4" />
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <Button variant="outline" onClick={triggerRibInput} className="w-full gap-2 border-dashed h-20 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition-all">
                                                            <UploadIcon className="size-5" />
                                                            <div className="flex flex-col items-start text-left">
                                                                <span className="font-bold">Importer votre RIB</span>
                                                                <span className="text-[10px] opacity-70">PDF ou Image supportés</span>
                                                            </div>
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-[10px] text-slate-400">Le RIB ou texte RIB apparaîtra selon votre configuration sur les documents.</p>
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
                                        <RichTextEditor
                                            value={settings.msg_success}
                                            onChange={(html) => handleChange("msg_success", html)}
                                            placeholder="Merci ! Votre réservation est bien confirmée..."
                                            minHeight="150px"
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
                                            <Label>Titre de l&apos;annexe</Label>
                                            <Input
                                                value={settings.annexe_titre}
                                                onChange={(e) => handleChange("annexe_titre", e.target.value)}
                                                placeholder="Ex: INFORMATIONS LOGISTIQUES"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Contenu / Consignes de l&apos;annexe</Label>
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
                    </div>
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
            <Dialog open={isTagsModalOpen} onOpenChange={setIsTagsModalOpen}>
                <DialogContent className="fixed top-[50%] left-[50%] -translate-x-[50%] -translate-y-[50%] bottom-auto w-[90%] max-w-[320px] gap-2 p-4 rounded-2xl overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] duration-200">
                    <DialogHeader className="space-y-1">
                        <DialogTitle className="text-base font-bold text-center">Balises Email</DialogTitle>
                        <DialogDescription className="text-[10px] text-center leading-tight">
                            Activez les options pour l'éditeur.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-1 gap-1.5 py-1 max-h-[35vh] overflow-y-auto pr-1 custom-scrollbar scroll-smooth">
                        {ALL_TAGS.map((tag) => {
                            const isEnabled = (settings.enabled_email_tags || []).includes(tag.id);
                            return (
                                <div
                                    key={tag.id}
                                    className={`flex items-center justify-between p-2 sm:p-3 rounded-lg border transition-all ${isEnabled ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-slate-50 border-slate-100 opacity-60'}`}
                                >
                                    <div className="flex flex-col min-w-0 pr-2">
                                        <span className={`text-xs sm:text-sm font-bold truncate ${isEnabled ? 'text-indigo-900' : 'text-slate-500'}`}>{tag.label}</span>
                                        <code className="text-[9px] sm:text-[10px] text-slate-400">{tag.id}</code>
                                    </div>
                                    <Switch
                                        className="scale-75 sm:scale-100 shrink-0"
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
