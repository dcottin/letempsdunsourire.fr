import React from "react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

interface ContractPreviewProps {
    data: any
    settings?: any // For logo and signature
    id?: string
    isInvoice?: boolean
    mode?: "devis" | "contrat"
}

export function ContractPreview({ data, settings, id, isInvoice, mode }: ContractPreviewProps) {
    const formatDate = (dateString: string) => {
        if (!dateString) return "Non définie"
        try {
            return format(new Date(dateString), "dd MMMM yyyy", { locale: fr })
        } catch (e) {
            return dateString
        }
    }

    const generateReference = () => {
        // Determine prefix based on document type
        const prefix = isInvoice ? "F" : (mode === 'contrat' ? "C" : "D")

        // Priority 1: If we have an existing reference, we might want to keep the date and initials but FIX the prefix
        if (data.reference || id) {
            const ref = data.reference || id
            // If it's already in a format like X-2026MMDD-XX, try to just swap the prefix
            if (ref.match(/^[DCAF]-[0-9]{8}-[A-Z0-9]+$/)) {
                return `${prefix}${ref.substring(1)}`
            }
        }

        // Priority 2: Generate from scratch
        const datePart = data.date_debut ? format(new Date(data.date_debut), "yyyyMMdd") : format(new Date(), "yyyyMMdd")
        const initials = data.nom_client
            ? data.nom_client.split(' ').map((n: string) => n[0]).join('').toUpperCase()
            : "XX"
        return `${prefix}-${datePart}-${initials}`
    }

    // Default logo if none provided
    const logoSrc = settings?.logo_base64 || null
    const signatureSrc = settings?.signature_base64 || null

    const renderCGV = (text: string) => {
        if (!text) return null;

        // Phrases to highlight
        const highlights = [
            "l'installation du photobooth n'est pas permise en extérieur",
            "aucunement le droit de déplacer le matériel une fois installé"
        ];

        let content: (string | React.JSX.Element)[] = [text];

        highlights.forEach(phrase => {
            const newContent: (string | React.JSX.Element)[] = [];
            content.forEach(item => {
                if (typeof item === 'string') {
                    const parts = item.split(new RegExp(`(${phrase})`, 'gi'));
                    parts.forEach((part, i) => {
                        if (part.toLowerCase() === phrase.toLowerCase()) {
                            newContent.push(<span key={`${phrase}-${i}`} className="text-red-600 font-extrabold uppercase underline decoration-2 underline-offset-2">{part}</span>);
                        } else if (part) {
                            newContent.push(part);
                        }
                    });
                } else {
                    newContent.push(item);
                }
            });
            content = newContent;
        });

        return <div className="whitespace-pre-wrap">{content}</div>;
    };

    return (
        <div id={id} className="block bg-white w-full max-w-[210mm] mx-auto">
            {/* Page 1: Contract or Invoice */}
            <div className="w-full h-[290mm] max-h-[290mm] overflow-hidden bg-white p-[10mm] relative flex flex-col break-after-page page-break-after-always shadow-none mx-0 mb-0">
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                    <div className="mt-4">
                        <h1
                            className="font-bold text-5xl text-primary tracking-wider mb-6"
                            style={{ fontFamily: 'var(--font-script)' }}
                        >
                            {isInvoice ? "Facture" : (mode === 'contrat' ? "Contrat de location" : (mode === 'devis' ? "Devis" : (data.etat === "Validé" || data.etat === "Signé" ? "Contrat de location" : "Devis")))}
                        </h1>
                        <div className="text-slate-500 text-sm font-mono pl-12">
                            Réf: {generateReference()}
                        </div>
                    </div>
                    <div className="text-right">
                        {logoSrc ? (
                            <img
                                src={logoSrc}
                                alt="Logo Entreprise"
                                style={{ width: '120px', height: 'auto', objectFit: 'contain' }}
                                className="mb-2 ml-auto"
                            />
                        ) : (
                            <div className="h-16 w-32 bg-slate-50 border border-dashed border-slate-200 rounded flex items-center justify-center text-slate-300 text-[8px] mb-2 ml-auto">
                                Logo
                            </div>
                        )}
                        <h2 className="font-bold text-slate-800 text-lg leading-tight">{settings?.nom_societe || "Mon Entreprise"}</h2>
                        <div className="text-slate-500 whitespace-pre-line text-[11px] leading-relaxed mt-1">
                            {settings?.adresse}<br />
                            {settings?.code_postal} {settings?.ville}<br />
                            {settings?.email_contact}<br />
                            {settings?.telephone_contact}<br />
                            {settings?.siret && <span>SIRET: {settings.siret}</span>}
                        </div>
                    </div>
                </div>

                {/* Client & Event Info */}
                <div className="grid grid-cols-2 gap-10 mb-6">
                    <div>
                        <h3 className="uppercase text-xs font-bold text-slate-400 mb-2 border-b pb-1">Client</h3>
                        <p className="font-bold text-lg">{data.nom_client}</p>
                        <p className="text-slate-600">{data.adresse_client}</p>
                        <p className="text-slate-600">{data.email_client}</p>
                        <p className="text-slate-600">{data.telephone_client}</p>
                    </div>
                    <div>
                        <h3 className="uppercase text-xs font-bold text-slate-400 mb-2 border-b pb-1">Événement</h3>
                        <p className="font-bold">{data.nom_evenement || "Événement"}</p>
                        <p className="text-slate-600"><span className="font-medium">Date:</span> {formatDate(data.date_debut)}</p>
                        <p className="text-slate-600"><span className="font-medium">Lieu:</span> {data.lieu || "Non spécifié"}</p>
                        {data.heure_debut && <p className="text-slate-600"><span className="font-medium">Horaire:</span> {data.heure_debut} - {data.heure_fin}</p>}
                    </div>
                </div>

                {/* Description / Items */}
                <div className="flex-grow">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b-2 border-slate-200 text-slate-500 text-[10px] uppercase tracking-wider">
                                <th className="py-3 pl-2">Désignation</th>
                                <th className="py-3 text-right w-24">P.U. (€)</th>
                                <th className="py-3 text-center w-16">Qté</th>
                                <th className="py-3 text-right w-24 pr-2">Total (€)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Main Formula Header */}
                            <tr className="border-b border-slate-200 bg-slate-50/50">
                                <td colSpan={4} className="py-2 pl-2 text-sm font-bold text-slate-800 uppercase tracking-wider">
                                    Prestation Photobooth
                                </td>
                            </tr>

                            {/* Main Formula Item */}
                            <tr className="border-b border-slate-100 text-slate-700 bg-slate-50/30">
                                <td className="py-2 pl-2">
                                    <div className="flex items-center gap-2">
                                        <div className="size-1.5 rounded-full bg-black"></div>
                                        <div>
                                            <p className="font-medium text-sm">{data.offre_impression || data.offre || "Formule Standard"}</p>
                                            {(data.texte_libre) && (
                                                <p className="text-[10px] text-slate-400 mt-0.5 whitespace-pre-line leading-tight">{data.texte_libre}</p>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="py-2 text-right font-mono text-sm text-slate-600">
                                    {(() => {
                                        const total = parseFloat(data.prix_total) || 0;
                                        const remise = parseFloat(data.remise) || 0;
                                        const livraison = parseFloat(data.frais_livraison) || 0;
                                        const ops = data.selected_options?.reduce((acc: number, curr: any) => acc + (parseFloat(curr.price) || 0), 0) || 0;
                                        // Back-calculate: total - delivery + remise - options = base price
                                        return (total - livraison + remise - ops).toFixed(2);
                                    })()}
                                </td>
                                <td className="py-2 text-center text-sm">1</td>
                                <td className="py-2 text-right font-bold font-mono text-sm pr-2 text-slate-800">
                                    {(() => {
                                        const total = parseFloat(data.prix_total) || 0;
                                        const remise = parseFloat(data.remise) || 0;
                                        const livraison = parseFloat(data.frais_livraison) || 0;
                                        const ops = data.selected_options?.reduce((acc: number, curr: any) => acc + (parseFloat(curr.price) || 0), 0) || 0;
                                        return (total - livraison + remise - ops).toFixed(2);
                                    })()}
                                </td>
                            </tr>

                            {/* Selected Options Rows */}
                            {data.selected_options && data.selected_options.map((opt: any, idx: number) => (
                                <tr key={idx} className="border-b border-slate-100 text-slate-700 bg-slate-50/30">
                                    <td className="py-2 pl-2">
                                        <div className="flex items-center gap-2">
                                            <div className="size-1.5 rounded-full bg-black"></div>
                                            <span className="text-sm font-medium">{opt.name}</span>
                                        </div>
                                    </td>
                                    <td className="py-2 text-right font-mono text-sm text-slate-600">
                                        {opt.price ? parseFloat(opt.price).toFixed(2) : "0.00"}
                                    </td>
                                    <td className="py-2 text-center text-sm">1</td>
                                    <td className="py-2 text-right font-bold font-mono text-sm text-slate-600 pr-2">
                                        {opt.price ? parseFloat(opt.price).toFixed(2) : "0.00"}
                                    </td>
                                </tr>
                            ))}

                            {/* Delivery Fee Section */}
                            {data.frais_livraison && parseFloat(data.frais_livraison) > 0 && (
                                <>
                                    {/* Spacer Row */}
                                    <tr className="h-4 border-none"><td colSpan={4}></td></tr>

                                    {/* Header Row */}
                                    <tr className="border-b border-slate-200 bg-slate-50/50">
                                        <td colSpan={4} className="py-2 pl-2 text-sm font-bold text-slate-800 uppercase tracking-wider">
                                            Frais de déplacement
                                        </td>
                                    </tr>

                                    {/* Item Row */}
                                    <tr className="border-b border-slate-100 text-slate-700 bg-slate-50/30">
                                        <td className="py-2 pl-2">
                                            <div className="flex items-center gap-2">
                                                <div className="size-1.5 rounded-full bg-black"></div>
                                                <p className="text-sm font-medium">{settings?.label_livraison || "Livraison & Déplacement"}</p>
                                            </div>
                                        </td>
                                        <td className="py-2 text-right font-mono text-sm text-slate-600">
                                            {parseFloat(data.frais_livraison).toFixed(2)}
                                        </td>
                                        <td className="py-2 text-center text-sm">1</td>
                                        <td className="py-2 text-right font-bold font-mono text-sm text-slate-600 pr-2">
                                            {parseFloat(data.frais_livraison).toFixed(2)}
                                        </td>
                                    </tr>
                                </>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Totals */}
                <div className="flex justify-end mb-6 mt-4">
                    <div className="w-1/2 space-y-2">

                        {data.remise && parseFloat(data.remise) > 0 && (
                            <div className="flex justify-between text-pink-600 text-sm italic">
                                <span>Remise</span>
                                <span>- {parseFloat(data.remise).toFixed(2)} €</span>
                            </div>
                        )}
                        <div className="flex justify-between font-bold text-lg text-slate-800 border-t pt-2">
                            <span>TOTAL TTC</span>
                            <span>{parseFloat(data.prix_total || "0").toFixed(2)} €</span>
                        </div>
                        {data.acompte_recu && parseFloat(data.acompte_recu) > 0 && (
                            <div className={`flex justify-between text-sm pt-1 ${data.acompte_paye ? "text-emerald-600" : "text-slate-500 italic"}`}>
                                <span>{data.acompte_paye ? "Acompte reçu" : "Acompte à régler (30%)"}</span>
                                <span>{data.acompte_paye ? "- " : ""}{parseFloat(data.acompte_recu).toFixed(2)} €</span>
                            </div>
                        )}
                        {/* Reste à payer (Only for Invoices) */}
                        {isInvoice && (
                            <div className="flex flex-col gap-2 mt-2">
                                <div className="flex justify-between font-extrabold text-xl text-primary border-t-2 border-slate-800 pt-2 transition-all">
                                    <span>{data.solde_paye ? "Montant réglé" : "Reste à payer"}</span>
                                    <span>{data.solde_paye ? (
                                        parseFloat(data.prix_total || "0")
                                    ).toFixed(2) : (
                                        parseFloat(data.prix_total || "0") -
                                        (data.acompte_paye ? parseFloat(data.acompte_recu || "0") : 0)
                                    ).toFixed(2)} €</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Signatures or Stamp */}
                <div className="pt-6 border-t border-slate-200">
                    {isInvoice && data.solde_paye && (
                        <div className="flex justify-center w-full">
                            <svg width="340" height="100" viewBox="0 0 340 100" xmlns="http://www.w3.org/2000/svg">
                                <g transform="rotate(-10 170 50)">
                                    <rect x="50" y="28" width="240" height="44" rx="22" ry="22" fill="none" stroke="#059669" strokeWidth="3" />
                                    <text
                                        x="170"
                                        y="56"
                                        fill="#059669"
                                        fontSize="16"
                                        fontFamily="Arial, sans-serif"
                                        fontWeight="800"
                                        textAnchor="middle"
                                        style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}
                                    >
                                        Facture Acquittée
                                    </text>
                                </g>
                            </svg>
                        </div>
                    )}

                    {!isInvoice && (
                        <div className="grid grid-cols-2 gap-10">
                            {/* Signature Prestataire */}
                            <div>
                                <p className="text-xs font-bold uppercase text-slate-500 mb-2">Signature Prestataire</p>
                                <div className="border border-slate-300 rounded bg-slate-50 h-[100px] w-full flex items-center justify-center p-4">
                                    {signatureSrc ? (
                                        <img src={signatureSrc} alt="Signature Prestataire" className="max-h-full max-w-full object-contain" />
                                    ) : (
                                        <span className="text-slate-300 italic text-xs">Emplacement Signature</span>
                                    )}
                                </div>
                            </div>

                            {/* Signature Client */}
                            <div>
                                <p className="text-xs font-bold uppercase text-slate-500 mb-2">Signature Client</p>
                                <div className="border border-slate-300 rounded bg-slate-50 h-[100px] w-full flex items-center justify-center text-slate-300 italic text-xs">

                                </div>
                            </div>
                        </div>
                    )}
                </div>
                <div className="mt-auto pt-6 border-t border-slate-100 text-[10px] text-slate-400 text-center">
                    <p>Conditions générales de vente disponibles sur demande. Document généré automatiquement.</p>
                </div>
            </div>

            {/* Page 2: CGV */}
            {
                settings?.cgv_text && (
                    <div className="w-full h-[290mm] max-h-[290mm] overflow-hidden bg-white px-[12mm] py-[10mm] relative flex flex-col shadow-none mx-0 mb-0">
                        <h2 className="font-bold text-sm text-primary uppercase tracking-wider mb-2 border-b pb-1">
                            Conditions Générales de Vente
                        </h2>
                        <div className="text-[11px] text-justify text-slate-600 leading-snug columns-2 gap-6 flex-grow">
                            {renderCGV(settings.cgv_text)}
                        </div>
                        <div className="mt-8 pt-4 border-t border-slate-200 grid grid-cols-2 gap-10 break-inside-avoid">
                            {/* Signature Prestataire */}
                            <div>
                                <p className="text-xs font-bold uppercase text-slate-500 mb-2">Signature Prestataire</p>
                                <div className="border border-slate-300 rounded bg-slate-50 h-[100px] w-full flex items-center justify-center p-4">
                                    {signatureSrc ? (
                                        <img src={signatureSrc} alt="Signature Prestataire" className="max-h-full max-w-full object-contain" />
                                    ) : (
                                        <span className="text-slate-300 italic text-xs">Emplacement Signature</span>
                                    )}
                                </div>
                            </div>

                            {/* Signature Client */}
                            <div>
                                <p className="text-xs font-bold uppercase text-slate-500 mb-2">Signature Client</p>
                                <div className="border border-slate-300 rounded bg-slate-50 h-[100px] w-full flex items-center justify-center text-slate-300 italic text-xs">

                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    )
}
