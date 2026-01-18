"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { createClient } from "@supabase/supabase-js"
import { Loader2Icon, CheckCircleIcon, XCircleIcon, EyeIcon, XIcon, ChevronRightIcon } from "lucide-react"
import { format } from "date-fns"

// Initialize Supabase client (using public env vars if available, assuming configured)
// We need to use the client-side supabase instance usually exported from lib
import { supabase } from "@/lib/supabase"

type Settings = {
    nom_societe: string
    logo_base64?: string
    offres: { name: string; price: string }[]
    options: { name: string; price: string; public: boolean }[]
    email_contact: string
    telephone_contact: string
}

const DEFAULT_SETTINGS: Settings = {
    nom_societe: "Mon Entreprise",
    email_contact: "",
    telephone_contact: "",
    offres: [
        { name: "Basic", price: "150" },
        { name: "Eclat", price: "250" },
        { name: "Prestige", price: "350" }
    ],
    options: []
}

const EQUIPMENT_OPTIONS = [
    { id: "bois", name: "Bois", img: "", desc: "Finition bois élégante." },
    { id: "blanc", name: "Blanc", img: "", desc: "Finition blanche moderne." },
    { id: "noir", name: "Noir", img: "", desc: "Finition noire sobre." },
    { id: "import", name: "Sans importance", img: "", desc: "Le modèle disponible sera sélectionné." }
]

