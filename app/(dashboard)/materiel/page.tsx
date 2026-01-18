"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import {
    Camera,
    Copy,
    Image as ImageIcon,
    Loader2,
    Pen,
    Plus,
    Save,
    Trash2,
    X
} from "lucide-react"

// Types
type Materiel = {
    id: string
    nom: string
    config_fonctionnalites: string
    img_main: string | null
    img_real1: string | null
    img_real2: string | null
    img_real3: string | null
    statut: 'Actif' | 'Inactif'
    date_creation: string
}

type Settings = {
    materiels?: Materiel[]
    // Other settings are preserved loosely
    [key: string]: any
}

export default function MaterielPage() {
    // State
    const [settings, setSettings] = useState<Settings>({})
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false)

    // Form State
    const [currentMat, setCurrentMat] = useState<Partial<Materiel>>({})

    // Fetch Settings on Mount
    useEffect(() => {
        fetchSettings()
    }, [])

    const fetchSettings = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('settings')
                .select('data')
                .single()

            if (error) throw error
            if (data?.data) {
                setSettings(data.data)
            }
        } catch (error) {
            console.error("Error fetching settings:", error)
            toast({
                title: "Erreur",
                description: "Impossible de charger les données.",
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }

    const saveSettings = async (newSettings: Settings) => {
        setSaving(true)
        try {
            const { error } = await supabase
                .from('settings')
                .update({ data: newSettings })
                .eq('id', 1) // Assuming single settings row with ID 1 based on previous context, verify if needed

            if (error) throw error

            setSettings(newSettings)
            toast({
                title: "Succès",
                description: "Modifications enregistrées.",
            })
            setIsModalOpen(false)
        } catch (error) {
            console.error("Error saving:", error)
            toast({
                title: "Erreur",
                description: "Erreur lors de l'enregistrement.",
                variant: "destructive"
            })
        } finally {
            setSaving(false)
        }
    }

    // CRUD Operations
    const handleAdd = () => {
        setCurrentMat({
            id: crypto.randomUUID(),
            nom: "",
            config_fonctionnalites: "",
            statut: "Actif",
            date_creation: new Date().toISOString(),
            img_main: null,
            img_real1: null,
            img_real2: null,
            img_real3: null
        })
        setIsModalOpen(true)
    }

    const handleEdit = (mat: Materiel) => {
        setCurrentMat({ ...mat })
        setIsModalOpen(true)
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Supprimer DÉFINITIVEMENT ce matériel ?")) return

        const updatedMateriels = (settings.materiels || []).filter(m => m.id !== id)
        await saveSettings({ ...settings, materiels: updatedMateriels })
    }

    const handleDuplicate = async (mat: Materiel) => {
        if (!confirm("Dupliquer ce matériel ?")) return

        const newMat: Materiel = {
            ...mat,
            id: crypto.randomUUID(),
            nom: `${mat.nom} (Copie)`,
            date_creation: new Date().toISOString()
        }

        const updatedMateriels = [...(settings.materiels || []), newMat]
        await saveSettings({ ...settings, materiels: updatedMateriels })
    }

    const handleSaveForm = async () => {
        if (!currentMat.nom) {
            toast({
                title: "Erreur",
                description: "Le nom est obligatoire.",
                variant: "destructive"
            })
            return
        }

        let updatedMateriels = [...(settings.materiels || [])]
        const index = updatedMateriels.findIndex(m => m.id === currentMat.id)

        if (index >= 0) {
            updatedMateriels[index] = currentMat as Materiel
        } else {
            updatedMateriels.push(currentMat as Materiel)
        }

        await saveSettings({ ...settings, materiels: updatedMateriels })
    }

    // Image Upload Handler
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: keyof Materiel) => {
        const file = e.target.files?.[0]
        if (!file) return

        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const filePath = `materiel/${fileName}`

        try {
            const { error: uploadError } = await supabase.storage
                .from('uploads')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('uploads')
                .getPublicUrl(filePath)

            setCurrentMat(prev => ({ ...prev, [field]: publicUrl }))
        } catch (error) {
            console.error('Error uploading image:', error)
            toast({
                title: "Erreur upload",
                description: "Impossible d'uploader l'image.",
                variant: "destructive"
            })
        }
    }

    const removeImage = (field: keyof Materiel) => {
        setCurrentMat(prev => ({ ...prev, [field]: null }))
    }

    if (loading) {
        return <div className="p-8 flex items-center justify-center text-muted-foreground"><Loader2 className="animate-spin mr-2" /> Chargement...</div>
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                        <Camera className="size-6" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight text-slate-800">Parc Matériel</h2>
                        <p className="text-muted-foreground">Gestion du parc de photobooths.</p>
                    </div>
                </div>
                <Button onClick={handleAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md">
                    <Plus className="mr-2 h-4 w-4" /> Ajouter une machine
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8">
                {settings.materiels?.map((mat) => (
                    <div key={mat.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-200 group relative flex flex-col overflow-hidden">
                        {/* Actions Overlay */}
                        <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full shadow-sm bg-white text-indigo-600 hover:bg-indigo-50 border border-indigo-100" onClick={() => handleEdit(mat)} title="Modifier">
                                <Pen className="h-3 w-3" />
                            </Button>
                            <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full shadow-sm bg-white text-sky-500 hover:bg-sky-50 border border-sky-100" onClick={() => handleDuplicate(mat)} title="Dupliquer">
                                <Copy className="h-3 w-3" />
                            </Button>
                            <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full shadow-sm bg-white text-red-500 hover:bg-red-50 border border-red-100" onClick={() => handleDelete(mat.id)} title="Supprimer">
                                <Trash2 className="h-3 w-3" />
                            </Button>
                        </div>

                        {/* Image Area */}
                        <div className="h-48 bg-slate-50 flex items-center justify-center relative overflow-hidden border-b border-slate-100 group-hover:border-indigo-100 transition-colors">
                            {mat.img_main ? (
                                <img src={mat.img_main} alt={mat.nom} className="w-full h-full object-cover" />
                            ) : (
                                <ImageIcon className="h-12 w-12 text-slate-300" />
                            )}
                        </div>

                        {/* Content */}
                        <div className="p-5 flex flex-col flex-1">
                            <h3 className="font-bold text-lg text-slate-800 mb-1 leading-tight">{mat.nom}</h3>

                            <div className="mt-auto pt-4 border-t border-slate-100">
                                <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Fonctionnalités</p>
                                <p className="text-xs text-slate-500 line-clamp-3 h-[3rem] overflow-hidden whitespace-pre-wrap">
                                    {mat.config_fonctionnalites || "Aucune fonctionnalité configurée."}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Pen className="h-4 w-4 text-indigo-600" />
                            {currentMat.id ? "Modifier le matériel" : "Ajouter une machine"}
                        </DialogTitle>
                        <DialogDescription>
                            Configurez les détails qui apparaîtront sur les devis et contrats.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="nom" className="text-xs font-bold text-slate-500 uppercase">Nom du matériel <span className="text-red-500">*</span></Label>
                            <Input
                                id="nom"
                                value={currentMat.nom || ""}
                                onChange={(e) => setCurrentMat({ ...currentMat, nom: e.target.value })}
                                placeholder="Ex: Borne Vintage #1"
                                className="bg-slate-50"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="features" className="text-xs font-bold text-slate-500 uppercase">Fonctionnalités (Contrat & Devis)</Label>
                            <Textarea
                                id="features"
                                value={currentMat.config_fonctionnalites || ""}
                                onChange={(e) => setCurrentMat({ ...currentMat, config_fonctionnalites: e.target.value })}
                                placeholder="Une fonctionnalité par ligne (ex: Impression Illimitée)..."
                                className="min-h-[100px] bg-slate-50"
                            />
                            <p className="text-[10px] text-slate-400">Ces textes s'afficheront sur les devis PDF.</p>
                        </div>

                        {/* Main Image */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                            <Label className="text-xs font-bold text-indigo-600 uppercase flex items-center gap-2">
                                <ImageIcon className="h-4 w-4" /> Photo Principale (Devis/Contrat)
                            </Label>
                            <div className="flex items-center gap-4">
                                {currentMat.img_main ? (
                                    <div className="w-20 h-20 relative rounded-lg overflow-hidden border border-slate-200 group/img">
                                        <img src={currentMat.img_main} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity cursor-pointer" onClick={() => removeImage('img_main')}>
                                            <X className="text-white h-6 w-6" />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="w-20 h-20 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-300">
                                        <ImageIcon className="h-8 w-8" />
                                    </div>
                                )}
                                <div className="flex-1">
                                    <Input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleImageUpload(e, 'img_main')}
                                        className="text-xs file:bg-indigo-100 file:text-indigo-700 file:border-0 file:rounded-full file:mr-4 hover:file:bg-indigo-200 cursor-pointer"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Realization Images */}
                        <div className="grid grid-cols-3 gap-4">
                            {['img_real1', 'img_real2', 'img_real3'].map((field, idx) => (
                                <div key={field} className="space-y-2">
                                    <Label className="text-[10px] font-bold text-slate-500 uppercase text-center block">Réalisation {idx + 1}</Label>
                                    <div className="h-24 bg-slate-100 rounded-lg relative overflow-hidden border border-slate-200 group/real">
                                        {currentMat[field as keyof Materiel] ? (
                                            <>
                                                <img src={currentMat[field as keyof Materiel] as string} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/real:opacity-100 flex items-center justify-center transition-opacity cursor-pointer" onClick={() => removeImage(field as keyof Materiel)}>
                                                    <X className="text-white h-5 w-5" />
                                                </div>
                                            </>
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                <ImageIcon className="h-6 w-6" />
                                            </div>
                                        )}
                                    </div>
                                    <Input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleImageUpload(e, field as keyof Materiel)}
                                        className="text-[10px] h-8"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>Annuler</Button>
                        <Button onClick={handleSaveForm} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                            {saving && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
                            Enregistrer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
