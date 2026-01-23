"use client"

import React from "react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { Star } from "lucide-react"
import { FormattedText } from "@/components/ui/formatted-text"

interface ContractHtmlProps {
    data: any
    settings: any
    mode?: "devis" | "contrat"
    isInvoice?: boolean
    showCgv?: boolean
}

export function ContractHtml({ data, settings, mode = "contrat", isInvoice = false, showCgv = true }: ContractHtmlProps) {
    if (!data) return null

    const formatDate = (dateString: string) => {
        if (!dateString) return "Non définie"
        try {
            return format(new Date(dateString), "dd MMMM yyyy", { locale: fr })
        } catch (e) {
            return dateString
        }
    }

    const generateReference = () => {
        const prefix = isInvoice ? "F" : (mode === 'contrat' ? "C" : "D")
        const datePart = data.date_debut ? format(new Date(data.date_debut), "yyyyMMdd") : format(new Date(), "yyyyMMdd")
        const initials = data.nom_client
            ? data.nom_client.split(' ').map((n: string) => n[0]).join('').toUpperCase()
            : "XX"
        return `${prefix}-${datePart}-${initials}`
    }

    const totalTTC = parseFloat(data.prix_total || "0")
    const remise = parseFloat(data.remise || "0")
    const livraison = parseFloat(data.frais_livraison || "0")
    const optionsTotal = data.selected_options?.reduce((acc: number, curr: any) => acc + (parseFloat(curr.price) || 0), 0) || 0
    const subTotal = totalTTC - livraison + remise - optionsTotal

    return (
        <div className="bg-white text-slate-800 font-sans max-w-4xl mx-auto shadow-sm border rounded-xl overflow-hidden print:shadow-none print:border-none">
            {/* Header / Brand */}
            <div className="p-8 md:p-12 bg-slate-50/30 font-sans">
                <div className="flex flex-col md:flex-row justify-between items-start gap-8">
                    <div className="space-y-4 text-left">
                        <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight italic" style={{ fontFamily: "'Dancing Script', cursive" }}>
                            {isInvoice ? "Facture" : (mode === 'contrat' ? "Contrat de location" : "Devis")}
                        </h1>
                        <div className="flex items-center justify-start gap-2">
                            <span className="px-3 py-1 bg-slate-200 text-slate-600 rounded-full text-[10px] md:text-xs font-bold tracking-widest uppercase">
                                Réf: {generateReference()}
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col items-end text-right gap-4 self-end">
                        {(settings?.logo_url || settings?.logo_base64) && (
                            <img
                                src={settings.logo_url || settings.logo_base64}
                                alt={settings.nom_societe}
                                className="max-h-20 md:max-h-24 w-auto object-contain"
                                style={{ maxWidth: settings.logo_width || 150 }}
                            />
                        )}
                        <div className="space-y-1">
                            <p className="font-bold text-slate-900">{settings?.nom_societe || "Mon Entreprise"}</p>
                            <p className="text-xs md:text-sm text-slate-500">{settings?.adresse}</p>
                            <p className="text-xs md:text-sm text-slate-500">{settings?.code_postal} {settings?.ville}</p>
                            <p className="text-xs md:text-sm text-slate-500">{settings?.email_contact}</p>
                            <p className="text-xs md:text-sm text-slate-500">{settings?.telephone_contact}</p>
                            {settings?.siret && <p className="text-[10px] md:text-sm text-slate-500 tracking-tight">SIRET: {settings.siret}</p>}
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-8 md:px-12 pb-8 md:pb-12 space-y-12">
                {/* Info Blocks */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-widest border-b pb-2">Client</h3>
                        <div className="space-y-1">
                            <p className="text-xl font-bold text-slate-900">{data.nom_client}</p>
                            <p className="text-slate-600">{data.adresse_client}</p>
                            <p className="text-slate-600">{data.email_client}</p>
                            <p className="text-slate-600">{data.telephone_client}</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-widest border-b pb-2">Événement</h3>
                        <div className="space-y-1">
                            <p className="text-xl font-bold text-slate-900">{data.nom_evenement || "Événement"}</p>
                            <div className="flex flex-col gap-1 pt-1">
                                <div className="flex items-center gap-2 text-slate-600">
                                    <span className="font-semibold text-slate-900">Date:</span> {formatDate(data.date_debut)}
                                </div>
                                <div className="flex items-center gap-2 text-slate-600">
                                    <span className="font-semibold text-slate-900">Lieu:</span> {data.lieu || "Non spécifié"}
                                </div>
                                {data.heure_debut && (
                                    <div className="flex items-center gap-2 text-slate-600">
                                        <span className="font-semibold text-slate-900">Horaire:</span> {data.heure_debut} - {data.heure_fin}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
                    <div className="border border-slate-900 rounded-xl overflow-hidden">
                        <table className="w-full text-left border-collapse text-xs md:text-sm">
                            <thead>
                                <tr className="bg-slate-50 text-slate-700 text-[10px] md:text-xs uppercase font-black tracking-wider">
                                    <th className="px-2 md:px-6 py-2 md:py-4">Désignation</th>
                                    <th className="px-2 md:px-6 py-2 md:py-4 text-right w-16 md:w-24">P.U.</th>
                                    <th className="px-2 md:px-6 py-2 md:py-4 text-center w-10 md:w-16">Qté</th>
                                    <th className="px-2 md:px-6 py-2 md:py-4 text-right w-16 md:w-24">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* PRESTATION PHOTOBOOTH GROUP */}
                                <tr className="bg-indigo-600 border-t-2 border-indigo-700">
                                    <td colSpan={4} className="px-2 md:px-6 py-1.5 md:py-2 text-[10px] md:text-[11px] font-black text-white uppercase tracking-widest">
                                        Prestation Photobooth
                                    </td>
                                </tr>
                                <tr className="border-l-4 border-l-indigo-600 bg-indigo-50/10">
                                    <td className="px-2 md:px-6 py-2 md:py-4 pl-4 md:pl-10">
                                        <div className="font-bold text-slate-900 leading-tight flex items-start gap-1 md:gap-2 text-xs md:text-sm">
                                            <Star className="size-3 md:size-4 text-indigo-500 fill-indigo-500 shrink-0 mt-0.5" />
                                            {(() => {
                                                const rawTitle = data.offre_impression || data.offre || "Formule Standard";
                                                return rawTitle.includes(":") ? rawTitle.split(":")[0] : rawTitle;
                                            })()}
                                        </div>
                                        <div className="text-[10px] md:text-xs text-slate-500 mt-1 md:mt-2 pl-4 md:pl-6 italic leading-relaxed max-w-xs md:max-w-md">
                                            {(() => {
                                                const rawTitle = data.offre_impression || data.offre || "Formule Standard";
                                                return rawTitle.includes(":") ? rawTitle.split(":")[1]?.trim() : "";
                                            })()}
                                            {data.texte_libre && <div className="mt-1 md:mt-2 text-indigo-600/70 border-l-2 border-indigo-100 pl-2 md:pl-3 not-italic font-medium">{data.texte_libre}</div>}
                                        </div>
                                    </td>
                                    <td className="px-2 md:px-6 py-2 md:py-4 text-right tabular-nums align-top pt-3 md:pt-5 font-medium text-slate-600">{subTotal.toFixed(2)}</td>
                                    <td className="px-2 md:px-6 py-2 md:py-4 text-center uppercase text-[9px] md:text-[10px] font-extrabold align-top pt-3 md:pt-5 text-slate-400">1</td>
                                    <td className="px-2 md:px-6 py-2 md:py-4 text-right font-black tabular-nums align-top pt-3 md:pt-5 text-slate-900">{subTotal.toFixed(2)}</td>
                                </tr>

                                {data.selected_options?.map((opt: any, idx: number) => (
                                    <tr key={idx} className="border-l-4 border-l-indigo-600 bg-indigo-50/10">
                                        <td className="px-2 md:px-6 py-2 md:py-3 pl-4 md:pl-10">
                                            <div className="font-bold text-slate-800 leading-none flex items-center gap-1 md:gap-2 text-xs md:text-sm">
                                                <span className="text-indigo-400 font-extrabold">+</span>
                                                {opt.name}
                                            </div>
                                        </td>
                                        <td className="px-2 md:px-6 py-2 md:py-3 text-right tabular-nums text-slate-600">
                                            {parseFloat(opt.price || 0).toFixed(2)}
                                        </td>
                                        <td className="px-2 md:px-6 py-2 md:py-3 text-center uppercase text-[9px] md:text-[10px] font-extrabold text-slate-400">1</td>
                                        <td className="px-2 md:px-6 py-2 md:py-3 text-right font-bold tabular-nums text-slate-900">
                                            {parseFloat(opt.price || 0).toFixed(2)}
                                        </td>
                                    </tr>
                                ))}

                                {/* DISPLACEMENT GROUP */}
                                {data.frais_livraison && parseFloat(data.frais_livraison) > 0 && (
                                    <>
                                        <tr className="bg-slate-700 border-t border-slate-800">
                                            <td colSpan={4} className="px-2 md:px-6 py-1.5 md:py-2 text-[10px] md:text-[11px] font-black text-white uppercase tracking-widest">
                                                Frais de déplacement
                                            </td>
                                        </tr>
                                        <tr className="border-l-4 border-l-slate-700 bg-slate-50/50">
                                            <td className="px-2 md:px-6 py-2 md:py-4 pl-4 md:pl-10">
                                                <div className="font-bold text-slate-600 uppercase text-[10px] md:text-xs tracking-wide">• {settings?.label_livraison || "Livraison & Déplacement"}</div>
                                            </td>
                                            <td className="px-2 md:px-6 py-2 md:py-4 text-right tabular-nums text-slate-500">{parseFloat(data.frais_livraison).toFixed(2)}</td>
                                            <td className="px-2 md:px-6 py-2 md:py-4 text-center uppercase text-[9px] md:text-[10px] font-extrabold text-slate-300">1</td>
                                            <td className="px-2 md:px-6 py-2 md:py-4 text-right font-bold tabular-nums text-slate-700">{parseFloat(data.frais_livraison).toFixed(2)}</td>
                                        </tr>
                                    </>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Totals */}
                <div className="flex flex-col items-end space-y-3 mt-4">
                    {data.remise && parseFloat(data.remise) > 0 && (
                        <div className="flex justify-between w-64 text-sm font-medium text-pink-600">
                            <span>Remise</span>
                            <span>- {parseFloat(data.remise).toFixed(2)} €</span>
                        </div>
                    )}

                    {settings?.tva_active ? (
                        <>
                            <div className="flex justify-between w-64 text-sm text-slate-500">
                                <span>Total HT</span>
                                <span>{(() => {
                                    const rate = parseFloat(settings.tva_taux || "0");
                                    return (totalTTC / (1 + rate / 100)).toFixed(2);
                                })()} €</span>
                            </div>
                            <div className="flex justify-between w-64 text-sm text-slate-500">
                                <span>TVA ({settings.tva_taux || "0"}%)</span>
                                <span>{(() => {
                                    const rate = parseFloat(settings.tva_taux || "0");
                                    const ht = totalTTC / (1 + rate / 100);
                                    return (totalTTC - ht).toFixed(2);
                                })()} €</span>
                            </div>
                            <div className="flex justify-between w-64 text-2xl font-black text-slate-900 border-t pt-3 mt-3">
                                <span>TOTAL TTC</span>
                                <span>{totalTTC.toFixed(2)} €</span>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex justify-between w-64 text-2xl font-black text-slate-900 border-t pt-3 mt-3">
                                <span>TOTAL</span>
                                <span>{totalTTC.toFixed(2)} €</span>
                            </div>
                            <p className="text-[10px] text-slate-400 italic">TVA non applicable, art. 293 B du CGI</p>
                        </>
                    )}

                    {data.acompte_recu && parseFloat(data.acompte_recu) > 0 && (
                        <div className={`flex justify-between w-64 text-sm font-bold border-t-2 border-dashed pt-3 mt-3 ${data.acompte_paye ? 'text-emerald-600' : 'text-slate-500'}`}>
                            <span>{data.acompte_paye ? "Acompte reçu" : "Acompte à régler"}</span>
                            <span>{data.acompte_paye ? "- " : ""}{parseFloat(data.acompte_recu).toFixed(2)} €</span>
                        </div>
                    )}
                </div>

                {/* Signature Section Placeholder in Preview */}
                <div className="grid grid-cols-2 gap-12 pt-12">
                    <div className="space-y-4">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-loose">Signature Prestataire</p>
                        <div className="h-32 bg-slate-50 border-2 border-dashed rounded-xl flex items-center justify-center overflow-hidden">
                            {settings?.signature_base64 && (
                                <img src={settings.signature_base64} alt="Signature Prestataire" className="max-h-full max-w-full object-contain p-2" />
                            )}
                        </div>
                    </div>
                    <div className="space-y-4">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-loose text-right">Signature Client</p>
                        <div className="h-32 bg-indigo-50/30 border-2 border-dashed border-indigo-100 rounded-xl flex items-center justify-center italic text-indigo-300 text-sm">
                            Signature numérisée après validation
                        </div>
                    </div>
                </div>

                {/* CGV Hook */}
                {showCgv && settings?.cgv_text && (
                    <div className="mt-16 pt-16 border-t space-y-8">
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Conditions Générales de Vente</h2>
                        <div className="text-[11px] text-slate-500 leading-relaxed text-justify columns-1 md:columns-2 gap-12">
                            <FormattedText text={settings.cgv_text} />
                        </div>
                    </div>
                )}
            </div>

            <style jsx>{`
                @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap');
            `}</style>
        </div>
    )
}