export default function ReservationPage() {
    const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [success, setSuccess] = useState(false)
    const [selectedEquipment, setSelectedEquipment] = useState<string>("")
    const [modalOpen, setModalOpen] = useState(false)
    const [totalPrice, setTotalPrice] = useState(0)
    const [reservationRef, setReservationRef] = useState<string>("")

    const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm()

    const selectedOfferName = watch("offre")
    const selectedEquipId = watch("equipment_id")
    const selectedOptionsWatch = watch("options_selected") // Array of indices or names

    useEffect(() => {
        fetchSettings()
    }, [])

    useEffect(() => {
        if (selectedEquipId) {
            setSelectedEquipment(selectedEquipId)
        }
    }, [selectedEquipId])

    // Update total price
    useEffect(() => {
        let total = 0
        if (settings && selectedOfferName) {
            const offer = settings.offres.find(o => o.name === selectedOfferName)
            if (offer) total += parseFloat(offer.price)
        }

        if (settings && selectedOptionsWatch && Array.isArray(selectedOptionsWatch)) {
            selectedOptionsWatch.forEach((optName: string) => {
                const opt = settings.options.find(o => o.name === optName)
                if (opt) total += parseFloat(opt.price)
            })
        }

        setTotalPrice(total)
    }, [selectedOfferName, selectedOptionsWatch, settings])

    const fetchSettings = async () => {
        try {
            const { data, error } = await supabase
                .from('settings')
                .select('data') // Select only the data column
                .single()

            if (error) {
                console.warn("Using default settings (DB error):", error)
                return
            }

            if (data && data.data) {
                console.log("Full DB Data:", data.data) // DEBUG
                console.log("Options from DB:", data.data.options) // DEBUG
                setSettings({
                    ...DEFAULT_SETTINGS,
                    ...data.data
                })
            }
        } catch (error) {
            console.error("Error fetching settings:", error)
        } finally {
            setLoading(false)
        }
    }

    const generateReference = (nom: string, date: string) => {
        const datePart = date ? format(new Date(date), "yyyyMMdd") : "00000000"
        const initials = nom
            ? nom.split(' ').map((n: string) => n[0]).join('').toUpperCase()
            : "XX"
        return `D-${datePart}-${initials}`
    }

    const onSubmit = async (data: any) => {
        setSubmitting(true)
        try {
            // Reconstruct selected options array with prices
            const finalOptions: any[] = []
            if (data.options_selected && Array.isArray(data.options_selected)) {
                data.options_selected.forEach((optName: string) => {
                    const found = settings.options.find(o => o.name === optName)
                    if (found) finalOptions.push({ name: found.name, price: found.price })
                })
            }

            const reference = generateReference(data.nom_complet, data.date_debut)
            setReservationRef(reference)

            // Construct the full data object to be stored in the 'data' JSONB column
            const fullData = {
                reference: reference, // Save the readable reference
                nom_client: data.nom_complet,
                email_client: data.email,
                telephone_client: data.telephone,
                adresse_client: data.adresse,
                nom_evenement: data.nom_evenement,
                date_debut: data.date_debut,
                date_fin: data.date_fin,
                lieu: data.lieu,
                texte_libre: data.message,
                equipment_id: data.equipment_id,
                offre: data.offre,
                selected_options: finalOptions,
                prix_total: totalPrice.toString(),
                etat: "Demande Web"
            }

            const { error } = await supabase
                .from('devis')
                .insert([
                    {
                        id: reference, // Use reference as ID now for consistency
                        nom_client: data.nom_complet,
                        prix_total: totalPrice.toString(),
                        date_debut: data.date_debut,
                        etat: "Demande Web",
                        data: fullData // Everything else goes here!
                    }
                ])
            if (error) throw error
            setSuccess(true)


        } catch (error: any) {
            console.error("Error submitting:", error)
            alert(`Erreur lors de l'envoi: ${error.message || error.toString()}`)
        } finally {
            setSubmitting(false)
        }
    }

    const openModal = () => setModalOpen(true)
    const closeModal = () => setModalOpen(false)

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2Icon className="h-10 w-10 animate-spin text-indigo-600" />
            </div>
        )
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-md w-full space-y-6 animate-in zoom-in-95 duration-300">
                    <CheckCircleIcon className="h-20 w-20 text-green-500 mx-auto" />
                    <h2 className="text-3xl font-extrabold text-slate-900">Demande Reçue !</h2>
                    <div className="bg-slate-100 p-4 rounded-xl border border-slate-200">
                        <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-1">Votre Numéro de référence</p>
                        <p className="text-xl font-mono font-bold text-indigo-600">{reservationRef}</p>
                    </div>
                    <p className="text-slate-600">
                        Votre demande de réservation a bien été envoyée à
                        <span className="font-bold text-indigo-600"> {settings?.nom_societe}</span>.
                    </p>
                    <p className="text-sm text-slate-500">
                        Vous recevrez bientôt un devis ou une confirmation par email.
                    </p>
                    <button onClick={() => window.location.reload()} className="inline-block bg-indigo-50 text-indigo-700 px-6 py-3 rounded-xl font-bold hover:bg-indigo-100 transition">
                        Nouvelle demande
                    </button>
                </div>
            </div>
        )
    }

    const currentEquip = EQUIPMENT_OPTIONS.find(e => e.id === selectedEquipment)

    return (
        <div className="bg-slate-50 min-h-screen py-12 px-4 sm:px-6 lg:px-8 font-sans text-slate-900">
            <div className="max-w-3xl mx-auto space-y-8 bg-white p-8 sm:p-12 rounded-3xl shadow-xl border border-slate-100">

                {/* Header */}
                <div className="text-center space-y-4">
                    {settings?.logo_base64 && (
                        <img
                            src={settings.logo_base64}
                            alt="Logo"
                            className="h-24 w-auto mx-auto rounded-xl object-contain shadow-sm"
                        />
                    )}
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                        Demande de réservation
                    </h1>
                    <p className="text-slate-500 max-w-lg mx-auto">
                        Remplissez ce formulaire pour vérifier la disponibilité avec
                        <span className="font-bold text-indigo-600 ml-1">{settings?.nom_societe}</span>
                    </p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 mt-10">

                    {/* Event Section */}
                    <div className="bg-slate-50 p-6 sm:p-8 rounded-2xl border border-slate-200/60 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 transform origin-bottom scale-y-0 group-hover:scale-y-100 transition-transform duration-300"></div>
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-6 flex items-center gap-2">
                            L'Événement
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Nom de l'événement</label>
                                <input
                                    {...register("nom_evenement")}
                                    type="text"
                                    className="block w-full rounded-xl border-slate-200 bg-white text-slate-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3 px-4 border transition-all"
                                    placeholder="Ex: Mariage de Alice & Bob"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Date de l'évènement *</label>
                                <input
                                    {...register("date_debut", { required: true })}
                                    type="date"
                                    className="block w-full rounded-xl border-slate-200 bg-white text-slate-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3 px-4 border transition-all"
                                />
                                {errors.date_debut && <span className="text-red-500 text-xs">Requis</span>}
                            </div>



                            <div className="md:col-span-2 space-y-2">
                                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Lieu / Ville *</label>
                                <input
                                    {...register("lieu", { required: true })}
                                    type="text"
                                    className="block w-full rounded-xl border-slate-200 bg-white text-slate-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3 px-4 border transition-all"
                                    placeholder="Ex: Salle des fêtes de Nantes"
                                />
                                {errors.lieu && <span className="text-red-500 text-xs">Requis</span>}
                            </div>
                        </div>
                    </div>

                    {/* Choice Section */}
                    <div className="bg-slate-50 p-6 sm:p-8 rounded-2xl border border-slate-200/60 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 transform origin-bottom scale-y-0 group-hover:scale-y-100 transition-transform duration-300"></div>
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-6 flex items-center gap-2">
                            Votre Choix
                        </h3>

                        <div className="mb-6 space-y-2">
                            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Type de matériel</label>
                            <div className="relative">
                                <select
                                    {...register("equipment_id")}
                                    className="block w-full rounded-xl border-slate-200 bg-white text-slate-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3 px-4 border appearance-none transition-all cursor-pointer"
                                >
                                    <option value="">-- Je ne sais pas encore --</option>
                                    {EQUIPMENT_OPTIONS.map(eq => (
                                        <option key={eq.id} value={eq.id}>{eq.name}</option>
                                    ))}
                                </select>
                                <ChevronRightIcon className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 rotate-90" />
                            </div>

                            {/* Preview box */}
                            {currentEquip && (
                                <div
                                    onClick={openModal}
                                    className="mt-4 p-4 border border-indigo-100 rounded-xl bg-white flex items-center gap-4 cursor-pointer hover:shadow-md hover:border-indigo-200 transition-all group/preview animate-in fade-in slide-in-from-bottom-2 duration-300"
                                >
                                    {currentEquip.img ? (
                                        <img src={currentEquip.img} className="w-20 h-20 object-cover rounded-lg border border-slate-100 bg-slate-50" />
                                    ) : (
                                        <div className="w-20 h-20 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-center text-slate-300">
                                            <EyeIcon className="h-8 w-8" />
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <span className="text-sm font-bold text-indigo-700 flex items-center gap-2">
                                            <EyeIcon className="h-4 w-4" /> Voir les détails
                                        </span>
                                        <p className="text-xs text-slate-500 mt-1">Cliquez pour voir les photos et fonctionnalités</p>
                                    </div>
                                    <ChevronRightIcon className="h-5 w-5 text-slate-300 group-hover/preview:text-indigo-500 transition-colors" />
                                </div>
                            )}
                        </div>

                        <div className="mb-6 space-y-2">
                            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Formule souhaitée</label>
                            <div className="relative">
                                <select
                                    {...register("offre")}
                                    className="block w-full rounded-xl border-slate-200 bg-white text-slate-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3 px-4 border appearance-none transition-all cursor-pointer"
                                >
                                    <option value="">-- Choisir une formule --</option>
                                    {settings?.offres?.map((off, idx) => (
                                        <option key={idx} value={off.name}>
                                            {off.name} ({off.price}€)
                                        </option>
                                    ))}
                                </select>
                                <ChevronRightIcon className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 rotate-90" />
                            </div>
                        </div>

                        {/* Options Section */}
                        {settings?.options && settings.options.length > 0 && (
                            <div className="mb-6 space-y-3">
                                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Options supplémentaires</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {settings.options.filter(opt => opt.public !== false).map((opt, idx) => (
                                        <label key={idx} className="flex items-center space-x-3 p-3 rounded-xl border border-slate-200 bg-white hover:border-indigo-200 cursor-pointer transition-all">
                                            <input
                                                type="checkbox"
                                                value={opt.name}
                                                {...register("options_selected")}
                                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                            />
                                            <div className="flex-1 flex justify-between items-center">
                                                <span className="text-sm font-medium text-slate-700">{opt.name}</span>
                                                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">+{opt.price}€</span>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="pt-6 border-t border-slate-200 flex justify-between items-center">
                            <span className="text-sm font-medium text-slate-500">Estimation Total</span>
                            <span className="text-2xl font-extrabold text-indigo-600 tracking-tight">{totalPrice.toFixed(2)} €</span>
                        </div>
                    </div>

                    {/* Contact Section */}
                    <div className="space-y-6">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 px-1">Vos Coordonnées</h3>
                        <div className="rounded-xl shadow-sm -space-y-px bg-white isolate">
                            <div className="relative">
                                <label htmlFor="nom_complet" className="sr-only">Nom complet</label>
                                <input
                                    {...register("nom_complet", { required: true })}
                                    type="text"
                                    className="appearance-none rounded-t-xl relative block w-full px-4 py-4 border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:z-10 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm transition-all"
                                    placeholder="Nom complet ou Société"
                                />
                            </div>
                            <div className="relative">
                                <label htmlFor="email" className="sr-only">Adresse Email</label>
                                <input
                                    {...register("email", { required: true })}
                                    type="email"
                                    className="appearance-none relative block w-full px-4 py-4 border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:z-10 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm transition-all"
                                    placeholder="Adresse Email"
                                />
                            </div>
                            <div className="relative">
                                <label htmlFor="telephone" className="sr-only">Téléphone</label>
                                <input
                                    {...register("telephone")}
                                    type="tel"
                                    className="appearance-none relative block w-full px-4 py-4 border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:z-10 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm transition-all"
                                    placeholder="Téléphone"
                                />
                            </div>
                            <div className="relative">
                                <label htmlFor="adresse" className="sr-only">Adresse postale</label>
                                <input
                                    {...register("adresse")}
                                    type="text"
                                    className="appearance-none rounded-b-xl relative block w-full px-4 py-4 border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:z-10 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm transition-all"
                                    placeholder="Votre adresse (pour le devis)"
                                />
                            </div>
                        </div>
                        {errors.nom_complet && <span className="text-red-500 text-xs">Nom requis</span>}
                        {errors.email && <span className="text-red-500 text-xs ml-2">Email requis</span>}
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Message complémentaire (optionnel)</label>
                        <textarea
                            {...register("message")}
                            rows={3}
                            className="block w-full rounded-xl border-slate-200 bg-white text-slate-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3 px-4 border transition-all"
                            placeholder="Quel thème aimeriez-vous, questions particulières, etc."
                        ></textarea>
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-base font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all shadow-lg shadow-indigo-200 hover:shadow-indigo-300 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {submitting ? (
                            <Loader2Icon className="h-5 w-5 animate-spin" />
                        ) : (
                            "Envoyer ma demande"
                        )}
                    </button>
                </form>
            </div >

            {/* Modal */}
            {
                modalOpen && currentEquip && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={closeModal}></div>
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all relative z-10 animate-in zoom-in-95 duration-200">
                            <div className="relative h-56 bg-slate-100 flex items-center justify-center p-4">
                                {currentEquip.img ? (
                                    <img src={currentEquip.img} className="w-full h-full object-contain" />
                                ) : (
                                    <EyeIcon className="h-16 w-16 text-slate-300" />
                                )}
                                <button onClick={closeModal} className="absolute top-4 right-4 bg-white/90 text-slate-400 hover:text-red-500 rounded-full w-8 h-8 flex items-center justify-center shadow-sm transition hover:scale-105">
                                    <XIcon className="h-5 w-5" />
                                </button>
                            </div>
                            <div className="p-8">
                                <h3 className="text-2xl font-bold text-slate-900 mb-2">{currentEquip.name}</h3>
                                <div className="h-1.5 w-12 bg-indigo-500 rounded-full mb-6"></div>
                                <p className="text-slate-600 leading-relaxed">
                                    {currentEquip.desc}
                                </p>
                                <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                                    <button onClick={closeModal} className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition">
                                        Fermer
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    )
}
