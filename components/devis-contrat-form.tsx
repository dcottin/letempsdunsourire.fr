"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import {
    CalendarIcon, UserIcon, CalendarDaysIcon, EuroIcon, FileTextIcon, CameraIcon, Bot, Loader2Icon, RefreshCw,
    EyeIcon, SendIcon, CheckCircleIcon, ScrollTextIcon, DownloadIcon, AlertCircleIcon
} from "lucide-react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { ContractPreview } from "@/components/contract-preview"
import { SendEmailDialog } from "@/components/send-email-dialog"

import { supabase } from "@/lib/supabase"

const DEFAULT_SETTINGS = {
    nom_societe: "Mon Entreprise",
    offres: [
        { name: "Basic", price: "150" },
        { name: "Eclat", price: "250" },
        { name: "Prestige", price: "350" }
    ],
    options: [],
    label_livraison: "Frais de déplacement"
}

const formSchema = z.object({
    // Client Info
    nom_client: z.string().min(2, { message: "Le nom est requis." }),
    email_client: z.string().nullable().default(""),
    telephone_client: z.string().nullable().default(""),
    adresse_client: z.string().nullable().default(""),

    // Event & Material
    nom_evenement: z.string().nullable().default(""),
    date_debut: z.string().min(1, { message: "Date de début requise." }),
    heure_debut: z.string().nullable().default(""),
    date_fin: z.string().nullable().default(""),
    heure_fin: z.string().nullable().default(""),
    lieu: z.string().min(2, "Le lieu est requis"),
    texte_libre: z.string().nullable().default(""),
    equipment_id: z.string().nullable().optional(),
    offre: z.string().min(1, "L'offre est requise"),
    offre_impression: z.string().nullable().default(""),
    source_contact: z.string().nullable().default(""),

    // Pricing
    prix_total: z.string().default("0"),
    frais_livraison: z.string().nullable().default("0"),
    remise: z.string().nullable().default("0"),
    acompte_recu: z.string().nullable().default("0"),
    acompte_paye: z.boolean().default(false),
    contrat_signe: z.boolean().default(false),
    solde_paye: z.boolean().default(false),
    design_valide: z.boolean().default(false),
    etat: z.string().default("Contact"),
    note_interne: z.string().nullable().default(""),
    selected_options: z.array(z.object({
        name: z.string(),
        price: z.string()
    })).default([]),
})

interface DevisContratFormProps {
    mode: "devis" | "contrat"
    initialData?: any
    onSuccess?: (data: any) => void
    onCancel?: () => void
}

