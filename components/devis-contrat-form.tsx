"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import {
    CalendarIcon, UserIcon, CalendarDaysIcon, EuroIcon, FileTextIcon, CameraIcon, Bot, Loader2Icon, RefreshCw,
    EyeIcon, SendIcon, CheckCircleIcon, ScrollTextIcon, DownloadIcon, AlertCircleIcon, LinkIcon, TruckIcon
} from "lucide-react"
import { format, addDays } from "date-fns"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useSaveStatus } from "@/context/save-status-context"
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
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { ContractPreview } from "@/components/contract-preview"
import { SendEmailDialog } from "@/components/send-email-dialog"

import { supabase } from "@/lib/supabase"
import { Label } from "@/components/ui/label"
import { pdf } from "@react-pdf/renderer"
import { ContractDocument } from "@/components/contract-pdf"

const DEFAULT_SETTINGS = {
    nom_societe: "Mon Entreprise",
    offres: [
        { name: "Basic", price: "150" },
        { name: "Eclat", price: "250" },
        { name: "Prestige", price: "350" }
    ],
    options: [],
    label_livraison: "Frais de déplacement",
    logo_base64: "",
    logo_url: "",
    logo_width: 100
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
    lieu: z.string().nullable().default(""),
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
    acompte_methode: z.string().nullable().optional(),
    acompte_date: z.string().nullable().optional(),
    contrat_signe: z.boolean().default(false),
    solde_paye: z.boolean().default(false),
    solde_methode: z.string().nullable().optional(),
    solde_date: z.string().nullable().optional(),
    design_valide: z.boolean().default(false),
    etat: z.string().default("Contact"),
    note_interne: z.string().nullable().default(""),
    selected_options: z.array(z.object({
        name: z.string(),
        price: z.string()
    })).default([]),
    signature_client_base64: z.string().nullable().optional(),
    date_signature_client: z.string().nullable().optional(),
    // Dynamic workflow status - keys are step indices ("0", "1", etc.)
    workflow_status: z.record(z.string(), z.boolean()).default({}),
})

interface DevisContratFormProps {
    mode: "devis" | "contrat"
    initialData?: any
    onSuccess?: (data: any, keepOpen?: boolean) => void
    onCancel?: () => void
}

