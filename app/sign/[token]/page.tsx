'use client'

import { useState, useEffect, useRef } from "react"
import SignatureCanvas from 'react-signature-canvas'
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle, AlertCircle, PenTool, MailIcon, Clock } from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { ContractHtml } from "@/components/contract-html"
import { FormattedText } from "@/components/ui/formatted-text"
import { signContract } from "@/app/sign/actions"
import { supabase } from "@/lib/supabase"

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { SlideToConfirm } from "@/components/slide-to-confirm"

// Professional PDF Generation
import { pdf } from "@react-pdf/renderer"
import { ContractDocument } from "@/components/contract-pdf"

const DEFAULT_SETTINGS = {
    nom_societe: "Mon Entreprise",
    logo_url: "",
    logo_width: 100
}

export default function SignPage({ params }: { params: Promise<{ token: string }> }) {
    // Unwrapping params in Next.js 15+
    const [token, setToken] = useState<string | null>(null)
    const [contract, setContract] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [signing, setSigning] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [settings, setSettings] = useState<any>(DEFAULT_SETTINGS)
    const [agreementChecked, setAgreementChecked] = useState(false)
    const [step, setStep] = useState<1 | 2 | 3>(1)
    const [sendingEmail, setSendingEmail] = useState(false)

    const sigCanvas = useRef<SignatureCanvas>(null)

    useEffect(() => {
        params.then(p => setToken(p.token))
    }, [params])

    useEffect(() => {
        if (!token) return

        const fetchContract = async () => {
            try {
                // Search in both tables and multiple token fields
                const tables = ['contrats', 'devis'];
                const tokenFields = ['access_token_contrat', 'access_token_devis', 'access_token'];

                let foundItem = null;
                let foundMode: 'devis' | 'contrat' = 'contrat';

                for (const table of tables) {
                    for (const field of tokenFields) {
                        const { data, error } = await supabase
                            .from(table)
                            .select('*')
                            .eq(`data->>${field}`, token)
                            .maybeSingle();

                        if (error) {
                            console.error(`Error querying ${table} with ${field}:`, error);
                            continue;
                        }

                        if (data) {
                            foundItem = data;
                            // Determine mode: 
                            // 1. If token matched 'access_token_devis', it's a devis
                            // 2. If token matched 'access_token_contrat', it's a contrat
                            // 3. Fallback to ID prefix if legacy token
                            if (field === 'access_token_devis') foundMode = 'devis';
                            else if (field === 'access_token_contrat') foundMode = 'contrat';
                            else foundMode = data.id?.startsWith('C') ? 'contrat' : 'devis';

                            break;
                        }
                    }
                    if (foundItem) break;
                }

                if (!foundItem) {
                    setError("Ce lien est invalide ou a expiré.")
                } else {
                    setContract({ ...foundItem, ...foundItem.data, _forcedMode: foundMode })
                }
            } catch (err) {
                console.error("Error fetching document:", err)
                setError("Impossible de charger le document.")
            } finally {
                setLoading(false)
            }
        }



        const fetchSettings = async () => {
            try {
                const { data: records, error } = await supabase
                    .from('settings')
                    .select('*')
                    .limit(1)

                if (records && records.length > 0) {
                    setSettings({ ...DEFAULT_SETTINGS, ...records[0].data })
                }
            } catch (e) {
                console.error("Error fetching settings:", e)
            }
        }

        fetchContract()
        fetchSettings()
    }, [token])

    const handleClear = () => {
        sigCanvas.current?.clear()
    }

    const handleSign = async () => {
        if (!sigCanvas.current || sigCanvas.current.isEmpty()) {
            alert("Veuillez signer dans le cadre avant de valider.")
            return
        }

        setSigning(true)
        try {
            const signatureData = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png')
            const result = await signContract(token!, signatureData)

            if (result.error) {
                throw new Error(result.error)
            }

            setSuccess(true)
            setContract((prev: any) => ({ ...prev, contrat_signe: true, signature_client_base64: signatureData }))
        } catch (err: any) {
            console.error("Signing error:", err)
            alert(err.message || "Erreur lors de la signature.")
        } finally {
            setSigning(false)
        }
    }



    const handleSendEmail = async () => {
        if (!contract || !contract.email_client) return

        setSendingEmail(true)
        try {
            console.log("CAPTURE LOG: Starting PDF generation with react-pdf...");

            // Generate PDF as blob using react-pdf
            const blob = await pdf(
                <ContractDocument
                    data={contract}
                    settings={settings}
                    mode={contract._forcedMode === 'contrat' ? 'contrat' : 'devis'}
                />
            ).toBlob();

            console.log("CAPTURE LOG: PDF Blob generated. Size:", blob.size);

            if (blob.size < 1000) {
                throw new Error("Le PDF généré semble vide ou invalide.");
            }

            // Convert Blob to Base64
            const reader = new FileReader();
            const base64Promise = new Promise<string>((resolve) => {
                reader.onloadend = () => {
                    const base64 = (reader.result as string).split(',')[1];
                    resolve(base64);
                };
            });
            reader.readAsDataURL(blob);
            const base64Content = await base64Promise;


            // Custom Email Template & Tag Replacement
            const replacements: Record<string, string> = {
                "{{client_name}}": contract.nom_client || "Client",
                "{{client_phone}}": contract.telephone_client || "",
                "{{client_email}}": contract.email_client || "",
                "{{client_address}}": contract.adresse_client || "",
                "{{company_name}}": settings?.nom_societe || "Mon Entreprise",
                "{{doc_number}}": contract.reference || "signed",
                "{{doc_type}}": "Contrat",
                "{{event_date}}": contract.date_debut ? new Date(contract.date_debut).toLocaleDateString('fr-FR') : "",
                "{{event_time}}": contract.heure_debut || "",
                "{{event_end_time}}": contract.heure_fin || "",
                "{{event_location}}": contract.lieu || "",
                "{{total_amount}}": `${parseFloat(contract.prix_total || "0").toFixed(2)}€`,
                "{{deposit_amount}}": (() => {
                    const acc = contract.acompte_recu || contract.acompte_demande;
                    return acc ? `${parseFloat(acc).toFixed(2)}€` : "0.00€";
                })(),
                "{{balance_amount}}": (parseFloat(contract.prix_total || "0") - parseFloat(contract.acompte_recu || contract.acompte_demande || "0")).toFixed(2) + "€",
                "{{company_logo}}": settings?.logo_url ? `<img src="${settings.logo_url}" alt="${settings.nom_societe}" width="${settings.logo_width || 100}" />` : "",
            };

            const isContract = contract._forcedMode === 'contrat';
            const docLabel = isContract ? 'Contrat' : 'Devis';
            const docLabelLower = isContract ? 'contrat' : 'devis';

            let subject = isContract
                ? (settings?.email_contrat_signed_subject || `Votre contrat signé - ${settings.nom_societe}`)
                : `Votre devis signé - ${settings.nom_societe}`;

            let message = isContract
                ? (settings?.email_contrat_signed_body || `Bonjour ${contract.nom_client},\n\nMerci d'avoir signé votre contrat. Vous trouverez ci-joint la copie PDF du document.\n\nCordialement,\n${settings.nom_societe}`)
                : `Bonjour ${contract.nom_client},\n\nMerci d'avoir signé votre devis. Vous trouverez ci-joint la copie PDF du document.\n\nCordialement,\n${settings.nom_societe}`;

            Object.entries(replacements).forEach(([key, value]) => {
                subject = subject.split(key).join(value || "");
                message = message.split(key).join(value || "");
            });

            const response = await fetch('/api/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: contract.email_client,
                    subject: subject,
                    message: message,
                    fromName: settings.nom_societe,
                    attachments: [
                        {
                            filename: `${docLabel}_${contract.reference || 'signed'}.pdf`,
                            content: base64Content,
                        }
                    ]
                })
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || "Erreur lors de l'envoi");
            }

            alert(`${docLabel} envoyé à ${contract.email_client} !`)

        } catch (e: any) {
            console.error("Email error:", e)
            alert(`Erreur lors de l'envoi du mail : ${e.message || e}`)
        } finally {
            setSendingEmail(false)
        }
    }



    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                    <p className="text-muted-foreground">Chargement du document...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <Card className="w-full max-w-md border-red-200 shadow-lg">
                    <CardHeader className="bg-red-50 rounded-t-lg pb-4">
                        <div className="mx-auto bg-red-100 p-3 rounded-full w-fit mb-2">
                            <AlertCircle className="h-8 w-8 text-red-600" />
                        </div>
                        <CardTitle className="text-center text-red-700">Lien invalide</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 text-center text-muted-foreground">
                        {error}
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (success || contract?.contrat_signe) {
        return (
            <div className="min-h-screen bg-slate-50 p-4 md:p-8 flex items-center justify-center">
                <div className="max-w-4xl w-full mx-auto space-y-6">
                    <Card className="border-emerald-200 shadow-lg bg-emerald-50/50">
                        <CardContent className="pt-10 pb-12 flex flex-col items-center text-center gap-8">
                            {settings?.logo_url && (
                                <img
                                    src={settings.logo_url}
                                    alt="Logo"
                                    className="max-h-20 w-auto object-contain mb-2"
                                />
                            )}

                            <div className="space-y-8">
                                <h1 className="text-3xl font-extrabold text-emerald-800 tracking-tight">
                                    Document signé avec succès !
                                </h1>

                                {(contract?.date_signature_client || contract?.date_signature_devis || contract?.date_signature_contrat) && (
                                    <div className="flex items-center justify-center gap-2 text-emerald-700 bg-emerald-100/50 py-2 px-4 rounded-full w-fit mx-auto">
                                        <Clock className="size-4" />
                                        <span className="text-sm font-medium">
                                            Signé le {format(new Date(contract.date_signature_devis || contract.date_signature_contrat || contract.date_signature_client), "dd/MM/yyyy 'à' HH:mm", { locale: fr })}
                                        </span>
                                    </div>
                                )}

                                <Button
                                    onClick={handleSendEmail}
                                    disabled={sendingEmail}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 px-8 py-6 text-lg font-semibold shadow-lg transition-all hover:scale-105"
                                >
                                    {sendingEmail ? (
                                        <>
                                            <Loader2 className="size-4 animate-spin" /> Envoi en cours...
                                        </>
                                    ) : (
                                        <>
                                            <MailIcon className="size-4" /> Recevoir mon {contract._forcedMode === 'contrat' ? 'contrat' : 'devis'} par mail
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50 py-8 px-4">
            <div className="max-w-4xl mx-auto space-y-6">

                {/* Header with Stepper */}
                <div className="flex flex-col gap-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">
                                {step === 1 && (contract._forcedMode === 'contrat' ? '1. Votre Contrat' : '1. Votre Devis')}
                                {step === 2 && "2. Conditions Générales (CGV)"}
                                {step === 3 && "3. Validation & Signature"}
                            </h1>
                            <p className="text-slate-500 text-sm">
                                {step === 1 && "Relisez les détails de votre prestation."}
                                {step === 2 && "Prenez connaissance de nos conditions générales de vente."}
                                {step === 3 && "Finalisez votre accord en signant le document."}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            {[1, 2, 3].map((s) => (
                                <div key={s} className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-colors ${step >= s ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                    {s}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Step 1: Contract Preview */}
                {step === 1 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300 pb-20">
                        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                            <div className="p-0">
                                <ContractHtml data={contract} mode={contract._forcedMode === 'contrat' ? 'contrat' : 'devis'} settings={settings} showCgv={false} />
                            </div>
                        </div>

                        {/* Sticky Action Bar */}
                        <div className="fixed bottom-0 left-0 w-full bg-white border-t p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50 flex justify-center md:justify-end md:px-8">
                            <div className="w-full max-w-4xl flex justify-end">
                                <Button onClick={() => setStep(2)} size="lg" className="bg-indigo-600 hover:bg-indigo-700 shadow-lg text-base px-8 py-6 h-auto">
                                    Étape suivante : Lire les CGV
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2: CGV */}
                {step === 2 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300 pb-20">
                        <Card className="shadow-lg border-indigo-100 overflow-hidden">
                            <CardHeader className="bg-slate-50 border-b">
                                <CardTitle className="text-xl font-black text-slate-900 tracking-tight">Conditions Générales de Vente</CardTitle>
                                <CardDescription>Veuillez prendre connaissance de nos conditions générales.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-8 md:p-12">
                                <div className="text-[13px] text-slate-600 leading-relaxed text-justify">
                                    {settings?.cgv_text ? (
                                        <FormattedText text={settings.cgv_text} />
                                    ) : (
                                        "Aucune condition générale n'a été configurée."
                                    )}
                                </div>
                            </CardContent>
                            <CardFooter className="bg-slate-50 p-4 border-t flex justify-between">
                                <Button variant="outline" onClick={() => setStep(1)}>Retour au contrat</Button>
                                <Button onClick={() => setStep(3)} className="bg-indigo-600 hover:bg-indigo-700">J'ai lu et j'accepte</Button>
                            </CardFooter>
                        </Card>
                    </div>
                )}

                {/* Step 3: Signature Area */}
                {step === 3 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                        <Card className="shadow-lg border-indigo-100 overflow-hidden">
                            <CardHeader className="bg-indigo-50/50 border-b border-indigo-100">
                                <CardTitle className="flex items-center gap-2 text-indigo-900">
                                    <PenTool className="size-5" /> Zone de Signature
                                </CardTitle>
                                <CardDescription>
                                    {agreementChecked
                                        ? "Signez dans le cadre ci-dessous pour valider."
                                        : "Confirmez d'abord la lecture du document."}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="min-h-[250px] w-full bg-white relative">
                                    {!agreementChecked ? (
                                        /* Slider overlay - disappears after confirmation */
                                        <div className="absolute inset-0 flex items-center justify-center bg-slate-50 z-10">
                                            <SlideToConfirm onConfirm={() => setAgreementChecked(true)} />
                                        </div>
                                    ) : (
                                        /* Signature canvas - appears after confirmation */
                                        <>
                                            <SignatureCanvas
                                                ref={sigCanvas}
                                                canvasProps={{
                                                    className: 'w-full h-full block cursor-crosshair',
                                                    style: { width: '100%', height: '250px' }
                                                }}
                                                backgroundColor="rgba(255, 255, 255, 1)"
                                            />
                                            <div className="absolute top-0 left-0 w-full h-full pointer-events-none border-2 border-dashed border-indigo-100" />
                                            <div className="absolute bottom-2 right-2 text-[10px] text-slate-300 pointer-events-none">
                                                Signez ici
                                            </div>
                                        </>
                                    )}
                                </div>
                            </CardContent>
                            <CardFooter className="bg-slate-50 p-4 flex justify-between items-center border-t">
                                <Button variant="outline" onClick={() => setStep(2)}>
                                    Retour aux CGV
                                </Button>
                                <div className="flex gap-2">
                                    <Button variant="ghost" onClick={handleClear} size="sm" className="text-slate-500 hover:text-slate-700">
                                        Effacer
                                    </Button>
                                    <Button onClick={handleSign} disabled={signing || !agreementChecked} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
                                        {signing ? (
                                            <>
                                                <Loader2 className="size-4 animate-spin" /> Signature en cours...
                                            </>
                                        ) : (
                                            <>
                                                <PenTool className="size-4" /> Valider et Signer
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </CardFooter>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    )
}
