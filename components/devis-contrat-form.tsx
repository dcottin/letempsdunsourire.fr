"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import {
    CalendarIcon, UserIcon, CalendarDaysIcon, EuroIcon, FileTextIcon, CameraIcon, Bot, Loader2Icon, RefreshCw,
    EyeIcon, SendIcon, CheckCircleIcon, ScrollTextIcon, DownloadIcon, AlertCircleIcon, LinkIcon, TruckIcon, Trash2, SaveIcon, PenTool, InfoIcon, Palette, Circle, X
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
import { toast } from "@/components/ui/use-toast"
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
    date_installation: z.string().nullable().default(""),
    lieu: z.string().nullable().default(""),
    texte_libre: z.string().nullable().default(""),
    equipment_id: z.string().nullable().optional(),
    offre: z.string().nullable().default(""),
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
    id?: string
    mode: "devis" | "contrat"
    initialData?: any
    onSuccess?: (data: any, keepOpen?: boolean) => void
    onCancel?: () => void
    onSavingChange?: (saving: boolean) => void
}

export function DevisContratForm({ id, mode: initialMode, initialData, onSuccess, onCancel, onSavingChange }: DevisContratFormProps) {
    const [internalMode, setInternalMode] = React.useState<"devis" | "contrat">(initialMode)
    const { setSaving, setSaved, setError } = useSaveStatus()

    const sanitizedInitialData = React.useMemo(() => {
        if (!initialData) return null
        const data = initialData.data || {}
        return {
            ...initialData,
            ...data,
            prix_total: (initialData.prix_total || data.prix_total || "0").toString(),
            selected_options: data.selected_options || initialData.selected_options || [],
            // Ensure logistics dates are empty if not explicitly set to avoid auto-fills
            date_installation: data.date_installation || initialData.date_installation || null,
            heure_debut: data.heure_debut || initialData.heure_debut || "",
            date_fin: data.date_fin || initialData.date_fin || null,
            heure_fin: data.heure_fin || initialData.heure_fin || "",
        }
    }, [initialData])

    // Debug form values on mount
    React.useEffect(() => {
        console.log("Form initialized. Status of logistics dates:", {
            date_installation: form.getValues("date_installation"),
            date_fin: form.getValues("date_fin")
        });
    }, []);

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
            date_fin: null,
            heure_fin: "",
            date_installation: null,
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

    // Pre-generate tokens for new documents so signing links are available immediately
    const preGeneratedTokens = React.useMemo(() => {
        // Helper to generate UUID
        const genUUID = () => {
            if (typeof crypto !== 'undefined' && crypto.randomUUID) {
                return crypto.randomUUID();
            }
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        };

        return {
            devis: initialData?.data?.access_token_devis || initialData?.access_token_devis || genUUID(),
            contrat: initialData?.data?.access_token_contrat || initialData?.access_token_contrat || genUUID()
        };
    }, [initialData?.id]) // Only regenerate if document ID changes

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

    // Auto-fill logic removed as per user request to keep fields empty by default



    const [isSaving, setIsSaving] = React.useState(false)

    React.useEffect(() => {
        onSavingChange?.(isSaving)
    }, [isSaving, onSavingChange])
    const isAutoSavingRef = React.useRef(false)
    const autoSaveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

    const [unavailableIds, setUnavailableIds] = React.useState<string[]>([])
    const [hasOtherBookings, setHasOtherBookings] = React.useState(false)
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
            if (!watchedDateDebut) {
                setUnavailableIds([])
                setHasOtherBookings(false)
                return
            }
            setIsCheckingAvailability(true)

            try {
                // 1. Check Devis
                let devisQuery = supabase
                    .from('devis')
                    .select('id, data, date_debut, etat')
                    .eq('date_debut', watchedDateDebut)

                if (internalMode === 'devis' && initialData?.id) {
                    devisQuery = devisQuery.neq('id', initialData.id)
                }
                const { data: rawDevisData, error: devisError } = await devisQuery
                if (devisError) throw devisError

                // Filter by etat: check both top-level and JSON data
                const devisData = (rawDevisData || []).filter(d => {
                    const status = d.data?.etat || d.etat
                    return status !== 'Annulé' && status !== 'Refusé'
                })

                // 2. Check Contrats
                let contratsQuery = supabase
                    .from('contrats')
                    .select('id, data, date_debut, etat')
                    .eq('date_debut', watchedDateDebut)

                if (internalMode === 'contrat' && initialData?.id) {
                    contratsQuery = contratsQuery.neq('id', initialData.id)
                }
                const { data: rawContratsData, error: contratsError } = await contratsQuery
                if (contratsError) throw contratsError

                // Filter by etat: check both top-level and JSON data
                const contratsData = (rawContratsData || []).filter(c => {
                    const status = c.data?.etat || c.etat
                    return status !== 'Annulé' && status !== 'Cancelled' && status !== 'Archivé'
                })

                // Merge results
                const allOtherBookings = [...devisData, ...contratsData]
                setHasOtherBookings(allOtherBookings.length > 0)

                // Extract busy equipment IDs (checking both locations)
                const busyIds = allOtherBookings
                    ?.map((d: any) => d.data?.equipment_id || d.equipment_id)
                    .filter(Boolean) || []

                // Unique IDs only
                const uniqueBusyIds = Array.from(new Set(busyIds))
                setUnavailableIds(uniqueBusyIds)
            } catch (err) {
                console.error("Error checking availability", err)
            } finally {
                setIsCheckingAvailability(false)
            }
        }

        checkAvailability()
    }, [watchedDateDebut, internalMode, initialData?.id])

    React.useEffect(() => {
        if (Object.keys(form.formState.errors).length > 0) {
            console.log("Form Validation Errors:", form.formState.errors)
        }
    }, [form.formState.errors])

    async function onSubmit(values: z.infer<typeof formSchema>, keepOpen: boolean = false, forcedMode?: "devis" | "contrat", isAutoSave: boolean = false) {
        if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current)

        // Helper to ensure unique ID by appending (2), (3) etc.
        const ensureUniqueId = async (baseId: string, table: string): Promise<string> => {
            const { data: existing } = await supabase.from(table).select('id').eq('id', baseId).maybeSingle()
            if (!existing) return baseId

            let counter = 2
            while (true) {
                const candidate = `${baseId} (${counter})`
                const { data } = await supabase.from(table).select('id').eq('id', candidate).maybeSingle()
                if (!data) return candidate
                counter++
            }
        }

        if (isAutoSavingRef.current && isAutoSave) {
            console.log("Auto-save already in progress, skipping...")
            return
        }

        // START MANUAL SAVE LOGIC
        if (!isAutoSave) {
            setIsSaving(true) // Visual feedback immediately
        }

        // Wait for pending auto-save if necessary
        if (isAutoSavingRef.current && !isAutoSave) {
            console.warn("Manual save triggered while another save is in progress. Waiting...")
            let retries = 0
            while (isAutoSavingRef.current && retries < 10) {
                await new Promise(r => setTimeout(r, 200))
                retries++
            }
        }

        // Availability Warning (Native Confirm)
        if (!isAutoSave && values.equipment_id && values.equipment_id !== 'none' && values.date_debut) {
            try {
                const [devisRes, contratsRes] = await Promise.all([
                    supabase.from('devis').select('id, nom_client, data, etat').eq('date_debut', values.date_debut),
                    supabase.from('contrats').select('id, nom_client, data, etat').eq('date_debut', values.date_debut)
                ])

                const busyDevis = (devisRes.data || []).filter((d: any) =>
                    d.id !== initialData?.id &&
                    (d.data?.etat || d.etat) !== 'Annulé' && (d.data?.etat || d.etat) !== 'Refusé' &&
                    ((d.data?.equipment_id === values.equipment_id) || (d.equipment_id === values.equipment_id))
                )
                const busyContrats = (contratsRes.data || []).filter((c: any) =>
                    c.id !== initialData?.id &&
                    (c.data?.etat || c.etat) !== 'Annulé' && (c.data?.etat || c.etat) !== 'Archivé' &&
                    ((c.data?.equipment_id === values.equipment_id) || (c.equipment_id === values.equipment_id))
                )

                if (busyDevis.length > 0 || busyContrats.length > 0) {
                    const conflict = busyContrats[0] || busyDevis[0]
                    const holder = conflict.nom_client || "un autre dossier"
                    // If user cancels, we MUST abort and reset loading state
                    if (!confirm(`⚠️ Attention : Ce matériel est déjà réservé par "${holder}" pour cette date.\n\nEnregistrer quand même ?`)) {
                        setIsSaving(false)
                        return
                    }
                }
            } catch (err) {
                console.error("Submit availability check error:", err)
            }
        }

        isAutoSavingRef.current = true

        if (isAutoSave) {
            setSaving()
        } else {
            // Already set to true above, but updating context
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
                // Use pre-generated tokens so the same link shown to user is saved
                access_token_devis: preGeneratedTokens.devis,
                access_token_contrat: preGeneratedTokens.contrat,

                // Explicitly set dates to null if empty string to ensure they are cleared in DB
                date_installation: finalValues.date_installation || null,
                heure_debut: finalValues.heure_debut || null,
                date_fin: finalValues.date_fin || null,
                heure_fin: finalValues.heure_fin || null,

                // Keep legacy token for backward compatibility
                access_token: initialData?.data?.access_token || initialData?.access_token || preGeneratedTokens.contrat,
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

            let savedRecord: any;

            // 2. Insert/Update with a safety timeout (30s) to prevent infinite hanging
            const dbOperation = async () => {
                if (initialData?.id) {
                    // Check if mode changed
                    if (currentMode !== initialMode) {
                        console.log(`Mode changed from ${initialMode} to ${currentMode}. Migrating record...`)

                        // 1. Generate new ID
                        const baseId = generateReference(currentMode)
                        const newId = await ensureUniqueId(baseId, currentMode === "devis" ? "devis" : "contrats")
                        const newItem = {
                            id: newId,
                            ...record,
                            data: {
                                ...record.data,
                                reference: newId,
                                // If migrating to contrat, mark as signed
                                contrat_signe: currentMode === 'contrat' ? true : record.data?.contrat_signe,
                                access_token_devis: preGeneratedTokens.devis,
                                access_token_contrat: preGeneratedTokens.contrat,
                                access_token: initialData?.data?.access_token || initialData?.access_token || preGeneratedTokens.contrat
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
                        }

                        return insertData
                    } else {
                        // Standard update
                        const { data, error: updateError } = await supabase
                            .from(table)
                            .update(record)
                            .eq('id', initialData.id)
                            .select()
                            .single()
                        if (updateError) throw updateError
                        return data
                    }
                } else {
                    // Generate custom ID (Reference)
                    const prefix = currentMode === 'contrat' ? 'C' : 'D'
                    // Use standard generator + uniqueness check
                    const baseId = generateReference(currentMode)
                    const newId = await ensureUniqueId(baseId, table)

                    const newItem = {
                        id: newId,
                        ...record,
                        data: {
                            ...record.data,
                            reference: newId,
                            access_token_devis: preGeneratedTokens.devis,
                            access_token_contrat: preGeneratedTokens.contrat,
                            access_token: preGeneratedTokens.contrat // legacy
                        }
                    }

                    const { data, error: insertError } = await supabase
                        .from(table)
                        .insert([newItem])
                        .select()
                        .single()
                    if (insertError) throw insertError
                    return data
                }
            }

            // Race between DB op and a 30s timeout
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Délai d'attente dépassé (30s). Vérifiez votre connexion.")), 30000)
            )

            savedRecord = await Promise.race([dbOperation(), timeoutPromise])

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
            else {
                toast({
                    title: "Erreur d'enregistrement",
                    description: e.message || "Une erreur est survenue lors de l'enregistrement.",
                    variant: "destructive"
                })
            }
        } finally {
            // ALWAYS release the lock, whether auto or manual
            isAutoSavingRef.current = false

            if (isAutoSave) {
                setSaved()
            } else {
                setIsSaving(false)
                setSaved()
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

    // Load settings from Supabase with Retry Logic
    const fetchSettings = React.useCallback(async () => {
        setIsLoadingSettings(true)
        let attempt = 1;
        const maxAttempts = 3;

        while (attempt <= maxAttempts) {
            try {
                // Add a small race timeout (5s) to catch "hanging" network requests quickly
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Timeout")), 5000)
                );

                const fetchPromise = supabase
                    .from('settings')
                    .select('*')
                    .limit(1);

                const result: any = await Promise.race([fetchPromise, timeoutPromise]);
                const { data: records, error } = result;

                if (error) throw error

                if (records && records.length > 0) {
                    const record = records[0]
                    // console.log("Settings loaded successfully.")
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
                    console.log("No customized settings found. Using defaults.")
                    setStatusSettings(DEFAULT_SETTINGS)
                }

                // Success! Stop loading and exit loop
                setIsLoadingSettings(false)
                return;

            } catch (e) {
                console.warn(`Settings fetch failed (Attempt ${attempt}/${maxAttempts})`, e)
                if (attempt === maxAttempts) {
                    console.error("All settings fetch attempts failed.")
                    toast({
                        title: "Connexion instable",
                        description: "Impossible de charger vos formules et options personnalisées. Les valeurs par défaut sont affichées.",
                        variant: "destructive"
                    })
                    setStatusSettings(DEFAULT_SETTINGS)
                } else {
                    // Wait 500ms before retry
                    await new Promise(r => setTimeout(r, 500));
                }
                attempt++;
            }
        }
        setIsLoadingSettings(false)
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
            const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
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
                // Remove random suffix logic, let ensureUniqueId handle collisions
                return `${prefix}${core}`
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

            toast({
                title: "Succès",
                description: "Email envoyé avec succès !",
            })
            setShowEmail(false)
        } catch (error: any) {
            console.error("Failed to send email with attachment", error)
            toast({
                title: "Erreur d'envoi",
                description: `Erreur d'envoi : ${error.message}`,
                variant: "destructive"
            })
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

        // Use pre-generated tokens so signing link is available even for new documents
        const tokenForLink = internalMode === 'devis'
            ? preGeneratedTokens.devis
            : preGeneratedTokens.contrat;

        const signingLink = tokenForLink ? `${typeof window !== 'undefined' ? window.location.origin : ''}/sign/${tokenForLink}` : ""

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
                ? `<img src="${(statusSettings as any).logo_url}" width="${(statusSettings as any).logo_width || 100}" style="width: ${(statusSettings as any).logo_width || 100}px; height: auto; display: block;" alt="Logo" />`
                : ((statusSettings as any)?.logo_base64 ? `<img src="${(statusSettings as any).logo_base64}" width="${(statusSettings as any).logo_width || 100}" style="width: ${(statusSettings as any).logo_width || 100}px; height: auto; display: block;" alt="Logo" />` : ""),
            "{{signing_link}}": signingLink ? `<a href="${signingLink}" style="color: #4f46e5; text-decoration: underline;">${signingLink}</a>` : "",
            "{{signature_link}}": signingLink ? `<a href="${signingLink}" style="color: #4f46e5; text-decoration: underline;">${signingLink}</a>` : ""
        };

        let subject = rawSubject;
        let body = rawBody;

        Object.entries(replacements).forEach(([key, value]) => {
            subject = subject.split(key).join(value || "");
            // Don't replace company_logo in the body yet, let the dialog handle it at send-time
            if (key !== "{{company_logo}}") {
                body = body.split(key).join(value || "");
            }
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
            <form id={id} onSubmit={form.handleSubmit((data) => onSubmit(data, true), (err) => {
                console.error("Form Submit Validation Errors:", JSON.stringify(err, null, 2))
                toast({
                    title: "Formulaire incomplet",
                    description: "Veuillez vérifier les champs obligatoires (Nom, Date de début, etc.) marqués en rouge.",
                    variant: "destructive"
                })
            }
            )} className="space-y-6">
                {Object.keys(form.formState.errors).length > 0 && (
                    <div className="px-4 sm:px-6 pt-6">
                        <div className="p-4 sm:p-6 bg-red-50 border-2 border-red-200 rounded-xl flex items-center gap-4 text-red-700 animate-in fade-in slide-in-from-top-2 shadow-sm">
                            <AlertCircleIcon className="size-6 sm:size-8 shrink-0" />
                            <span className="text-sm sm:text-xl font-black uppercase tracking-tight">Formulaire incomplet : Le Nom et la Date sont obligatoires pour enregistrer.</span>
                        </div>
                    </div>
                )}
                <Tabs defaultValue="infos" className="w-full !mt-0">
                    <div className="bg-white pt-0 pb-4 no-print px-4 sm:px-6 flex flex-col gap-2">
                        <div className="flex flex-col gap-1 relative">
                            {isSaving && (
                                <div className="absolute -top-6 right-0 text-[10px] text-indigo-500 font-bold animate-pulse flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" />
                                    Enregistrement...
                                </div>
                            )}
                            <Tabs value={internalMode} onValueChange={(v) => handleModeSwitch(v as any)} className="w-full">
                                <TabsList className="grid grid-cols-2 w-full h-8 sm:h-12 bg-slate-50 p-1 rounded-lg gap-2">
                                    <TabsTrigger
                                        value="devis"
                                        className="rounded-md data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm font-bold transition-all gap-2 h-full text-[10px] sm:text-sm"
                                    >
                                        <FileTextIcon className="size-3 sm:size-4" /> DEVIS
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="contrat"
                                        className="rounded-md data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm font-bold transition-all gap-2 h-full text-[10px] sm:text-sm"
                                    >
                                        <ScrollTextIcon className="size-3 sm:size-4" /> CONTRAT
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>

                        <div className="flex flex-wrap justify-between items-center no-print gap-2">
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
                                <Button
                                    type="button"
                                    variant="default"
                                    onClick={() => setIsSignatureDialogOpen(true)}
                                    disabled={isSaving}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md gap-1 sm:gap-2 text-[10px] sm:text-sm px-2 sm:px-4 h-6 sm:h-10 flex-1 sm:flex-none uppercase tracking-wide"
                                >
                                    <PenTool className="size-3 mr-1 hidden sm:inline" />
                                    <span>Signature</span>
                                </Button>
                            </div>

                            <div className="flex flex-wrap items-center justify-center sm:justify-end gap-1.5 w-full sm:w-auto sm:ml-auto pb-1">
                                {/* DEVIS GROUP */}
                                <div className="inline-flex items-center gap-0 bg-slate-50 p-0.5 sm:p-1 rounded-lg border border-slate-200 shadow-sm shrink-0">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => { e.preventDefault(); setShowDevisPreview(true); }}
                                        className="gap-1.5 text-slate-600 hover:bg-white hover:text-indigo-600 hover:shadow-sm h-7 px-1.5 font-bold text-[9px] sm:text-[10px] transition-all"
                                    >
                                        <FileTextIcon className="size-3" /> <span className="hidden sm:inline">DEVIS</span>
                                    </Button>
                                    <div className="w-px h-3 bg-slate-200 mx-0.5" />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => { e.preventDefault(); handleDownloadPDF('devis'); }}
                                        className="h-7 w-6 sm:w-7 text-slate-400 hover:text-slate-900 transition-all"
                                        title="Télécharger Devis"
                                    >
                                        <DownloadIcon className="size-3" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => { e.preventDefault(); setEmailType('devis'); setShowEmail(true); }}
                                        className="h-7 w-6 sm:w-7 text-emerald-500 hover:text-emerald-600 transition-all"
                                        title="Envoyer Devis"
                                    >
                                        <SendIcon className="size-3" />
                                    </Button>
                                </div>

                                {/* CONTRAT GROUP */}
                                <div className="inline-flex items-center gap-0 bg-indigo-50/50 p-0.5 sm:p-1 rounded-lg border border-indigo-100 shadow-sm shrink-0">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => { e.preventDefault(); setShowPreview(true); }}
                                        className="gap-1.5 text-indigo-600 hover:bg-white hover:shadow-sm h-7 px-1.5 font-bold text-[9px] sm:text-[10px] transition-all"
                                    >
                                        <ScrollTextIcon className="size-3" /> <span className="hidden sm:inline">CONTRAT</span>
                                    </Button>
                                    <div className="w-px h-3 bg-slate-200 mx-0.5" />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => { e.preventDefault(); handleDownloadPDF('contract'); }}
                                        className="h-7 w-6 sm:w-7 text-indigo-400 hover:text-indigo-600 transition-all"
                                        title="Télécharger Contrat"
                                    >
                                        <DownloadIcon className="size-3" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => { e.preventDefault(); setEmailType('contract'); setShowEmail(true); }}
                                        className="h-7 w-6 sm:w-7 text-emerald-500 hover:text-emerald-600 transition-all"
                                        title="Envoyer Contrat"
                                    >
                                        <SendIcon className="size-3" />
                                    </Button>
                                </div>

                                {/* FACTURE GROUP */}
                                <div className="inline-flex items-center gap-0 bg-emerald-50/50 p-0.5 sm:p-1 rounded-lg border border-emerald-100 shadow-sm shrink-0">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => { e.preventDefault(); setShowFacturePreview(true); }}
                                        className="gap-1.5 text-emerald-600 hover:bg-white hover:shadow-sm h-7 px-1.5 font-bold text-[9px] sm:text-[10px] transition-all"
                                    >
                                        <EuroIcon className="size-3" /> <span className="hidden sm:inline">FACTURE</span>
                                    </Button>
                                    <div className="w-px h-3 bg-slate-200 mx-0.5" />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => { e.preventDefault(); handleDownloadPDF('invoice'); }}
                                        className="h-7 w-6 sm:w-7 text-emerald-400 hover:text-emerald-600 transition-all"
                                        title="Télécharger Facture"
                                    >
                                        <DownloadIcon className="size-3" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => { e.preventDefault(); setEmailType('invoice'); setShowEmail(true); }}
                                        className="h-7 w-6 sm:w-7 text-emerald-500 hover:text-emerald-600 transition-all"
                                        title="Envoyer Facture"
                                    >
                                        <SendIcon className="size-3" />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <TabsList className="grid grid-cols-3 w-full h-8 sm:h-11 bg-slate-100/50 p-1 rounded-xl mt-1">
                            <TabsTrigger value="infos" className="flex items-center justify-center gap-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm font-bold transition-all h-full text-[9px] sm:text-xs uppercase tracking-wider px-1">
                                <UserIcon className="size-3.5 hidden sm:block" />
                                <span className="hidden sm:inline">Infos & Suivi</span>
                                <span className="sm:hidden">Infos</span>
                            </TabsTrigger>
                            <TabsTrigger value="details" className="flex items-center justify-center gap-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm font-bold transition-all h-full text-[9px] sm:text-xs uppercase tracking-wider px-1">
                                <CalendarDaysIcon className="size-3.5 hidden sm:block" />
                                <span className="hidden sm:inline">Évènement & Tarifs</span>
                                <span className="sm:hidden">Evènement</span>
                            </TabsTrigger>
                            <TabsTrigger value="livraison" className="flex items-center justify-center gap-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm font-bold transition-all h-full text-[9px] sm:text-xs uppercase tracking-wider px-1">
                                <TruckIcon className="size-3.5 hidden sm:block" />
                                <span className="hidden sm:inline">Logistique</span>
                                <span className="sm:hidden">Logis.</span>
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <Dialog open={isSignatureDialogOpen} onOpenChange={(open) => {
                        setIsSignatureDialogOpen(open)
                    }}>
                        <DialogContent className="sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
                            <DialogHeader>
                                <DialogTitle>Lien de Signature Électronique - {internalMode === 'contrat' ? 'Contrat' : 'Devis'}</DialogTitle>
                                <DialogDescription>
                                    Partagez ce lien avec votre client pour qu'il puisse signer le {internalMode === 'contrat' ? 'contrat' : 'devis'} directement en ligne.
                                </DialogDescription>
                            </DialogHeader>
                            {(() => {
                                const token = internalMode === 'devis' ? preGeneratedTokens.devis : preGeneratedTokens.contrat;
                                const signingUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/sign/${token}`;
                                const [copied, setCopied] = React.useState(false);

                                const copyToClipboard = async (text: string) => {
                                    let success = false;
                                    if (navigator.clipboard && window.isSecureContext) {
                                        try {
                                            await navigator.clipboard.writeText(text)
                                            success = true;
                                        } catch (err) {
                                            console.error('Clipboard API failed, using fallback', err)
                                        }
                                    }

                                    if (!success) {
                                        const textArea = document.createElement("textarea")
                                        textArea.value = text
                                        textArea.style.position = "fixed"
                                        textArea.style.left = "-9999px"
                                        textArea.style.top = "0"
                                        document.body.appendChild(textArea)
                                        textArea.focus()
                                        textArea.select()
                                        try {
                                            success = document.execCommand('copy')
                                        } catch (err) {
                                            console.error('Fallback failed', err)
                                        }
                                        document.body.removeChild(textArea)
                                    }

                                    if (success) {
                                        setCopied(true)
                                        toast({
                                            title: "Lien copié !",
                                            description: "Le lien est dans votre presse-papier.",
                                        })
                                        setTimeout(() => setCopied(false), 2000)
                                    } else {
                                        toast({
                                            title: "Erreur",
                                            description: "Impossible de copier le lien.",
                                            variant: "destructive"
                                        })
                                    }
                                };

                                return (
                                    <div className="flex items-center space-x-2 mt-4">
                                        <div className="grid flex-1 gap-2">
                                            <Label htmlFor="link" className="sr-only">
                                                Lien
                                            </Label>
                                            <Input
                                                id="link"
                                                value={signingUrl}
                                                readOnly
                                                className="font-mono text-xs bg-slate-50"
                                            />
                                        </div>
                                        <Button
                                            type="button"
                                            size="sm"
                                            className={`px-3 transition-all ${copied ? 'bg-emerald-500 hover:bg-emerald-600' : ''}`}
                                            onClick={() => copyToClipboard(signingUrl)}
                                        >
                                            <span className="sr-only">Copier</span>
                                            {copied ? <CheckCircleIcon className="h-4 w-4 text-white" /> : <LinkIcon className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                );
                            })()}
                            {!initialData?.id && (
                                <p className="text-xs text-amber-600 mt-2 flex items-center gap-1.5">
                                    <InfoIcon className="size-3.5" />
                                    Ce lien sera actif après l'enregistrement du document.
                                </p>
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
                    />


                    <div className="px-4 sm:px-6 pt-2">

                        <TabsContent value="infos" className="grid grid-cols-1 xl:grid-cols-2 gap-4 content-start">
                            {/* Client Info */}
                            <Card className="border-l-4 border-l-primary/20 min-w-0">
                                <CardHeader className="px-3 sm:px-6 pb-1 sm:pb-1">
                                    <CardTitle className="text-sm sm:text-base font-bold uppercase tracking-wider flex items-center gap-2">
                                        <UserIcon className="size-4 sm:size-5 text-primary" />
                                        Informations client
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="px-3 sm:px-6 pb-3 pt-0 sm:px-6 sm:pb-6 sm:pt-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="nom_client"
                                        render={({ field }: { field: any }) => (
                                            <FormItem className="md:col-span-2 min-w-0">
                                                <FormLabel className="uppercase text-[10px] sm:text-xs font-bold text-muted-foreground">Nom complet / Société</FormLabel>
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
                                                <FormLabel className="uppercase text-[10px] sm:text-xs font-bold text-muted-foreground">Email</FormLabel>
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
                                                <FormLabel className="uppercase text-[10px] sm:text-xs font-bold text-muted-foreground">Téléphone</FormLabel>
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
                                                <FormLabel className="uppercase text-[10px] sm:text-xs font-bold text-muted-foreground">Adresse postale</FormLabel>
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
                            <Card className="min-w-0">
                                <CardHeader className="px-3 sm:px-6 pb-1 sm:pb-1">
                                    <CardTitle className="text-sm sm:text-base font-bold uppercase tracking-wider flex items-center gap-2">
                                        <ScrollTextIcon className="size-4 sm:size-5 text-primary" />
                                        Suivi du dossier
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="px-3 sm:px-6 pb-3 pt-0 sm:px-6 sm:pb-6 sm:pt-1">
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
                                        {parseFloat(form.watch("acompte_recu") || "0") > 0 && (
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
                                        )}

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
                                            const isDesignStep = stepName.toLowerCase().includes('design') || stepName.toLowerCase().includes('maquette') || stepName.toLowerCase().includes('template')
                                            const isChecked = isDesignStep ? form.watch("design_valide") : currentStatus[stepKey] === true

                                            return (
                                                <div key={stepKey} className="flex flex-row items-center justify-between rounded-lg border bg-white p-3 shadow-sm">
                                                    <div className="flex items-center gap-2">
                                                        {isDesignStep ? (
                                                            <Palette className={`size-4 ${isChecked ? "text-emerald-500" : "text-slate-200"}`} />
                                                        ) : (
                                                            isChecked ? <CheckCircleIcon className="size-4 text-emerald-500" /> : <Circle className="size-4 text-slate-200" />
                                                        )}
                                                        <span className="text-xs font-medium">{stepName}</span>
                                                    </div>
                                                    <Switch
                                                        checked={isChecked}
                                                        onCheckedChange={(checked) => {
                                                            if (isDesignStep) {
                                                                form.setValue("design_valide", checked)
                                                                quickSaveField("design_valide", checked)
                                                            } else {
                                                                const newStatus = { ...currentStatus, [stepKey]: checked }
                                                                form.setValue("workflow_status", newStatus)
                                                                quickSaveData({ workflow_status: newStatus })
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            )
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="details" className="h-full space-y-6">
                            {/* Event & Material */}
                            <Card className="border-l-4 border-l-primary/50">
                                <CardHeader className="px-3 sm:px-6 pb-1 sm:pb-1">
                                    <CardTitle className="text-sm sm:text-base font-bold uppercase tracking-wider flex items-center gap-2">
                                        <CalendarDaysIcon className="size-4 sm:size-5 text-primary" />
                                        Évènement & Tarifs
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="px-3 sm:px-6 pb-3 pt-0 sm:px-6 sm:pb-6 sm:pt-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="date_debut"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="uppercase text-[10px] sm:text-xs font-bold text-primary">Date de l&apos;évènement</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="date"
                                                        {...field}
                                                        value={field.value || ""}
                                                        className={`bg-white ${field.value ? "text-slate-900" : "text-slate-500"}`}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="lieu"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="uppercase text-[10px] sm:text-xs font-bold text-primary">Lieu de prestation</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Ex: Salle des fêtes..." {...field} value={field.value || ""} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="nom_evenement"
                                        render={({ field }: { field: any }) => (
                                            <FormItem className="md:col-span-2 xl:col-span-2">
                                                <FormLabel className="uppercase text-[10px] sm:text-xs font-bold text-primary">Nom de l'événement (Optionnel)</FormLabel>
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
                                            <FormItem className="md:col-span-2 xl:col-span-2">
                                                <div className="flex items-center justify-between">
                                                    <FormLabel className="uppercase text-[10px] sm:text-xs font-bold text-muted-foreground text-indigo-600">Offre / Formule</FormLabel>
                                                    <div className="flex items-center gap-1">
                                                        {field.value && (
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="size-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                                onClick={() => {
                                                                    field.onChange("")
                                                                    quickSaveField("offre", "")
                                                                }}
                                                                title="Supprimer la formule"
                                                            >
                                                                <X className="size-3" />
                                                            </Button>
                                                        )}
                                                        <Button type="button" variant="ghost" size="icon" className="size-6 text-slate-400 hover:text-indigo-600" onClick={fetchSettings} disabled={isLoadingSettings} title="Actualiser le catalogue">
                                                            <RefreshCw className={`size-3 ${isLoadingSettings ? "animate-spin" : ""}`} />
                                                        </Button>
                                                    </div>
                                                </div>
                                                <Select onValueChange={field.onChange} value={field.value || ""}>
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
                                                <FormItem className="md:col-span-2 xl:col-span-2">
                                                    <div className="flex items-center justify-between">
                                                        <FormLabel className="uppercase text-[10px] sm:text-xs font-bold text-muted-foreground text-indigo-600">Matériel (Disponibilité auto)</FormLabel>
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
                                                    ) : (unavailableIds.length > 0 || hasOtherBookings) && watchedDateDebut && (
                                                        <FormDescription className="text-[10px] text-amber-600 font-medium">
                                                            Attention des réservations sont déjà enregistrées pour le {format(new Date(watchedDateDebut), 'dd/MM/yyyy')}.
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
                                        <div className="md:col-span-2 xl:col-span-4 space-y-3 pt-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <FormLabel className="uppercase text-[10px] sm:text-xs font-bold text-muted-foreground text-pink-600 flex items-center gap-1">
                                                        <CameraIcon className="size-3" /> Options du catalogue
                                                    </FormLabel>
                                                    {(watchedOptions || []).length > 0 && (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="size-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                            onClick={() => {
                                                                form.setValue("selected_options", [])
                                                                quickSaveField("selected_options", [])
                                                            }}
                                                            title="Supprimer toutes les options"
                                                        >
                                                            <X className="size-3" />
                                                        </Button>
                                                    )}
                                                </div>
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
                                                                            let next;
                                                                            if (checked) {
                                                                                next = [...current, { name: opt.name, price: opt.price }];
                                                                            } else {
                                                                                next = current.filter((so: any) => so.name !== opt.name);
                                                                            }
                                                                            form.setValue("selected_options", next);
                                                                            quickSaveField("selected_options", next);
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
                                <CardHeader className="px-3 sm:px-6 pb-1 sm:pb-1">
                                    <CardTitle className="text-sm sm:text-base font-bold uppercase tracking-wider flex items-center gap-2">
                                        <EuroIcon className="size-4 sm:size-5 text-primary" />
                                        Tarification
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="px-3 sm:px-6 pb-3 pt-0 sm:px-6 sm:pb-6 sm:pt-1 space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="prix_total"
                                            render={({ field }: { field: any }) => (
                                                <FormItem>
                                                    <FormLabel className="uppercase text-[10px] sm:text-xs font-bold text-muted-foreground">Prix Total (€)</FormLabel>
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
                                                    <FormLabel className="uppercase text-[10px] sm:text-xs font-bold text-muted-foreground">Acompte (€)</FormLabel>
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
                                                <FormLabel className="uppercase text-[10px] sm:text-xs font-bold text-muted-foreground">Note interne</FormLabel>
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
                                <CardHeader className="px-3 sm:px-6 pb-1 sm:pb-1">
                                    <CardTitle className="text-sm sm:text-base font-bold uppercase tracking-wider flex items-center gap-2">
                                        <TruckIcon className="size-4 sm:size-5 text-emerald-600" />
                                        Logistique
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="px-3 sm:px-6 pb-3 pt-0 sm:px-6 sm:pb-6 sm:pt-1 space-y-8">
                                    {/* --- PARTIE 2: INSTALLATION ET RETRAIT --- */}

                                    {/* --- PARTIE 2: INSTALLATION ET RETRAIT --- */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                        {/* Installation */}
                                        <div className="space-y-4 p-4 rounded-xl bg-slate-50/50 border border-slate-100">
                                            <div className="flex items-center justify-between mb-2">
                                                <h3 className="text-[11px] font-black uppercase text-slate-500 flex items-center gap-2">
                                                    <div className="size-1.5 rounded-full bg-emerald-500" />
                                                    Installation
                                                </h3>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="size-6 text-slate-400 hover:text-red-500 hover:bg-red-50"
                                                    onClick={() => {
                                                        form.setValue("date_installation", "", { shouldDirty: true, shouldValidate: true });
                                                        form.setValue("heure_debut", "", { shouldDirty: true, shouldValidate: true });
                                                    }}
                                                    title="Effacer installation"
                                                >
                                                    <Trash2 className="size-3" />
                                                </Button>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <FormField
                                                    control={form.control}
                                                    name="date_installation"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <div className="flex items-center justify-between">
                                                                <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground whitespace-nowrap">Date d&apos;installation</FormLabel>
                                                                {field.value && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => form.setValue("date_installation", "", { shouldDirty: true, shouldValidate: true })}
                                                                        className="text-slate-400 hover:text-red-500 transition-colors"
                                                                    >
                                                                        <Trash2 className="size-2.5" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <FormControl>
                                                                <Input
                                                                    type="date"
                                                                    {...field}
                                                                    value={field.value || ""}
                                                                    className={`bg-white border-emerald-100 h-10 text-xs ${field.value ? "text-slate-900" : "text-slate-500"}`}
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="heure_debut"
                                                    render={({ field }) => {
                                                        const val = field.value || ""
                                                        const [h, m] = val.includes(":") ? val.split(":") : ["", ""]
                                                        return (
                                                            <FormItem className="flex flex-col">
                                                                <div className="flex items-center justify-between">
                                                                    <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground whitespace-nowrap">Heure d&apos;arrivée</FormLabel>
                                                                    {field.value && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => form.setValue("heure_debut", "", { shouldDirty: true, shouldValidate: true })}
                                                                            className="text-slate-400 hover:text-red-500 transition-colors"
                                                                        >
                                                                            <Trash2 className="size-2.5" />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-1 mt-1">
                                                                    <Select onValueChange={(val) => field.onChange(`${val}:${m}`)} value={h}>
                                                                        <FormControl>
                                                                            <SelectTrigger className="bg-white h-10 font-bold border-emerald-100 text-xs">
                                                                                <SelectValue placeholder="" />
                                                                            </SelectTrigger>
                                                                        </FormControl>
                                                                        <SelectContent className="max-h-[200px]">
                                                                            {Array.from({ length: 24 }).map((_, i) => {
                                                                                const val = i.toString().padStart(2, "0")
                                                                                return <SelectItem key={val} value={val}>{val}h</SelectItem>
                                                                            })}
                                                                        </SelectContent>
                                                                    </Select>
                                                                    <span className="font-bold text-slate-300">:</span>
                                                                    <Select onValueChange={(val) => field.onChange(`${h}:${val}`)} value={m}>
                                                                        <FormControl>
                                                                            <SelectTrigger className="bg-white h-10 font-bold border-emerald-100 text-xs">
                                                                                <SelectValue placeholder="" />
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

                                        {/* Retrait */}
                                        <div className="space-y-4 p-4 rounded-xl bg-slate-50/50 border border-slate-100">
                                            <div className="flex items-center justify-between mb-2">
                                                <h3 className="text-[11px] font-black uppercase text-slate-500 flex items-center gap-2">
                                                    <div className="size-1.5 rounded-full bg-red-400" />
                                                    Retrait / Fin
                                                </h3>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="size-6 text-slate-400 hover:text-red-500 hover:bg-red-50"
                                                    onClick={() => {
                                                        form.setValue("date_fin", "", { shouldDirty: true, shouldValidate: true });
                                                        form.setValue("heure_fin", "", { shouldDirty: true, shouldValidate: true });
                                                    }}
                                                    title="Effacer retrait"
                                                >
                                                    <Trash2 className="size-3" />
                                                </Button>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <FormField
                                                    control={form.control}
                                                    name="date_fin"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <div className="flex items-center justify-between">
                                                                <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground whitespace-nowrap">Date de retrait</FormLabel>
                                                                {field.value && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => form.setValue("date_fin", "", { shouldDirty: true, shouldValidate: true })}
                                                                        className="text-slate-400 hover:text-red-500 transition-colors"
                                                                    >
                                                                        <Trash2 className="size-2.5" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <FormControl>
                                                                <Input
                                                                    type="date"
                                                                    {...field}
                                                                    value={field.value || ""}
                                                                    className={`bg-white border-red-100 h-10 text-xs ${field.value ? "text-slate-900" : "text-slate-500"}`}
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="heure_fin"
                                                    render={({ field }) => {
                                                        const val = field.value || ""
                                                        const [h, m] = val.includes(":") ? val.split(":") : ["", ""]
                                                        return (
                                                            <FormItem className="flex flex-col">
                                                                <div className="flex items-center justify-between">
                                                                    <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground whitespace-nowrap">Heure de retrait</FormLabel>
                                                                    {field.value && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => form.setValue("heure_fin", "", { shouldDirty: true, shouldValidate: true })}
                                                                            className="text-slate-400 hover:text-red-500 transition-colors"
                                                                        >
                                                                            <Trash2 className="size-2.5" />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-1 mt-1">
                                                                    <Select onValueChange={(val) => field.onChange(`${val}:${m}`)} value={h}>
                                                                        <FormControl>
                                                                            <SelectTrigger className="bg-white h-10 font-bold border-red-100 text-xs">
                                                                                <SelectValue placeholder="" />
                                                                            </SelectTrigger>
                                                                        </FormControl>
                                                                        <SelectContent className="max-h-[200px]">
                                                                            {Array.from({ length: 24 }).map((_, i) => {
                                                                                const val = i.toString().padStart(2, "0")
                                                                                return <SelectItem key={val} value={val}>{val}h</SelectItem>
                                                                            })}
                                                                        </SelectContent>
                                                                    </Select>
                                                                    <span className="font-bold text-slate-300">:</span>
                                                                    <Select onValueChange={(val) => field.onChange(`${h}:${val}`)} value={m}>
                                                                        <FormControl>
                                                                            <SelectTrigger className="bg-white h-10 font-bold border-red-100 text-xs">
                                                                                <SelectValue placeholder="" />
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
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="texte_libre"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] sm:text-xs uppercase font-bold text-slate-500 flex items-center gap-1.5">
                                                    <FileTextIcon className="size-3.5 text-indigo-400" />
                                                    Notes logistiques / Infos accès
                                                </FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Ex: Code Wifi, Digicode, Stationnement, Etage, Contact technique..."
                                                        className="min-h-[120px] bg-slate-50/30 focus:bg-white transition-all border-slate-200 resize-none"
                                                        {...field}
                                                        value={field.value || ""}
                                                    />
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
                                <Button type="submit" disabled={isSaving} className="min-w-[280px] h-12 shadow-md text-xs sm:text-sm font-bold bg-indigo-600 hover:bg-indigo-700">
                                    {isSaving ? (
                                        <>
                                            <Loader2Icon className="mr-2 size-4 animate-spin" />
                                            Enregistrement...
                                        </>
                                    ) : (
                                        <>
                                            <SaveIcon className="size-4 mr-2" />
                                            Enregistrer
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>

                </Tabs>
            </form>
        </Form >
    )
}