export function DevisContratForm({ mode: initialMode, initialData, onSuccess, onCancel }: DevisContratFormProps) {
    const [internalMode, setInternalMode] = React.useState<"devis" | "contrat">(initialMode)
    const { setSaving, setSaved, setError } = useSaveStatus()
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
            etat: internalMode === "contrat" ? "Validé" : "Contact",
            prix_total: "0",
            frais_livraison: "0",
            remise: "0",
            acompte_recu: "0",
            acompte_paye: false,
            acompte_methode: "",
            acompte_date: "",
            contrat_signe: false,
            solde_paye: false,
            solde_methode: "",
            solde_date: "",
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

    // Auto-set payment dates when switches are toggled on
    const acomptePaye = form.watch("acompte_paye")
    const soldePaye = form.watch("solde_paye")

    React.useEffect(() => {
        if (acomptePaye && !form.getValues("acompte_date")) {
            // Set current datetime (YYYY-MM-DDThh:mm)
            // Set current datetime (YYYY-MM-DDThh:mm)
            const now = format(new Date(), "yyyy-MM-dd'T'HH:mm")
            form.setValue("acompte_date", now, { shouldValidate: true, shouldDirty: true, shouldTouch: true })
        }
    }, [acomptePaye, form])

    React.useEffect(() => {
        if (soldePaye && !form.getValues("solde_date")) {
            // Set current datetime (YYYY-MM-DDThh:mm)
            const now = format(new Date(), "yyyy-MM-dd'T'HH:mm")
            form.setValue("solde_date", now, { shouldValidate: true, shouldDirty: true, shouldTouch: true })
        }
    }, [soldePaye, form])

    // Auto-set Date Fin to J+1 when Date Debut is set
    const watchedDateDebutForAuto = form.watch("date_debut")
    React.useEffect(() => {
        if (watchedDateDebutForAuto && !form.getValues("date_fin")) {
            try {
                const dateDebut = new Date(watchedDateDebutForAuto)
                if (!isNaN(dateDebut.getTime())) {
                    const dateFin = addDays(dateDebut, 1)
                    form.setValue("date_fin", format(dateFin, "yyyy-MM-dd"), { shouldValidate: true, shouldDirty: true, shouldTouch: true })
                }
            } catch (e) {
                console.error("Error setting auto date_fin", e)
            }
        }
    }, [watchedDateDebutForAuto, form])



    const [isSaving, setIsSaving] = React.useState(false)
    const isAutoSavingRef = React.useRef(false)
    const autoSaveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

    const [unavailableIds, setUnavailableIds] = React.useState<string[]>([])
    const [isCheckingAvailability, setIsCheckingAvailability] = React.useState(false)
    const watchedDateDebut = form.watch("date_debut")

    // Quick save a single field directly to Supabase without full form submission
    const quickSaveField = React.useCallback(async (fieldName: string, value: any) => {
        if (!initialData?.id) return

        const table = initialData.id.startsWith('D') ? 'devis' : 'contrats'
        const currentData = initialData.data || {}

        const updatedData = {
            ...currentData,
            [fieldName]: value
        }

        setSaving()
        try {
            const { error } = await supabase
                .from(table)
                .update({ data: updatedData })
                .eq('id', initialData.id)

            if (error) {
                console.error('Quick save error:', error)
                setError(error.message)
            } else {
                setSaved()
                if (initialData.data) {
                    initialData.data[fieldName] = value
                }
            }
        } catch (e: any) {
            console.error('Quick save exception:', e)
            setError(e.message)
        }
    }, [initialData, setSaving, setSaved, setError])

    // Groups multiple fields into a single update to avoid race conditions
    const quickSaveData = React.useCallback(async (updates: Record<string, any>) => {
        if (!initialData?.id) return

        const table = initialData.id.startsWith('D') ? 'devis' : 'contrats'
        const currentData = initialData.data || {}

        const updatedData = {
            ...currentData,
            ...updates
        }

        setSaving()
        try {
            const { error } = await supabase
                .from(table)
                .update({ data: updatedData })
                .eq('id', initialData.id)

            if (error) {
                console.error('Quick save data error:', error)
                setError(error.message)
            } else {
                setSaved()
                if (initialData.data) {
                    Object.assign(initialData.data, updates)
                }
            }
        } catch (e: any) {
            console.error('Quick save data exception:', e)
            setError(e.message)
        }
    }, [initialData, setSaving, setSaved, setError])

    // Trigger auto-save
    const triggerAutoSave = React.useCallback(() => {
        if (!initialData?.id) return // Don't auto-save new records (wait for first manual save)

        if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current)
        autoSaveTimeoutRef.current = setTimeout(async () => {
            console.log("Auto-save trigger: checking form validity...")
            const isValid = await form.trigger()
            if (isValid) {
                const values = form.getValues()
                console.log("Form valid. Executing auto-save...")
                await onSubmit(values, true, undefined, true)
            } else {
                console.warn("Auto-save aborted: form is invalid", form.formState.errors)
            }
        }, 1000) // Reduced to 1s
    }, [form, initialData?.id])

    // Cleanup on unmount
    React.useEffect(() => {
        return () => {
            if (autoSaveTimeoutRef.current) {
                clearTimeout(autoSaveTimeoutRef.current)
            }
        }
    }, [])

    // NOTE: General auto-save disabled. Switches use quickSaveField for immediate saves.
    // Other fields require manual save via the button.
    // const watchedValues = form.watch()
    // React.useEffect(() => {
    //     if (form.formState.isDirty) {
    //         triggerAutoSave()
    //     }
    // }, [watchedValues, triggerAutoSave, form.formState.isDirty])


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

                if (internalMode === 'devis' && initialData?.id) {
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

                if (internalMode === 'contrat' && initialData?.id) {
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

    async function onSubmit(values: z.infer<typeof formSchema>, keepOpen: boolean = false, forcedMode?: "devis" | "contrat", isAutoSave: boolean = false) {
        if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current)

        if (isAutoSavingRef.current && isAutoSave) {
            console.log("Auto-save already in progress, skipping...")
            return
        }

        // If a manual save is triggered while another is in progress, we might still want to proceed 
        // but it's risky. Let's at least ensure we don't have multiple overlapping saves if possible.
        // We'll wait up to 2 seconds for previous save to finish if this is a manual save.
        if (isAutoSavingRef.current && !isAutoSave) {
            console.warn("Manual save triggered while another save is in progress. Waiting...")
            let retries = 0
            while (isAutoSavingRef.current && retries < 10) {
                await new Promise(r => setTimeout(r, 200))
                retries++
            }
        }

        isAutoSavingRef.current = true

        if (isAutoSave) {
            setSaving()
        } else {
            setIsSaving(true)
            setSaving()
        }
        const currentMode = forcedMode || internalMode
        const table = currentMode === "devis" ? "devis" : "contrats"

        console.log(`[onSubmit] table=${table} currentMode=${currentMode} initialMode=${initialMode} internalMode=${internalMode}`)

        // For contracts, we ensure the 'etat' is properly set if not already
        // Force-read key dates and methods to ensure they are saved
        const finalValues = {
            ...values,
            acompte_date: values.acompte_date || form.getValues("acompte_date"),
            solde_date: values.solde_date || form.getValues("solde_date"),
            acompte_methode: values.acompte_methode || form.getValues("acompte_methode"),
            solde_methode: values.solde_methode || form.getValues("solde_methode"),
            etat: values.etat || (currentMode === "contrat" ? "Validé" : "Contact")
        }

        const record = {
            nom_client: finalValues.nom_client,
            prix_total: finalValues.prix_total,
            date_debut: finalValues.date_debut,
            data: {
                ...finalValues,
                // Ensure access_tokens are present for both devis and contrats in JSON data
                access_token_devis: initialData?.data?.access_token_devis || (currentMode === 'devis' ? (initialData?.data?.access_token || initialData?.access_token || generateUUID()) : (initialData?.data?.access_token_devis || generateUUID())),
                access_token_contrat: initialData?.data?.access_token_contrat || (currentMode === 'contrat' ? (initialData?.data?.access_token || initialData?.access_token || generateUUID()) : (initialData?.data?.access_token_contrat || generateUUID())),
                // Keep legacy token for backward compatibility
                access_token: initialData?.data?.access_token || initialData?.access_token || generateUUID(),
                // Robust reset if flag is unchecked
                ...(finalValues.contrat_signe === false ? {
                    signature_client_base64: null,
                    date_signature_client: null,
                    date_signature_devis: null,
                    date_signature_contrat: null,
                    devis_signe: false,
                    contrat_signe: false
                } : {})
            }
        }

        try {
            console.log(`Saving to ${table}...`, record)


            let savedRecord

            if (initialData?.id) {
                // Check if mode changed
                if (currentMode !== initialMode) {
                    console.log(`Mode changed from ${initialMode} to ${currentMode}. Migrating record...`)

                    // 1. Generate new ID
                    const newId = generateReference(currentMode)
                    const newItem = {
                        id: newId,
                        ...record,
                        data: {
                            ...record.data,
                            reference: newId,
                            // If migrating to contrat, mark as signed
                            contrat_signe: currentMode === 'contrat' ? true : record.data?.contrat_signe,
                            access_token_devis: initialData?.data?.access_token_devis || (currentMode === 'devis' ? (initialData?.data?.access_token || initialData?.access_token || generateUUID()) : (initialData?.data?.access_token_devis || generateUUID())),
                            access_token_contrat: initialData?.data?.access_token_contrat || (currentMode === 'contrat' ? (initialData?.data?.access_token || initialData?.access_token || generateUUID()) : (initialData?.data?.access_token_contrat || generateUUID())),
                            access_token: initialData?.data?.access_token || initialData?.access_token || generateUUID()
                        }
                    }

                    // 2. Insert into the new table
                    const { data: insertData, error: insertError } = await supabase
                        .from(currentMode === "devis" ? "devis" : "contrats")
                        .insert([newItem])
                        .select()
                        .single()

                    if (insertError) throw insertError

                    // 3. Delete from the old table
                    const { error: deleteError } = await supabase
                        .from(initialMode === "devis" ? "devis" : "contrats")
                        .delete()
                        .eq('id', initialData.id)

                    if (deleteError) {
                        console.error("Migration delete error (insert succeeded):", deleteError)
                        // Note: insert succeeded but delete failed. We might have a duplicate across tables.
                        // We continue anyway as the main goal (new record) is achieved.
                    }

                    savedRecord = insertData
                } else {
                    // Standard update
                    const { data, error: updateError } = await supabase
                        .from(table)
                        .update(record)
                        .eq('id', initialData.id)
                        .select()
                        .single()
                    if (updateError) throw updateError
                    savedRecord = data
                }
            } else {
                // Generate custom ID (Reference)
                const datePart = finalValues.date_debut ? format(new Date(finalValues.date_debut as string), "yyyyMMdd") : "00000000"
                const initials = finalValues.nom_client
                    ? finalValues.nom_client.split(' ').map((n: string) => n[0]).join('').toUpperCase()
                    : "XX"

                const prefix = currentMode === 'contrat' ? 'C' : 'D'
                const newId = `${prefix}-${datePart}-${initials}`

                const newItem = {
                    id: newId,
                    ...record,
                    // Store reference in data jsonb as well for redundancy
                    data: {
                        ...record.data,
                        reference: newId,
                        access_token_devis: currentMode === 'devis' ? generateUUID() : generateUUID(),
                        access_token_contrat: currentMode === 'contrat' ? generateUUID() : generateUUID(),
                        access_token: generateUUID() // legacy
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

            // Ensure parent knows whether to keep modal open or not
            if (onSuccess) onSuccess(savedRecord, keepOpen || isAutoSave)

            // If it was auto-save, we reset the dirty state so next change triggers correctly
            // UNLESS it was a migration (ID changed), in which case reset will happen via initialData prop
            if (isAutoSave && savedRecord.id === (initialData?.id || "")) {
                form.reset(values, { keepValues: true })
            }
        } catch (e: any) {
            console.error("Save error details:", JSON.stringify(e, null, 2))
            console.error("Save error message:", e.message || e)
            if (isAutoSave) setError(e.message)
            else alert(`Erreur lors de l'enregistrement: ${e.message || "Erreur inconnue"}`)
        } finally {
            if (isAutoSave) {
                isAutoSavingRef.current = false
                setSaved()
            } else {
                setIsSaving(false)
                setSaved() // Also update global indicator
            }
        }
    }

    const [statusSettings, setStatusSettings] = React.useState<any>(DEFAULT_SETTINGS)
    const [isLoadingSettings, setIsLoadingSettings] = React.useState(true)
    const [showPreview, setShowPreview] = React.useState(false)
    const [isSignatureDialogOpen, setIsSignatureDialogOpen] = React.useState(false)
    const [showFacturePreview, setShowFacturePreview] = React.useState(false)
    const [showDevisPreview, setShowDevisPreview] = React.useState(false)
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

    // Helper to generate UUID with fallback
    const generateUUID = () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    const generateReference = (type: "devis" | "contrat" | "invoice" = internalMode as any) => {
        const prefix = type === "invoice" ? "F" : (type === "contrat" ? "C" : "D")

        const formValues = form.getValues()
        // If we have an existing ID/Reference, use its core parts but fix the prefix
        // We also add a timestamp safeguard to prevent collisions during rapid migrations
        const ref = initialData?.id
        if (ref && ref.match(/^[DCAF]-[0-9]{8}-[A-Z0-9]+$/)) {
            // If we are migrating (prefix doesn't match type), we must ensure the new ID is unique
            // If we just swap prefix (D->C), we might hit a pre-existing C ID if migration failed before/zombie state
            if (!ref.startsWith(prefix)) {
                const core = ref.substring(1)
                // Check if it already has a suffix? No easy way.
                // We will append a random hex char to ensure uniqueness on migration retries
                const suffix = Math.floor(Math.random() * 16).toString(16).toUpperCase()
                return `${prefix}${core}-${suffix}`
            }
            return `${prefix}${ref.substring(1)}`
        }

        const datePart = formValues.date_debut ? format(new Date(formValues.date_debut as string), "yyyyMMdd") : format(new Date(), "yyyyMMdd")
        const initials = formValues.nom_client
            ? formValues.nom_client.split(' ').map((n: string) => n[0]).join('').toUpperCase()
            : "XX"
        return `${prefix}-${datePart}-${initials}`
    }



    const [emailType, setEmailType] = React.useState<"contract" | "invoice" | "devis">("contract")

    const handleSendEmail = async (data: { to: string; subject: string; message: string; attachRIB?: boolean }) => {
        try {
            // Generate PDF using react-pdf
            const blob = await pdf(
                <ContractDocument
                    data={formValues}
                    settings={statusSettings}
                    isInvoice={emailType === "invoice"}
                    mode={internalMode}
                />
            ).toBlob();

            // Convert to Base64
            const reader = new FileReader();
            const base64Promise = new Promise<string>((resolve) => {
                reader.onloadend = () => {
                    const base64 = (reader.result as string).split(',')[1];
                    resolve(base64);
                };
            });
            reader.readAsDataURL(blob);
            const base64Content = await base64Promise;

            const filename = `${emailType === 'invoice' ? 'Facture' : (emailType === 'devis' ? 'Devis' : (internalMode === 'contrat' ? 'Contrat' : 'Devis'))}_${generateReference(emailType as any)}.pdf`

            const response = await fetch('/api/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...data,
                    fromName: statusSettings?.nom_societe,
                    attachments: [
                        {
                            filename: filename,
                            content: base64Content,
                        },
                        ...(data.attachRIB && statusSettings?.rib_url ? [{
                            filename: `RIB_${statusSettings.nom_societe || 'Societe'}.${statusSettings.rib_url.split('.').pop()?.split('?')[0] || 'pdf'}`,
                            path: statusSettings.rib_url
                        }] : [])
                    ]
                }),
            })

            const result = await response.json().catch(() => ({})); // Handle empty or non-json responses
            if (!response.ok) {
                console.error("API Error Response:", response.status, response.statusText, result);
                throw new Error(`${response.status} ${response.statusText} - ${result.error?.message || result.error || "Erreur inconnue"}`);
            }

            alert(`Email envoyé avec succès !`)
            setShowEmail(false)
        } catch (error: any) {
            console.error("Failed to send email with attachment", error)
            alert(`Erreur d'envoi : ${error.message}`)
        }
    }

    const handleDownloadPDF = async (type: "contract" | "invoice" | "devis" = "contract") => {
        try {
            const blob = await pdf(
                <ContractDocument
                    data={formValues}
                    settings={statusSettings}
                    isInvoice={type === "invoice"}
                    mode={internalMode}
                />
            ).toBlob()

            const filename = `${type === 'invoice' ? 'Facture' : (type === 'devis' ? 'Devis' : (internalMode === 'contrat' ? 'Contrat' : 'Devis'))}_${generateReference(type as any)}.pdf`

            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = filename
            link.click()
            URL.revokeObjectURL(url)
        } catch (error) {
            console.error("PDF Generation error", error)
        }
    }


    const computedEmail = React.useMemo(() => {
        const type = emailType;
        let rawSubject = "";
        let rawBody = "";

        if (type === "devis") {
            rawSubject = statusSettings?.email_devis_subject || "Votre Devis - {{company_name}}";
            rawBody = statusSettings?.email_devis_body || "Bonjour {{client_name}},\n\nVoici le devis {{doc_number}} concernant votre événement.\n\nCordialement,\n{{company_name}}";
        } else if (type === "invoice") {
            rawSubject = statusSettings?.email_facture_subject || "Votre Facture - {{company_name}}";
            rawBody = statusSettings?.email_facture_body || "Bonjour {{client_name}},\n\nVoici la facture {{doc_number}}.\n\nCordialement,\n{{company_name}}";
        } else {
            // contract
            rawSubject = statusSettings?.email_contrat_subject || "Votre Contrat - {{company_name}}";
            rawBody = statusSettings?.email_contrat_body || "Bonjour {{client_name}},\n\nVoici le contrat {{doc_number}}. Merci de le signer pour valider la réservation.\n\nCordialement,\n{{company_name}}";
        }

        const defaultName = type === "devis"
            ? (statusSettings?.email_devis_name || "Modèle par défaut")
            : (type === "invoice"
                ? (statusSettings?.email_facture_name || "Modèle par défaut")
                : (statusSettings?.email_contrat_name || "Modèle par défaut"));

        const signingLink = initialData?.access_token ? `${typeof window !== 'undefined' ? window.location.origin : ''}/sign/${initialData.access_token}` : ""

        const replacements: Record<string, string> = {
            "{{client_name}}": form.getValues("nom_client") || "Client",
            "{{client_phone}}": form.getValues("telephone_client") || "",
            "{{client_email}}": form.getValues("email_client") || "",
            "{{client_address}}": form.getValues("adresse_client") || "",
            "{{doc_number}}": generateReference(type === "contract" ? "contrat" : type),
            "{{doc_type}}": type === "invoice" ? "Facture" : (type === "devis" ? "Devis" : "Contrat"),
            "{{company_name}}": statusSettings?.nom_societe || "Mon Entreprise",
            "{{event_date}}": (() => {
                const d = form.getValues("date_debut");
                return d ? format(new Date(d), "dd/MM/yyyy") : "Date non définie";
            })(),
            "{{event_time}}": form.getValues("heure_debut") || "",
            "{{event_end_time}}": form.getValues("heure_fin") || "",
            "{{event_location}}": form.getValues("lieu") || "Lieu non défini",
            "{{total_amount}}": `${parseFloat(form.getValues("prix_total") || "0").toFixed(2)}€`,
            "{{deposit_amount}}": (() => {
                const acc = form.getValues("acompte_recu");
                return acc ? `${parseFloat(acc).toFixed(2)}€` : "0.00€";
            })(),
            "{{balance_amount}}": (parseFloat(form.getValues("prix_total") || "0") - parseFloat(form.getValues("acompte_recu") || "0")).toFixed(2) + "€",
            "{{company_logo}}": (statusSettings as any)?.logo_url
                ? `<img src="${(statusSettings as any).logo_url}" width="${(statusSettings as any).logo_width || 100}" style="width: ${(statusSettings as any).logo_width || 100}px; height: auto; display: inline-block;" alt="Logo" />`
                : ((statusSettings as any)?.logo_base64 ? `<img src="${(statusSettings as any).logo_base64}" width="${(statusSettings as any).logo_width || 100}" style="width: ${(statusSettings as any).logo_width || 100}px; height: auto; display: inline-block;" alt="Logo" />` : ""),
            "{{signing_link}}": signingLink
        };

        let subject = rawSubject;
        let body = rawBody;

        Object.entries(replacements).forEach(([key, value]) => {
            subject = subject.split(key).join(value || "");
            body = body.split(key).join(value || "");
        });

        const templates = (statusSettings?.mail_templates || []).filter((t: any) => t.type === (type === "invoice" ? "facture" : (type === "contract" ? (internalMode === "contrat" ? "contrat" : "devis") : type)))

        return {
            subject,
            message: body,
            templates,
            replacements,
            defaultName,
            signingLink
        };
    }, [emailType, statusSettings, form.watch(), internalMode, initialData])
    // Handle switching between Devis and Contrat
    const handleModeSwitch = (newMode: "devis" | "contrat") => {
        // 1. Update visual mode immediately
        setInternalMode(newMode)

        // 2. Trigger auto-save logic explicitly passing the new mode
        // This avoids stale state issues during migration
        form.handleSubmit((data) => onSubmit(data, true, newMode))()
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => onSubmit(data, true), (err) => console.error("Form Submit Validation Errors:", JSON.stringify(err, null, 2)))} className="space-y-6">
                <Tabs defaultValue="infos" className="w-full">
                    <div className="sticky top-[-16px] bg-white z-40 pb-4 no-print -mx-6 px-6 border-b mb-6 shadow-sm flex flex-col gap-4">
                        <div className="bg-slate-50 p-1.5 rounded-xl border-2 border-slate-100 shadow-sm mb-4 relative">
                            {isSaving && (
                                <div className="absolute -top-6 right-0 text-[10px] text-indigo-500 font-bold animate-pulse flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" />
                                    Enregistrement...
                                </div>
                            )}
                            <Tabs value={internalMode} onValueChange={(v) => handleModeSwitch(v as any)} className="w-full">
                                <TabsList className="grid grid-cols-2 w-full h-12 bg-transparent gap-2">
                                    <TabsTrigger
                                        value="devis"
                                        className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-md font-bold transition-all gap-2 h-full"
                                    >
                                        <FileTextIcon className="size-4" /> DEVIS
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="contrat"
                                        className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-md font-bold transition-all gap-2 h-full"
                                    >
                                        <ScrollTextIcon className="size-4" /> CONTRAT
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>

                        <div className="flex flex-wrap justify-between items-center no-print gap-3">
                            <div className="flex items-center gap-3">
                                <Button
                                    type="button"
                                    variant="default"
                                    onClick={() => {
                                        const token = internalMode === 'devis'
                                            ? (initialData?.data?.access_token_devis || initialData?.access_token_devis)
                                            : (initialData?.data?.access_token_contrat || initialData?.access_token_contrat);

                                        if (token) {
                                            setIsSignatureDialogOpen(true)
                                        } else {
                                            form.handleSubmit((data) => {
                                                onSubmit(data, true).then(() => {
                                                    setIsSignatureDialogOpen(true)
                                                })
                                            })()
                                        }
                                    }}
                                    disabled={isSaving}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md gap-2"
                                >
                                    <span className="relative flex h-3 w-3 mr-1">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                                    </span>
                                    Signature electronique
                                </Button>

                                <Button
                                    type="submit"
                                    disabled={isSaving}
                                    className="h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md gap-2 px-4 uppercase text-[10px] tracking-wider"
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2Icon className="size-3 animate-spin" /> ENREGISTREMENT...
                                        </>
                                    ) : (
                                        "Enregistrer les modifications"
                                    )}
                                </Button>
                            </div>

                            <div className="inline-flex items-center gap-0.5 bg-slate-50 p-1 rounded-lg border border-slate-200 shadow-sm ml-auto">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => { e.preventDefault(); setShowPreview(true); }}
                                    className="gap-2 text-indigo-600 hover:bg-white hover:shadow-sm h-8 px-3 font-semibold transition-all"
                                >
                                    <EyeIcon className="size-4" /> {internalMode === 'contrat' ? 'Contrat' : 'Devis'}
                                </Button>
                                <div className="w-px h-4 bg-slate-200 mx-0.5" />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => { e.preventDefault(); handleDownloadPDF('contract'); }}
                                    className="h-8 w-8 text-slate-500 hover:text-slate-900 hover:bg-white hover:shadow-sm transition-all"
                                    title="Générer PDF"
                                >
                                    <DownloadIcon className="size-3.5" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => { e.preventDefault(); setEmailType('contract'); setShowEmail(true); }}
                                    className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-white hover:shadow-sm transition-all"
                                    title="Envoyer mail"
                                >
                                    <SendIcon className="size-3.5" />
                                </Button>
                            </div>
                        </div>

                        <TabsList className="grid grid-cols-3 w-full h-11 bg-slate-100/50 p-1 rounded-xl mt-2">
                            <TabsTrigger value="infos" className="flex items-center justify-center gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm font-bold transition-all h-full text-[10px] sm:text-xs uppercase tracking-wider">
                                <UserIcon className="size-3.5" />
                                Infos & Suivi
                            </TabsTrigger>
                            <TabsTrigger value="details" className="flex items-center justify-center gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm font-bold transition-all h-full text-[10px] sm:text-xs uppercase tracking-wider">
                                <CalendarDaysIcon className="size-3.5" />
                                Matériel & Tarifs
                            </TabsTrigger>
                            <TabsTrigger value="livraison" className="flex items-center justify-center gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm font-bold transition-all h-full text-[10px] sm:text-xs uppercase tracking-wider">
                                <TruckIcon className="size-3.5" />
                                Logistique
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <Dialog open={isSignatureDialogOpen} onOpenChange={(open) => {
                        setIsSignatureDialogOpen(open)
                    }}>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Lien de Signature Électronique - {internalMode === 'contrat' ? 'Contrat' : 'Devis'}</DialogTitle>
                                <DialogDescription>
                                    Partagez ce lien avec votre client pour qu'il puisse signer le {internalMode === 'contrat' ? 'contrat' : 'devis'} directement en ligne.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="flex items-center space-x-2 mt-4">
                                <div className="grid flex-1 gap-2">
                                    <Label htmlFor="link" className="sr-only">
                                        Lien
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            id="link"
                                            value={(() => {
                                                const token = internalMode === 'devis'
                                                    ? (initialData?.data?.access_token_devis || initialData?.access_token_devis)
                                                    : (initialData?.data?.access_token_contrat || initialData?.access_token_contrat);
                                                return token ? `${typeof window !== 'undefined' ? window.location.origin : ''}/sign/${token}` : `Enregistrez le ${internalMode} pour générer le lien`;
                                            })()}
                                            readOnly
                                            className="font-mono text-xs bg-slate-50"
                                        />
                                    </div>
                                </div>
                                {(() => {
                                    const token = internalMode === 'devis'
                                        ? (initialData?.data?.access_token_devis || initialData?.access_token_devis)
                                        : (initialData?.data?.access_token_contrat || initialData?.access_token_contrat);

                                    return token && (
                                        <Button type="button" size="sm" className="px-3" onClick={() => {
                                            const url = `${window.location.origin}/sign/${token}`
                                            navigator.clipboard.writeText(url)
                                            alert("Lien copié !")
                                        }}>
                                            <span className="sr-only">Copier</span>
                                            <LinkIcon className="h-4 w-4" />
                                        </Button>
                                    );
                                })()}
                            </div>
                            {!(internalMode === 'devis' ? (initialData?.data?.access_token_devis || initialData?.access_token_devis) : (initialData?.data?.access_token_contrat || initialData?.access_token_contrat)) && (
                                <Button
                                    type="button"
                                    onClick={() => form.handleSubmit((data) => onSubmit(data, true))()}
                                    disabled={isSaving}
                                    className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold"
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2Icon className="mr-2 size-3 animate-spin" />
                                            Génération du lien...
                                        </>
                                    ) : (
                                        "Générer le lien de signature"
                                    )}
                                </Button>
                            )}
                        </DialogContent>
                    </Dialog>

                    <Dialog open={showPreview} onOpenChange={setShowPreview}>
                        <DialogContent className="w-full h-full max-w-none md:max-w-5xl md:h-[90vh] md:rounded-xl p-0 overflow-hidden bg-slate-100 flex flex-col gap-0 border-none shadow-2xl">
                            <DialogHeader className="p-4 border-b bg-white flex flex-row justify-between items-center shadow-sm z-10 no-print space-y-0">
                                <div className="flex flex-col">
                                    <DialogTitle className="font-bold text-lg hidden md:block">{internalMode === 'contrat' ? 'Le Contrat' : 'Le Devis'}</DialogTitle>
                                    <DialogTitle className="font-bold md:hidden">{internalMode === 'contrat' ? 'Contrat' : 'Devis'}</DialogTitle>
                                    <DialogDescription className="sr-only">
                                        Visualisez le document avant de l'enregistrer ou de l'envoyer.
                                    </DialogDescription>
                                </div>
                                <div className="flex gap-2">
                                    <Button type="button" variant="outline" size="sm" onClick={() => handleDownloadPDF('contract')} className="gap-2">
                                        <DownloadIcon className="size-4" /> PDF
                                    </Button>
                                    <Button type="button" size="sm" onClick={() => { setEmailType('contract'); setShowEmail(true); }} className="gap-2">
                                        <SendIcon className="size-4" /> Envoyer
                                    </Button>
                                    <Button type="button" variant="ghost" size="sm" onClick={() => setShowPreview(false)}>Fermer</Button>
                                </div>
                            </DialogHeader>
                            <div className="flex-1 overflow-y-auto p-4 md:p-8">
                                <ContractPreview data={form.watch()} settings={statusSettings} mode={internalMode} />
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
                                    <Button type="button" variant="outline" size="sm" onClick={() => handleDownloadPDF('invoice')} className="gap-2 text-primary border-primary/20">
                                        <DownloadIcon className="size-4" /> PDF
                                    </Button>
                                    <Button type="button" size="sm" onClick={() => { setEmailType('invoice'); setShowEmail(true); }} className="gap-2">
                                        <SendIcon className="size-4" /> Envoyer
                                    </Button>
                                    <Button type="button" variant="ghost" size="sm" onClick={() => setShowFacturePreview(false)}>Fermer</Button>
                                </div>
                            </DialogHeader>
                            <div className="flex-1 overflow-y-auto p-4 md:p-8">
                                <ContractPreview data={form.watch()} settings={statusSettings} isInvoice={true} mode={internalMode} />
                            </div>
                        </DialogContent>
                    </Dialog>

                    <Dialog open={showDevisPreview} onOpenChange={setShowDevisPreview}>
                        <DialogContent className="w-full h-full max-w-none md:max-w-5xl md:h-[90vh] md:rounded-xl p-0 overflow-hidden bg-slate-100 flex flex-col gap-0 border-none shadow-2xl">
                            <DialogHeader className="p-4 border-b bg-white flex flex-row justify-between items-center shadow-sm z-10 no-print space-y-0">
                                <div className="flex flex-col">
                                    <DialogTitle className="font-bold text-lg hidden md:block">Le Devis</DialogTitle>
                                    <DialogTitle className="font-bold md:hidden">Devis</DialogTitle>
                                    <DialogDescription className="sr-only">
                                        Visualisez le devis avant de l'enregistrer ou de l'envoyer.
                                    </DialogDescription>
                                </div>
                                <div className="flex gap-2">
                                    <Button type="button" variant="outline" size="sm" onClick={() => handleDownloadPDF('devis')} className="gap-2">
                                        <DownloadIcon className="size-4" /> PDF
                                    </Button>
                                    <Button type="button" size="sm" onClick={() => { setEmailType('devis'); setShowEmail(true); }} className="gap-2">
                                        <SendIcon className="size-4" /> Envoyer
                                    </Button>
                                    <Button type="button" variant="ghost" size="sm" onClick={() => setShowDevisPreview(false)}>Fermer</Button>
                                </div>
                            </DialogHeader>
                            <div className="flex-1 overflow-y-auto p-4 md:p-8">
                                <ContractPreview data={form.watch()} settings={statusSettings} mode="devis" />
                            </div>
                        </DialogContent>
                    </Dialog>

                    <SendEmailDialog
                        open={showEmail}
                        onOpenChange={setShowEmail}
                        defaultEmail={form.watch("email_client") || ""}
                        defaultSubject={computedEmail.subject}
                        defaultMessage={computedEmail.message}
                        templates={computedEmail.templates}
                        replacements={computedEmail.replacements}
                        onSend={handleSendEmail}
                        hasRIB={!!statusSettings?.rib_url}
                        defaultTemplateName={computedEmail.defaultName}
                        signingLink={computedEmail.signingLink}
                    />


                    <div className="pt-2">

                        <TabsContent value="infos" className="space-y-6">
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
                                                    <Input
                                                        placeholder="06 12 34 56 78"
                                                        {...field}
                                                        onChange={(e) => {
                                                            const value = e.target.value.replace(/\D/g, "");
                                                            const formatted = value.match(/.{1,2}/g)?.join(" ") || value;
                                                            field.onChange(formatted.substring(0, 14)); // Limit to standard FR format length + spaces
                                                        }}
                                                    />
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
                                        {/* Switch 1: Contrat Signé (Fixed - special logic) */}
                                        <FormField
                                            control={form.control}
                                            name="contrat_signe"
                                            render={({ field }: { field: any }) => (
                                                <FormItem className="flex flex-row items-center justify-between rounded-lg border bg-white p-3 shadow-sm">
                                                    <div className="space-y-0.5">
                                                        <FormLabel className="text-xs font-medium">{statusSettings?.workflow_steps?.[0] || "Contrat Signé"}</FormLabel>
                                                    </div>
                                                    <FormControl>
                                                        <Switch
                                                            checked={field.value}
                                                            onCheckedChange={(checked) => {
                                                                field.onChange(checked)
                                                                if (!checked) {
                                                                    const cleanUpdates = {
                                                                        contrat_signe: false,
                                                                        devis_signe: false,
                                                                        signature_client_base64: null,
                                                                        date_signature_client: null,
                                                                        date_signature_devis: null,
                                                                        date_signature_contrat: null
                                                                    }
                                                                    form.setValue("signature_client_base64", null)
                                                                    form.setValue("date_signature_client", null)
                                                                    quickSaveData(cleanUpdates)
                                                                } else {
                                                                    quickSaveField("contrat_signe", true)
                                                                }
                                                            }}
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />

                                        {/* Switch 2: Acompte Reçu (Fixed - with payment method) */}
                                        <div className="flex flex-col gap-2 rounded-lg border bg-white p-3 shadow-sm">
                                            <FormField
                                                control={form.control}
                                                name="acompte_paye"
                                                render={({ field }) => (
                                                    <FormItem className="flex flex-row items-center justify-between space-y-0">
                                                        <FormLabel className="text-xs font-medium">{statusSettings?.workflow_steps?.[1] || "Acompte Reçu"}</FormLabel>
                                                        <FormControl>
                                                            <Switch
                                                                checked={field.value}
                                                                onCheckedChange={(checked) => {
                                                                    field.onChange(checked)
                                                                    quickSaveField("acompte_paye", checked)
                                                                }}
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                            {form.watch("acompte_paye") && (
                                                <>
                                                    <FormField
                                                        control={form.control}
                                                        name="acompte_methode"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <Select onValueChange={field.onChange} value={field.value || undefined}>
                                                                    <FormControl>
                                                                        <SelectTrigger className="h-8 text-xs w-full">
                                                                            <SelectValue placeholder="Mode de paiement" />
                                                                        </SelectTrigger>
                                                                    </FormControl>
                                                                    <SelectContent>
                                                                        <SelectItem value="Especes">Espèces</SelectItem>
                                                                        <SelectItem value="Virement">Virement</SelectItem>
                                                                        <SelectItem value="Cheque">Chèque</SelectItem>
                                                                        <SelectItem value="PayPal">PayPal</SelectItem>
                                                                        <SelectItem value="CB">Mettle / CB</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <FormField
                                                        control={form.control}
                                                        name="acompte_date"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormControl>
                                                                    <Input type="datetime-local" className="h-8 text-xs" {...field} value={field.value || ""} />
                                                                </FormControl>
                                                            </FormItem>
                                                        )}
                                                    />
                                                </>
                                            )}
                                        </div>

                                        {/* Switch 3: Solde Reçu (Fixed - with payment method) */}
                                        <div className="flex flex-col gap-2 rounded-lg border bg-white p-3 shadow-sm">
                                            <FormField
                                                control={form.control}
                                                name="solde_paye"
                                                render={({ field }) => (
                                                    <FormItem className="flex flex-row items-center justify-between space-y-0">
                                                        <FormLabel className="text-xs font-medium">{statusSettings?.workflow_steps?.[2] || "Solde Reçu"}</FormLabel>
                                                        <FormControl>
                                                            <Switch
                                                                checked={field.value}
                                                                onCheckedChange={(checked) => {
                                                                    field.onChange(checked)
                                                                    quickSaveField("solde_paye", checked)
                                                                }}
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                            {form.watch("solde_paye") && (
                                                <>
                                                    <FormField
                                                        control={form.control}
                                                        name="solde_methode"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <Select onValueChange={field.onChange} value={field.value || undefined}>
                                                                    <FormControl>
                                                                        <SelectTrigger className="h-8 text-xs w-full">
                                                                            <SelectValue placeholder="Mode de paiement" />
                                                                        </SelectTrigger>
                                                                    </FormControl>
                                                                    <SelectContent>
                                                                        <SelectItem value="Especes">Espèces</SelectItem>
                                                                        <SelectItem value="Virement">Virement</SelectItem>
                                                                        <SelectItem value="Cheque">Chèque</SelectItem>
                                                                        <SelectItem value="PayPal">PayPal</SelectItem>
                                                                        <SelectItem value="CB">Mettle / CB</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <FormField
                                                        control={form.control}
                                                        name="solde_date"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormControl>
                                                                    <Input type="datetime-local" className="h-8 text-xs" {...field} value={field.value || ""} />
                                                                </FormControl>
                                                            </FormItem>
                                                        )}
                                                    />
                                                </>
                                            )}
                                        </div>

                                        {/* Dynamic workflow steps (from index 3 onwards) */}
                                        {(statusSettings?.workflow_steps || []).slice(3).map((stepName: string, idx: number) => {
                                            const stepIndex = idx + 3 // Actual index in workflow_steps
                                            const stepKey = String(stepIndex)
                                            const currentStatus = form.watch("workflow_status") || {}
                                            const isChecked = currentStatus[stepKey] === true

                                            return (
                                                <div key={stepKey} className="flex flex-row items-center justify-between rounded-lg border bg-white p-3 shadow-sm">
                                                    <span className="text-xs font-medium">{stepName}</span>
                                                    <Switch
                                                        checked={isChecked}
                                                        onCheckedChange={(checked) => {
                                                            const newStatus = { ...currentStatus, [stepKey]: checked }
                                                            form.setValue("workflow_status", newStatus)
                                                            quickSaveData({ workflow_status: newStatus })
                                                        }}
                                                    />
                                                </div>
                                            )
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="details" className="space-y-6">
                            {/* Event & Material */}
                            <Card className="border-l-4 border-l-primary/50">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                        <CalendarDaysIcon className="size-5 text-primary" />
                                        Matériel & Tarifs
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

                                    <FormField
                                        control={form.control}
                                        name="offre"
                                        render={({ field }: { field: any }) => (
                                            <FormItem className="md:col-span-2">
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
                                                <FormItem className="md:col-span-2">
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
                                                    <FormLabel className="uppercase text-[10px] font-bold text-emerald-600">
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
                        </TabsContent>

                        <TabsContent value="livraison" className="space-y-6">
                            <Card className="border-l-4 border-l-emerald-500/50">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                        <TruckIcon className="size-5 text-emerald-600" />
                                        Livraison & Retrait
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-bold uppercase text-emerald-800 border-b pb-1">Installation</h3>
                                        <div className="grid grid-cols-2 gap-2">
                                            <FormField
                                                control={form.control}
                                                name="date_debut"
                                                render={({ field }: { field: any }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs uppercase font-bold text-muted-foreground">Date Début</FormLabel>
                                                        <FormControl>
                                                            <Input type="date" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="heure_debut"
                                                render={({ field }: { field: any }) => {
                                                    const [h, m] = (field.value || "08:00").split(":")
                                                    return (
                                                        <FormItem className="flex flex-col">
                                                            <FormLabel className="text-xs uppercase font-bold text-muted-foreground">Heure</FormLabel>
                                                            <div className="flex items-center gap-1">
                                                                <Select
                                                                    onValueChange={(val) => field.onChange(`${val}:${m}`)}
                                                                    value={h}
                                                                >
                                                                    <FormControl>
                                                                        <SelectTrigger className="bg-white w-[70px]">
                                                                            <SelectValue placeholder="HH" />
                                                                        </SelectTrigger>
                                                                    </FormControl>
                                                                    <SelectContent className="max-h-[200px]">
                                                                        {Array.from({ length: 24 }).map((_, i) => {
                                                                            const val = i.toString().padStart(2, "0")
                                                                            return <SelectItem key={val} value={val}>{val}</SelectItem>
                                                                        })}
                                                                    </SelectContent>
                                                                </Select>
                                                                <span className="font-bold">:</span>
                                                                <Select
                                                                    onValueChange={(val) => field.onChange(`${h}:${val}`)}
                                                                    value={m}
                                                                >
                                                                    <FormControl>
                                                                        <SelectTrigger className="bg-white w-[70px]">
                                                                            <SelectValue placeholder="mm" />
                                                                        </SelectTrigger>
                                                                    </FormControl>
                                                                    <SelectContent>
                                                                        {["00", "15", "30", "45"].map((val) => (
                                                                            <SelectItem key={val} value={val}>{val}</SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h3 className="text-sm font-bold uppercase text-red-800 border-b pb-1">Désinstallation</h3>
                                        <div className="grid grid-cols-2 gap-2">
                                            <FormField
                                                control={form.control}
                                                name="date_fin"
                                                render={({ field }: { field: any }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs uppercase font-bold text-muted-foreground">Date Fin</FormLabel>
                                                        <FormControl>
                                                            <Input type="date" {...field} value={field.value || ""} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="heure_fin"
                                                render={({ field }: { field: any }) => {
                                                    const [h, m] = (field.value || "08:00").split(":")
                                                    return (
                                                        <FormItem className="flex flex-col">
                                                            <FormLabel className="text-xs uppercase font-bold text-muted-foreground">Heure</FormLabel>
                                                            <div className="flex items-center gap-1">
                                                                <Select
                                                                    onValueChange={(val) => field.onChange(`${val}:${m}`)}
                                                                    value={h}
                                                                >
                                                                    <FormControl>
                                                                        <SelectTrigger className="bg-white w-[70px]">
                                                                            <SelectValue placeholder="HH" />
                                                                        </SelectTrigger>
                                                                    </FormControl>
                                                                    <SelectContent className="max-h-[200px]">
                                                                        {Array.from({ length: 24 }).map((_, i) => {
                                                                            const val = i.toString().padStart(2, "0")
                                                                            return <SelectItem key={val} value={val}>{val}</SelectItem>
                                                                        })}
                                                                    </SelectContent>
                                                                </Select>
                                                                <span className="font-bold">:</span>
                                                                <Select
                                                                    onValueChange={(val) => field.onChange(`${h}:${val}`)}
                                                                    value={m}
                                                                >
                                                                    <FormControl>
                                                                        <SelectTrigger className="bg-white w-[70px]">
                                                                            <SelectValue placeholder="mm" />
                                                                        </SelectTrigger>
                                                                    </FormControl>
                                                                    <SelectContent>
                                                                        {["00", "15", "30", "45"].map((val) => (
                                                                            <SelectItem key={val} value={val}>{val}</SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="lieu"
                                        render={({ field }: { field: any }) => (
                                            <FormItem className="md:col-span-2">
                                                <FormLabel className="uppercase text-xs font-bold text-muted-foreground">Lieu de prestation</FormLabel>
                                                <FormControl>
                                                    <Textarea placeholder="Ex: Salle des fêtes, 12 rue de la mairie..." {...field} />
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
                                                    Notes logistiques / Infos accès
                                                </FormLabel>
                                                <FormControl>
                                                    <Textarea placeholder="Ex: Code Wifi, Digicode, Contact sur place..." {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </div>

                    <div className="flex flex-col items-center justify-center gap-4 pt-8 mt-6 border-t border-slate-100">
                        <div className="flex flex-col items-center gap-4 w-full">
                            {Object.keys(form.formState.errors).length > 0 && (
                                <div className="text-xs text-red-500 font-medium flex items-center gap-1.5 px-4 py-2 bg-red-50 rounded-full border border-red-100 shadow-sm animate-pulse">
                                    <AlertCircleIcon className="size-4" />
                                    {Object.keys(form.formState.errors).length} champ(s) incomplet(s) ou invalide(s)
                                </div>
                            )}

                            {initialData?.id && (
                                <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 opacity-60">
                                    <RefreshCw className="size-3" />
                                    Enregistrement automatique actif
                                </div>
                            )}

                            <div className="flex items-center gap-4 w-full justify-center">
                                {onCancel && (
                                    <Button type="button" variant="outline" onClick={onCancel} className="bg-white px-8 uppercase text-xs font-bold tracking-wider">
                                        Annuler
                                    </Button>
                                )}
                                <Button type="submit" disabled={isSaving} className="min-w-[280px] h-12 shadow-md uppercase text-xs font-bold tracking-widest bg-indigo-600 hover:bg-indigo-700">
                                    {isSaving ? (
                                        <>
                                            <Loader2Icon className="mr-2 size-4 animate-spin" />
                                            ENREGISTREMENT...
                                        </>
                                    ) : (
                                        "ENREGISTRER LES MODIFICATIONS"
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>

                </Tabs>
            </form>
        </Form>
    )
}