export function DevisContratForm({ mode, initialData, onSuccess, onCancel }: DevisContratFormProps) {
    // Sanitize initialData to ensure it matches formSchema expectations
    const sanitizedInitialData = React.useMemo(() => {
        if (!initialData) return null
        const data = initialData.data || {}
        return {
            ...initialData,
            ...data,
            prix_total: (initialData.prix_total || data.prix_total || "0").toString(),
            selected_options: data.selected_options || initialData.selected_options || []
        }
    }, [initialData])

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: sanitizedInitialData || {
            etat: mode === "contrat" ? "Validé" : "Contact",
            prix_total: "0",
            frais_livraison: "0",
            remise: "0",
            acompte_recu: "0",
            acompte_paye: false,
            contrat_signe: false,
            solde_paye: false,
            design_valide: false,
            nom_client: "",
            email_client: "",
            telephone_client: "",
            adresse_client: "",
            nom_evenement: "",
            date_debut: "",
            heure_debut: "",
            date_fin: "",
            heure_fin: "",
            lieu: "",
            texte_libre: "",
            equipment_id: "",
            offre: "",
            offre_impression: "",
            source_contact: "",
            note_interne: "",
            selected_options: [],
        },
    })

    // Sync form values if initialData changes (e.g. after a first save or if data is refreshed)
    React.useEffect(() => {
        if (sanitizedInitialData) {
            form.reset(sanitizedInitialData)
        }
    }, [sanitizedInitialData, form])

    const [isSaving, setIsSaving] = React.useState(false)

    const [unavailableIds, setUnavailableIds] = React.useState<string[]>([])
    const [isCheckingAvailability, setIsCheckingAvailability] = React.useState(false)
    const watchedDateDebut = form.watch("date_debut")


    React.useEffect(() => {
        const checkAvailability = async () => {
            if (!watchedDateDebut) return
            setIsCheckingAvailability(true)

            try {
                console.log("Checking availability for:", watchedDateDebut)

                // 1. Check Devis
                let devisQuery = supabase
                    .from('devis')
                    .select('id, data, date_debut, etat')
                    .eq('date_debut', watchedDateDebut)
                    .neq('etat', 'Annulé')
                    .neq('etat', 'Refusé')

                if (mode === 'devis' && initialData?.id) {
                    devisQuery = devisQuery.neq('id', initialData.id)
                }
                const { data: devisData, error: devisError } = await devisQuery

                if (devisError) throw devisError

                // 2. Check Contrats
                let contratsQuery = supabase
                    .from('contrats')
                    .select('id, data, date_debut, etat')
                    .eq('date_debut', watchedDateDebut)
                    .neq('etat', 'Annulé')
                    .neq('etat', 'Cancelled')

                if (mode === 'contrat' && initialData?.id) {
                    contratsQuery = contratsQuery.neq('id', initialData.id)
                }
                const { data: contratsData, error: contratsError } = await contratsQuery

                if (contratsError) throw contratsError

                // Merge results
                const allOtherBookings = [...(devisData || []), ...(contratsData || [])]

                console.log("Found other dossiers for date:", allOtherBookings.length)

                // IMPORTANT: Only count as "reserving" a machine if it's NOT just a lead
                // unless we want to block leads too.
                // Let's count everything that isn't cancelled, but maybe label it differently.
                const busyIds = allOtherBookings
                    ?.map((d: any) => d.data?.equipment_id || d.equipment_id)
                    .filter(Boolean) || []

                // Unique IDs only
                const uniqueBusyIds = Array.from(new Set(busyIds))

                console.log("Busy Equipment IDs:", uniqueBusyIds)
                setUnavailableIds(uniqueBusyIds)
            } catch (err) {
                console.error("Error checking availability", err)
            } finally {
                setIsCheckingAvailability(false)
            }
        }

        checkAvailability()
    }, [watchedDateDebut])

    React.useEffect(() => {
        if (Object.keys(form.formState.errors).length > 0) {
            console.log("Form Validation Errors:", form.formState.errors)
        }
    }, [form.formState.errors])

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSaving(true)
        const table = mode === "devis" ? "devis" : "contrats"

        // For contracts, we ensure the 'etat' is properly set if not already
        const finalValues = {
            ...values,
            etat: values.etat || (mode === "contrat" ? "Validé" : "Contact")
        }

        const record = {
            nom_client: finalValues.nom_client,
            prix_total: finalValues.prix_total,
            date_debut: finalValues.date_debut,
            data: finalValues
        }

        try {
            console.log(`Saving to ${table}...`, record)


            let savedRecord

            if (initialData?.id) {
                const { data, error: updateError } = await supabase
                    .from(table)
                    .update(record)
                    .eq('id', initialData.id)
                    .select()
                    .single()
                if (updateError) throw updateError
                savedRecord = data
            } else {
                // Generate custom ID (Reference)
                const datePart = finalValues.date_debut ? format(new Date(finalValues.date_debut as string), "yyyyMMdd") : "00000000"
                const initials = finalValues.nom_client
                    ? finalValues.nom_client.split(' ').map((n: string) => n[0]).join('').toUpperCase()
                    : "XX"

                const prefix = mode === 'contrat' ? 'C' : 'D'
                const newId = `${prefix}-${datePart}-${initials}`

                const newItem = {
                    id: newId,
                    ...record,
                    // Store reference in data jsonb as well for redundancy
                    data: {
                        ...record.data,
                        reference: newId
                    }
                }

                const { data, error: insertError } = await supabase
                    .from(table)
                    .insert([newItem])
                    .select()
                    .single()
                if (insertError) throw insertError
                savedRecord = data
            }

            if (onSuccess) onSuccess(savedRecord)
        } catch (e) {
            console.error("Save error", e)
            alert("Erreur lors de l'enregistrement.")
        } finally {
            setIsSaving(false)
        }
    }

    const [statusSettings, setStatusSettings] = React.useState<any>(DEFAULT_SETTINGS)
    const [isLoadingSettings, setIsLoadingSettings] = React.useState(true)
    const [showPreview, setShowPreview] = React.useState(false)
    const [showFacturePreview, setShowFacturePreview] = React.useState(false)
    const [showEmail, setShowEmail] = React.useState(false)

    // Load settings from Supabase
    const fetchSettings = React.useCallback(async () => {
        setIsLoadingSettings(true)
        console.log("Fetching settings (Discovery mode)...")
        try {
            const { data: records, error } = await supabase
                .from('settings')
                .select('*')
                .limit(1)

            if (error) throw error

            if (records && records.length > 0) {
                const record = records[0]
                console.log("Settings discovered (ID:", record.id, "):", record.data)

                const cleanData = { ...record.data }
                if (cleanData.offres) {
                    cleanData.offres = cleanData.offres.filter((o: any) => o.name && o.name.trim() !== "")
                } else {
                    cleanData.offres = DEFAULT_SETTINGS.offres
                }

                if (cleanData.options) {
                    cleanData.options = cleanData.options.filter((o: any) => o.name && o.name.trim() !== "")
                } else {
                    cleanData.options = DEFAULT_SETTINGS.options
                }

                setStatusSettings({ ...DEFAULT_SETTINGS, ...cleanData })
            } else {
                console.log("No settings record found in database. Using defaults.")
                setStatusSettings(DEFAULT_SETTINGS)
            }
        } catch (e) {
            console.error("Failed to fetch settings from Supabase", e)
        } finally {
            setIsLoadingSettings(false)
        }
    }, [])

    React.useEffect(() => {
        fetchSettings()
    }, [fetchSettings])

    // Watch values for auto-calculation and UI reactive updates
    const watchedOffre = form.watch("offre")
    const watchedOptions = form.watch("selected_options")
    const watchedLivraison = form.watch("frais_livraison")
    const watchedRemise = form.watch("remise")

    // Automatic Calculation of Total Price
    React.useEffect(() => {
        let total = 0

        // 1. Base Formula Price
        if (watchedOffre && statusSettings?.offres) {
            const selectedOffre = statusSettings.offres.find((o: any) => o.name === watchedOffre)
            if (selectedOffre) {
                const val = parseFloat(selectedOffre.price)
                if (!isNaN(val)) total += val
            }
        }

        // 2. Options Prices
        if (watchedOptions && Array.isArray(watchedOptions)) {
            watchedOptions.forEach((opt: any) => {
                const val = parseFloat(opt.price)
                if (!isNaN(val)) total += val
            })
        }

        // 3. Delivery Fee
        const deliveryPrice = parseFloat(watchedLivraison || "0")
        if (!isNaN(deliveryPrice)) {
            total += deliveryPrice
        }

        // 4. Discount
        const discountValue = parseFloat(watchedRemise || "0")
        if (!isNaN(discountValue)) {
            total -= discountValue
        }

        // Only set if we have a valid number
        if (!isNaN(total)) {
            form.setValue("prix_total", total.toFixed(2).replace(/\.00$/, ""))
        }
    }, [watchedOffre, watchedOptions, watchedLivraison, watchedRemise, statusSettings, form])

    const formValues = form.getValues()

    const generateReference = () => {
        const datePart = formValues.date_debut ? format(new Date(formValues.date_debut as string), "ddMMyy") : "000000"
        const initials = formValues.nom_client
            ? formValues.nom_client.split(' ').map((n: string) => n[0]).join('').toUpperCase()
            : "XX"
        return `2026-${datePart}-${initials}`
    }

    const persistAndSanitizeStyles = (clonedDoc: Document) => {
        // 1. Lightness-aware Smart Replacement
        // Extracts the first number (L) and chooses a fallback based on threshold
        const smartReplace = (match: string) => {
            try {
                // Determine if it's a light or dark color based on first number (Lightness)
                const numbers = match.match(/[\d.]+/g);
                if (numbers && numbers.length > 0) {
                    let l = parseFloat(numbers[0]);
                    // Handle percentage if present in original (though simplified here)
                    if (match.includes('%') && l > 1) l = l / 100;

                    // Tailwind slate-50 is like 0.98, slate-900 is like 0.15
                    // Threshold: if L > 0.5, it's likely a background or light text -> force white/light
                    if (l > 0.5) return '#f8fafc';
                }
            } catch (e) { }
            return '#0f172a'; // Default to dark text
        };

        const modernColorRegex = /(?:oklch|oklab|lab)\s*\([^\;!}]*/gi;

        // 2. Sanitize all Style Tags in the clone head
        const styleTags = clonedDoc.getElementsByTagName('style');
        for (let i = 0; i < styleTags.length; i++) {
            const s = styleTags[i];
            if (s.textContent && modernColorRegex.test(s.textContent)) {
                s.textContent = s.textContent.replace(modernColorRegex, smartReplace);
            }
        }

        // 3. Aggregate and Sanitize ALL rules from parent
        let allCss = "";
        try {
            for (let i = 0; i < document.styleSheets.length; i++) {
                const sheet = document.styleSheets[i];
                try {
                    const rules = sheet.cssRules;
                    for (let j = 0; j < rules.length; j++) {
                        allCss += rules[j].cssText + "\n";
                    }
                } catch (e) { }
            }
        } catch (e) { }

        if (allCss) {
            const head = clonedDoc.head || clonedDoc.getElementsByTagName('head')[0];
            const combinedStyle = clonedDoc.createElement('style');
            combinedStyle.textContent = allCss.replace(modernColorRegex, smartReplace);
            head.appendChild(combinedStyle);
        }

        // 4. Sanitize all Elements at the DOM Level (Attributes + Fallbacks)
        const allElements = clonedDoc.getElementsByTagName('*');
        for (let i = 0; i < allElements.length; i++) {
            const el = allElements[i] as HTMLElement;

            // Scrub inline style attribute
            if (el.getAttribute && el.getAttribute('style')) {
                const s = el.getAttribute('style')!;
                if (modernColorRegex.test(s)) {
                    el.setAttribute('style', s.replace(modernColorRegex, smartReplace));
                }
            }

            // Fallback for computed styles
            const colorProps = ['color', 'background-color', 'border-color', 'fill', 'stroke'];
            colorProps.forEach(prop => {
                try {
                    const computed = window.getComputedStyle(el);
                    const val = computed.getPropertyValue(prop);
                    if (val && modernColorRegex.test(val)) {
                        el.style.setProperty(prop, smartReplace(val), 'important');
                    }
                } catch (e) { }
            });
        }

        // 5. Force Professional Print Visibility & Constraints
        const forcePrintStyle = clonedDoc.createElement('style');
        forcePrintStyle.innerHTML = `
            :root {
                --background: #ffffff !important;
                --primary: #0f172a !important;
                --border: #e2e8f0 !important;
            }
            body, #pdf-generation-container { 
                background: white !important; 
                color: #0f172a !important; 
                visibility: visible !important;
                opacity: 1 !important;
                display: block !important;
            }
            #pdf-generation-container * {
                box-shadow: none !important;
                background-color: transparent !important; /* Let body white shine through */
            }
            #pdf-generation-container .bg-black {
                background-color: #000000 !important;
            }
            #pdf-generation-container > div {
                 background: white !important;
                 gap: 0 !important;
                 min-height: 0 !important;
            }
            #pdf-generation-container .bg-slate-50 {
                 background: white !important;
            }
            /* Re-apply white background to pages */
            #pdf-generation-container .mx-auto.bg-white {
                background: white !important;
                margin: 0 !important;
                padding-top: 5mm !important; /* Safety padding */
                padding-bottom: 0 !important;
                width: 100% !important;
                max-width: none !important;
            }
            .page-break-after-always {
                page-break-after: always !important;
                break-after: page !important;
                margin-bottom: 0 !important;
            }
            img {
                max-width: 100% !important;
                object-fit: contain;
            }
            .no-print { display: none !important; }
        `;
        clonedDoc.head.appendChild(forcePrintStyle);
    };

    const [emailType, setEmailType] = React.useState<"contract" | "invoice">("contract")

    const handleSendEmail = async (data: { to: string; subject: string; message: string }) => {
        const containerId = emailType === "invoice" ? 'pdf-invoice-container' : 'pdf-contract-container'
        const printContent = document.getElementById(containerId)
        if (!printContent) {
            alert("Erreur : Impossible de trouver le contenu du document.")
            return
        }

        try {
            const html2pdf = (await import('html2pdf.js' as any)).default

            const options = {
                margin: 0,
                filename: `${emailType === 'invoice' ? 'Facture' : (mode === 'contrat' ? 'Contrat' : 'Devis')}_${generateReference()}.pdf`,
                image: { type: 'jpeg', quality: 1.0 },
                html2canvas: {
                    scale: 4,
                    useCORS: true,
                    windowWidth: 800,
                    onclone: (clonedDoc: Document) => {
                        persistAndSanitizeStyles(clonedDoc);
                    }
                },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
            }

            const pdfBase64 = await html2pdf().from(printContent).set(options).outputPdf('datauristring')
            const base64Content = pdfBase64.split(',')[1]

            const response = await fetch('/api/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...data,
                    fromName: statusSettings?.nom_societe,
                    attachments: [
                        {
                            filename: options.filename,
                            content: base64Content,
                        }
                    ]
                }),
            })

            const result = await response.json()
            if (!response.ok) throw new Error(result.error?.message || "Erreur lors de l'envoi")

            alert(`Email envoyé avec succès !`)
            setShowEmail(false)
        } catch (error: any) {
            console.error("Failed to send email with attachment", error)
            alert(`Erreur d'envoi : ${error.message}`)
        }
    }

    const handleDownloadPDF = async (type: "contract" | "invoice" = "contract") => {
        const containerId = type === "invoice" ? 'pdf-invoice-container' : 'pdf-contract-container'
        const printContent = document.getElementById(containerId)
        if (!printContent) return

        try {
            const html2pdf = (await import('html2pdf.js' as any)).default
            const options = {
                margin: 0,
                filename: `${type === 'invoice' ? 'Facture' : (mode === 'contrat' ? 'Contrat' : 'Devis')}_${generateReference()}.pdf`,
                image: { type: 'jpeg', quality: 1.0 },
                html2canvas: {
                    scale: 4,
                    useCORS: true,
                    windowWidth: 800,
                    onclone: (clonedDoc: Document) => {
                        persistAndSanitizeStyles(clonedDoc);
                    }
                },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
            }

            html2pdf().from(printContent).set(options).save()
        } catch (error) {
            console.error("PDF Generation error", error)
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit, (err) => console.error("Form Submit Validation Errors:", JSON.stringify(err, null, 2)))} className="space-y-6">
                {/* Hidden areas for background PDF generation */}
                <div className="absolute opacity-0 pointer-events-none -z-50 overflow-hidden h-0 w-0" aria-hidden="true">
                    <div id="pdf-contract-container" style={{ background: 'white' }}>
                        <ContractPreview data={form.watch()} settings={statusSettings} mode={mode} />
                    </div>
                    <div id="pdf-invoice-container" style={{ background: 'white' }}>
                        <ContractPreview data={form.watch()} settings={statusSettings} isInvoice={true} mode={mode} />
                    </div>
                </div>

                {/* Actions Bar */}
                <div className="flex flex-wrap justify-end gap-3 mb-4 no-print text-sm">
                    <div className="inline-flex items-center gap-0.5 bg-slate-50 p-1 rounded-lg border border-slate-200 shadow-sm">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.preventDefault(); setShowPreview(true); }}
                            className="gap-2 text-indigo-600 hover:bg-white hover:shadow-sm h-8 px-3 font-semibold transition-all"
                        >
                            <EyeIcon className="size-4" /> {mode === 'contrat' ? 'Contrat' : 'Devis'}
                        </Button>
                        <div className="w-px h-4 bg-slate-200 mx-0.5" />
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => { e.preventDefault(); handleDownloadPDF('contract'); }}
                            className="h-8 w-8 text-slate-500 hover:text-slate-900 hover:bg-white hover:shadow-sm transition-all"
                            title="Générer PDF"
                        >
                            <DownloadIcon className="size-3.5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => { e.preventDefault(); setEmailType('contract'); setShowEmail(true); }}
                            className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-white hover:shadow-sm transition-all"
                            title="Envoyer mail"
                        >
                            <SendIcon className="size-3.5" />
                        </Button>
                    </div>

                    {mode === "contrat" && (
                        <div className="inline-flex items-center gap-0.5 bg-slate-50 p-1 rounded-lg border border-slate-200 shadow-sm text-sm font-semibold">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => { e.preventDefault(); setShowFacturePreview(true); }}
                                className="gap-2 text-primary hover:bg-white hover:shadow-sm h-8 px-3 font-semibold transition-all"
                            >
                                <FileTextIcon className="size-4" /> Facture
                            </Button>
                            <div className="w-px h-4 bg-slate-200 mx-0.5" />
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => { e.preventDefault(); handleDownloadPDF('invoice'); }}
                                className="h-8 w-8 text-slate-500 hover:text-slate-900 hover:bg-white hover:shadow-sm transition-all"
                                title="Générer PDF Facture"
                            >
                                <DownloadIcon className="size-3.5" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => { e.preventDefault(); setEmailType('invoice'); setShowEmail(true); }}
                                className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-white hover:shadow-sm transition-all"
                                title="Envoyer mail Facture"
                            >
                                <SendIcon className="size-3.5" />
                            </Button>
                        </div>
                    )}
                </div>

                <Dialog open={showPreview} onOpenChange={setShowPreview}>
                    <DialogContent className="w-full h-full max-w-none md:max-w-5xl md:h-[90vh] md:rounded-xl p-0 overflow-hidden bg-slate-100 flex flex-col gap-0 border-none shadow-2xl">
                        <DialogHeader className="p-4 border-b bg-white flex flex-row justify-between items-center shadow-sm z-10 no-print space-y-0">
                            <div className="flex flex-col">
                                <DialogTitle className="font-bold text-lg hidden md:block">{mode === 'contrat' ? 'Le Contrat' : 'Le Devis'}</DialogTitle>
                                <DialogTitle className="font-bold md:hidden">{mode === 'contrat' ? 'Contrat' : 'Devis'}</DialogTitle>
                                <DialogDescription className="sr-only">
                                    Visualisez le document avant de l'enregistrer ou de l'envoyer.
                                </DialogDescription>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => handleDownloadPDF('contract')} className="gap-2">
                                    <DownloadIcon className="size-4" /> PDF
                                </Button>
                                <Button size="sm" onClick={() => { setEmailType('contract'); setShowEmail(true); }} className="gap-2">
                                    <SendIcon className="size-4" /> Envoyer
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => setShowPreview(false)}>Fermer</Button>
                            </div>
                        </DialogHeader>
                        <div className="flex-1 overflow-y-auto p-4 md:p-8">
                            <ContractPreview data={form.watch()} settings={statusSettings} mode={mode} />
                        </div>
                    </DialogContent>
                </Dialog>

                <Dialog open={showFacturePreview} onOpenChange={setShowFacturePreview}>
                    <DialogContent className="w-full h-full max-w-none md:max-w-5xl md:h-[90vh] md:rounded-xl p-0 overflow-hidden bg-slate-100 flex flex-col gap-0 border-none shadow-2xl">
                        <DialogHeader className="p-4 border-b bg-white flex flex-row justify-between items-center shadow-sm z-10 no-print space-y-0">
                            <div className="flex flex-col">
                                <DialogTitle className="font-bold text-lg hidden md:block">La Facture</DialogTitle>
                                <DialogTitle className="font-bold md:hidden">Facture</DialogTitle>
                                <DialogDescription className="sr-only">
                                    Visualisez la facture avant de l'enregistrer ou de l'envoyer.
                                </DialogDescription>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => handleDownloadPDF('invoice')} className="gap-2 text-primary border-primary/20">
                                    <DownloadIcon className="size-4" /> PDF
                                </Button>
                                <Button size="sm" onClick={() => { setEmailType('invoice'); setShowEmail(true); }} className="gap-2">
                                    <SendIcon className="size-4" /> Envoyer
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => setShowFacturePreview(false)}>Fermer</Button>
                            </div>
                        </DialogHeader>
                        <div className="flex-1 overflow-y-auto p-4 md:p-8">
                            <ContractPreview data={form.watch()} settings={statusSettings} isInvoice={true} mode={mode} />
                        </div>
                    </DialogContent>
                </Dialog>

                <SendEmailDialog
                    open={showEmail}
                    onOpenChange={setShowEmail}
                    defaultEmail={form.watch("email_client") || ""}
                    defaultSubject={`${mode === "contrat" ? "Contrat" : "Devis"} - ${form.watch("nom_evenement") || "Événement"}`}
                    onSend={handleSendEmail}
                />


                {/* Client Info */}
                <Card className="border-l-4 border-l-primary/20">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                            <UserIcon className="size-5 text-primary" />
                            Informations client
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="nom_client"
                            render={({ field }: { field: any }) => (
                                <FormItem className="md:col-span-2">
                                    <FormLabel className="uppercase text-xs font-bold text-muted-foreground">Nom complet / Société</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: Jean Dupont" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="email_client"
                            render={({ field }: { field: any }) => (
                                <FormItem>
                                    <FormLabel className="uppercase text-xs font-bold text-muted-foreground">Email</FormLabel>
                                    <FormControl>
                                        <Input placeholder="email@exemple.com" {...field} type="email" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="telephone_client"
                            render={({ field }: { field: any }) => (
                                <FormItem>
                                    <FormLabel className="uppercase text-xs font-bold text-muted-foreground">Téléphone</FormLabel>
                                    <FormControl>
                                        <Input placeholder="06 12 34 56 78" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="adresse_client"
                            render={({ field }: { field: any }) => (
                                <FormItem className="md:col-span-2">
                                    <FormLabel className="uppercase text-xs font-bold text-muted-foreground">Adresse postale</FormLabel>
                                    <FormControl>
                                        <Input placeholder="123 Rue de la Paix..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                {/* Event & Material */}
                <Card className="border-l-4 border-l-primary">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                            <CalendarDaysIcon className="size-5 text-primary" />
                            Événement & Matériel
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="nom_evenement"
                            render={({ field }: { field: any }) => (
                                <FormItem className="md:col-span-2">
                                    <FormLabel className="uppercase text-xs font-bold text-primary">Nom de l'événement (Optionnel)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: Anniversaire Maël 18 ans" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="space-y-2">
                            <FormLabel className="uppercase text-xs font-bold text-muted-foreground mr-2">Date de l'évènement</FormLabel>
                            <FormField
                                control={form.control}
                                name="date_debut"
                                render={({ field }: { field: any }) => (
                                    <FormItem className="flex-1">
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="lieu"
                            render={({ field }: { field: any }) => (
                                <FormItem className="md:col-span-2">
                                    <FormLabel className="uppercase text-xs font-bold text-muted-foreground">Lieu de prestation</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Ex: Salle des fêtes..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="texte_libre"
                            render={({ field }: { field: any }) => (
                                <FormItem className="md:col-span-2">
                                    <FormLabel className="uppercase text-xs font-bold text-muted-foreground flex items-center gap-1">
                                        <FileTextIcon className="size-3" />
                                        Texte libre (Sur Devis/Facture/Contrat)
                                    </FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Ex: Code Wifi: 1234, Contact sur place: Mme Michu..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="equipment_id"
                            render={({ field }: { field: any }) => {
                                // Calculate availability status
                                const totalMachines = statusSettings?.materiels?.length || 0
                                const unavailableCount = unavailableIds.length
                                // A machine is available if it exists and its ID is NOT in unavailableIds
                                // We also consider the CURRENTLY selected one as "available" for keeping it selected (handled in map)
                                const availableMachines = statusSettings?.materiels?.filter((m: any) => !unavailableIds.includes(m.id)) || []
                                const allReserved = totalMachines > 0 && availableMachines.length === 0

                                // Check if there's a preference from reservation form in the INITIAL data
                                // This makes the badge persistent even if we select a specific machine unit.
                                const preferences: Record<string, string> = {
                                    'bois': 'Modèle en bois',
                                    'blanc': 'Modèle blanc',
                                    'noir': 'Modèle noir',
                                    'import': 'Sans importance'
                                }

                                // We check initialData for choice_client (permanent) or equipment_id (original lead)
                                const initialChoice = initialData?.data?.choix_client || initialData?.data?.equipment_id || initialData?.equipment_id
                                const clientWish = preferences[initialChoice] || preferences[field.value]

                                return (
                                    <FormItem>
                                        <div className="flex items-center justify-between">
                                            <FormLabel className="uppercase text-xs font-bold text-muted-foreground text-indigo-600">Matériel (Disponibilité auto)</FormLabel>
                                            {clientWish && (
                                                <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] animate-pulse">
                                                    Souhait client : {clientWish}
                                                </Badge>
                                            )}
                                        </div>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger className={`font-bold ${allReserved ? "text-red-600 bg-red-50 border-red-200" : "text-indigo-700 bg-indigo-50 border-indigo-200"}`}>
                                                    <SelectValue placeholder="Choisir une machine..." />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="none" className="text-muted-foreground italic">
                                                    -- Aucune machine --
                                                </SelectItem>
                                                {statusSettings?.materiels?.map((mat: any) => {
                                                    const isTaken = unavailableIds.includes(mat.id)
                                                    // If taken, and NOT the current one (editing case), we HIDE it as requested.
                                                    const isCurrent = mat.id === initialData?.data?.equipment_id

                                                    if (isTaken && !isCurrent) return null

                                                    return (
                                                        <SelectItem key={mat.id} value={mat.id}>
                                                            {mat.nom}
                                                        </SelectItem>
                                                    )
                                                })}
                                            </SelectContent>
                                        </Select>

                                        {/* Warning messages */}
                                        {allReserved && watchedDateDebut ? (
                                            <div className="flex items-center gap-2 p-2 mt-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded">
                                                <AlertCircleIcon className="size-4" />
                                                <span className="font-bold">Attention : Toutes les machines sont réservées pour cette date !</span>
                                            </div>
                                        ) : unavailableIds.length > 0 && watchedDateDebut && (
                                            <FormDescription className="text-[10px] text-amber-600 font-medium">
                                                Certaines machines sont déjà réservées pour le {format(new Date(watchedDateDebut), 'dd/MM/yyyy')}.
                                            </FormDescription>
                                        )}
                                        <FormMessage />
                                    </FormItem>
                                )
                            }}
                        />

                        <FormField
                            control={form.control}
                            name="offre"
                            render={({ field }: { field: any }) => (
                                <FormItem>
                                    <div className="flex items-center justify-between">
                                        <FormLabel className="uppercase text-xs font-bold text-muted-foreground text-indigo-600">Offre / Formule</FormLabel>
                                        <Button type="button" variant="ghost" size="icon" className="size-6 text-slate-400 hover:text-indigo-600" onClick={fetchSettings} disabled={isLoadingSettings} title="Actualiser le catalogue">
                                            <RefreshCw className={`size-3 ${isLoadingSettings ? "animate-spin" : ""}`} />
                                        </Button>
                                    </div>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="border-indigo-100 focus:ring-indigo-500">
                                                <SelectValue placeholder={isLoadingSettings ? "Chargement des formules..." : "-- Choisir une formule --"} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {isLoadingSettings ? (
                                                <div className="flex items-center justify-center p-4 text-xs text-muted-foreground italic">
                                                    <Loader2Icon className="size-4 animate-spin mr-2" /> Chargement...
                                                </div>
                                            ) : statusSettings?.offres && statusSettings.offres.length > 0 ? (
                                                statusSettings.offres.map((off: any, idx: number) => (
                                                    <SelectItem key={idx} value={off.name}>
                                                        {off.name} ({off.price}€)
                                                    </SelectItem>
                                                ))
                                            ) : (
                                                <>
                                                    <SelectItem value="standard">Formule Standard</SelectItem>
                                                    <SelectItem value="premium">Formule Premium</SelectItem>
                                                </>
                                            )}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Catalogue Options Selection */}
                        {isLoadingSettings ? (
                            <div className="md:col-span-2 flex items-center gap-2 text-xs text-muted-foreground italic p-2 border border-dashed rounded bg-slate-50">
                                <Loader2Icon className="size-3 animate-spin" /> Chargement des options...
                            </div>
                        ) : (
                            <div className="md:col-span-2 space-y-3 pt-2">
                                <div className="flex items-center justify-between">
                                    <FormLabel className="uppercase text-xs font-bold text-muted-foreground text-pink-600 flex items-center gap-1">
                                        <CameraIcon className="size-3" /> Options du catalogue
                                    </FormLabel>
                                    <Button type="button" variant="ghost" size="icon" className="size-6 text-slate-400 hover:text-pink-600" onClick={fetchSettings} disabled={isLoadingSettings} title="Actualiser le catalogue">
                                        <RefreshCw className={`size-3 ${isLoadingSettings ? "animate-spin" : ""}`} />
                                    </Button>
                                </div>

                                {statusSettings?.options && statusSettings.options.length > 0 ? (
                                    <>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {statusSettings.options.map((opt: any, idx: number) => {
                                                const isSelected = (watchedOptions || []).some((so: any) => so.name === opt.name);
                                                return (
                                                    <div key={idx} className={`flex items-center space-x-2 p-2 rounded border transition-colors ${isSelected ? 'bg-pink-50 border-pink-200' : 'bg-slate-50 border-slate-100 hover:border-pink-100'}`}>
                                                        <Checkbox
                                                            id={`opt-${idx}`}
                                                            checked={isSelected}
                                                            onCheckedChange={(checked) => {
                                                                const current = form.getValues("selected_options") || [];
                                                                if (checked) {
                                                                    form.setValue("selected_options", [...current, { name: opt.name, price: opt.price }]);
                                                                } else {
                                                                    form.setValue("selected_options", current.filter((so: any) => so.name !== opt.name));
                                                                }
                                                            }}
                                                        />
                                                        <label
                                                            htmlFor={`opt-${idx}`}
                                                            className="text-xs font-medium leading-none cursor-pointer flex-1 flex justify-between items-center"
                                                        >
                                                            <span className={isSelected ? 'text-pink-900 font-bold' : 'text-slate-600'}>{opt.name}</span>
                                                            <span className="text-[10px] bg-white px-1.5 py-0.5 rounded border font-mono">{opt.price}€</span>
                                                        </label>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <FormDescription className="text-[10px]">Cochez les options à inclure. Le prix total se met à jour automatiquement en fonction de vos choix.</FormDescription>
                                    </>
                                ) : (
                                    <div className="p-4 border border-dashed rounded bg-slate-50 text-center">
                                        <p className="text-xs text-muted-foreground italic">Aucune option trouvée dans votre catalogue.</p>
                                        <p className="text-[10px] text-muted-foreground mt-1">Configurez-les dans l'onglet "Personnalisation" → "Catalogue" et n'oubliez pas d'enregistrer.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        <FormField
                            control={form.control}
                            name="source_contact"
                            render={({ field }: { field: any }) => (
                                <FormItem>
                                    <FormLabel className="uppercase text-xs font-bold text-muted-foreground">Source du contact</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Source..." />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="site">Site internet</SelectItem>
                                            <SelectItem value="telephone">Téléphone</SelectItem>
                                            <SelectItem value="facebook">Facebook / Instagram</SelectItem>
                                            <SelectItem value="leboncoin">Leboncoin</SelectItem>
                                            <SelectItem value="bouche">Bouche à oreille</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                {/* Pricing */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                            <EuroIcon className="size-5 text-primary" />
                            Tarification
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <FormField
                                control={form.control}
                                name="prix_total"
                                render={({ field }: { field: any }) => (
                                    <FormItem>
                                        <FormLabel className="uppercase text-xs font-bold text-muted-foreground">Prix Total (€)</FormLabel>
                                        <FormControl>
                                            <Input
                                                inputMode="decimal"
                                                className="font-bold text-lg text-primary"
                                                {...field}
                                                value={field.value ?? "0"}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="frais_livraison"
                                render={({ field }: { field: any }) => (
                                    <FormItem>
                                        <FormLabel className="uppercase text-xs font-bold text-emerald-600 italic">
                                            {statusSettings?.label_livraison || "Livraison"} (€)
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                inputMode="decimal"
                                                className="border-emerald-100 focus-visible:ring-emerald-500 text-emerald-600"
                                                {...field}
                                                value={field.value ?? "0"}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="remise"
                                render={({ field }: { field: any }) => (
                                    <FormItem>
                                        <FormLabel className="uppercase text-xs font-bold text-pink-600">Remise (€)</FormLabel>
                                        <FormControl>
                                            <Input
                                                inputMode="decimal"
                                                className="border-pink-200 focus-visible:ring-pink-500 text-pink-600"
                                                {...field}
                                                value={field.value ?? "0"}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="acompte_recu"
                                render={({ field }: { field: any }) => (
                                    <FormItem>
                                        <FormLabel className="uppercase text-xs font-bold text-muted-foreground">Acompte (€)</FormLabel>
                                        <FormControl>
                                            <Input
                                                inputMode="decimal"
                                                {...field}
                                                value={field.value ?? "0"}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />


                        </div>

                        <Separator />

                        <FormField
                            control={form.control}
                            name="note_interne"
                            render={({ field }: { field: any }) => (
                                <FormItem>
                                    <FormLabel className="uppercase text-xs font-bold text-muted-foreground">Note interne</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Note privée..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                    </CardContent>
                </Card>

                {/* Section SUIVI */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-bold uppercase tracking-wider flex items-center gap-2">
                            <ScrollTextIcon className="size-5 text-primary" />
                            Suivi du dossier
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Swich 1: Contrat Signé */}
                            <FormField
                                control={form.control}
                                name="contrat_signe"
                                render={({ field }: { field: any }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border bg-white p-3 shadow-sm">
                                        <div className="space-y-0.5">
                                            <FormLabel className="text-xs font-medium">Contrat Signé</FormLabel>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            {/* Swich 2: Acompte Reçu */}
                            <FormField
                                control={form.control}
                                name="acompte_paye"
                                render={({ field }: { field: any }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border bg-white p-3 shadow-sm">
                                        <div className="space-y-0.5">
                                            <FormLabel className="text-xs font-medium">Acompte Reçu</FormLabel>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            {/* Swich 3: Solde Reçu */}
                            <FormField
                                control={form.control}
                                name="solde_paye"
                                render={({ field }: { field: any }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border bg-white p-3 shadow-sm">
                                        <div className="space-y-0.5">
                                            <FormLabel className="text-xs font-medium">Solde Reçu</FormLabel>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            {/* Switch 4: Design Validé (Conditional) */}
                            {form.watch("selected_options")?.some((opt: any) => opt.name.toLowerCase().includes("template")) && (
                                <FormField
                                    control={form.control}
                                    name="design_valide"
                                    render={({ field }: { field: any }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border bg-white p-3 shadow-sm">
                                            <div className="space-y-0.5">
                                                <FormLabel className="text-xs font-medium">Design Validé</FormLabel>
                                            </div>
                                            <FormControl>
                                                <Switch
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            )}
                        </div>
                    </CardContent>
                </Card>

                <div className="sticky bottom-0 bg-background/95 backdrop-blur p-4 border-t flex justify-end gap-3 shadow-lg -mx-1 -mb-1 rounded-b-lg">
                    {onCancel && (
                        <Button type="button" variant="outline" onClick={onCancel} className="md:w-auto">
                            Annuler
                        </Button>
                    )}
                    <div className="flex flex-col items-end gap-1">
                        {Object.keys(form.formState.errors).length > 0 && (
                            <div className="text-[10px] text-red-500 font-bold flex items-center gap-1 animate-pulse mb-1">
                                <AlertCircleIcon className="size-3" />
                                {Object.keys(form.formState.errors).length} champ(s) non valide(s)
                            </div>
                        )}
                        <Button type="submit" size="lg" disabled={isSaving} className="flex-1 md:flex-none shadow-lg shadow-primary/20">
                            {isSaving ? (
                                <>
                                    <Loader2Icon className="mr-2 size-4 animate-spin" />
                                    Enregistrement...
                                </>
                            ) : (
                                "Enregistrer"
                            )}
                        </Button>
                    </div>
                </div>

            </form>
        </Form>
    )
}
