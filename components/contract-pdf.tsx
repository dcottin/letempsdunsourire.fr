"use client"

import React from "react"
import { Document, Page, Text, View, StyleSheet, Image, Font } from "@react-pdf/renderer"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

// Register Dancing Script font (WOFF format for compatibility)
Font.register({
    family: 'Dancing Script',
    src: 'https://cdn.jsdelivr.net/npm/@fontsource/dancing-script@5.0.13/files/dancing-script-latin-700-normal.woff',
    fontWeight: 'bold'
});

const styles = StyleSheet.create({
    page: {
        padding: 20,
        fontSize: 10,
        color: "#334155",
        fontFamily: "Helvetica",
        backgroundColor: "#ffffff",
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 10,
        padding: 8,
        backgroundColor: "#f8fafc",
        borderRadius: 12,
    },
    logo: {
        width: 100,
        height: "auto",
        marginBottom: 8,
    },
    title: {
        fontSize: 28,
        fontWeight: "bold",
        color: "#0f172a",
        marginBottom: 8,
        fontFamily: 'Dancing Script',
    },
    referencePill: {
        backgroundColor: "#f1f5f9",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        alignSelf: 'flex-start',
    },
    referenceText: {
        fontSize: 10,
        color: "#475569",
        fontWeight: "bold",
        textTransform: "uppercase",
    },
    companyInfo: {
        textAlign: "right",
    },
    companyName: {
        fontSize: 12,
        fontWeight: "bold",
        color: "#1e293b",
        marginBottom: 4,
    },
    companyDetail: {
        fontSize: 8,
        color: "#64748b",
        lineHeight: 1.4,
    },
    section: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 12,
        gap: 20,
    },
    infoBlock: {
        width: "48%",
    },
    infoTitle: {
        fontSize: 8,
        fontWeight: "bold",
        color: "#4f46e5", // indigo-600
        textTransform: "uppercase",
        letterSpacing: 1,
        borderBottomWidth: 1,
        borderBottomStyle: "solid",
        borderBottomColor: "#e0e7ff",
        marginBottom: 8,
        paddingBottom: 4,
    },
    infoName: {
        fontSize: 12,
        fontWeight: "bold",
        color: "#0f172a",
        marginBottom: 4,
    },
    infoDetail: {
        fontSize: 9,
        color: "#475569",
        lineHeight: 1.4,
    },
    tableContainer: {
        borderWidth: 1.5,
        borderStyle: "solid",
        borderColor: "#000000",
        borderRadius: 12,
        overflow: "hidden", // Crucial pour l'arrondi, on va gérer le bug de bordure autrement
    },
    table: {
        width: "100%",
    },
    tableHeader: {
        flexDirection: "row",
        backgroundColor: "#f8fafc",
        paddingVertical: 8,
        paddingHorizontal: 15,
        color: "#334155",
        fontSize: 9,
        fontWeight: "bold",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10,
    },
    sectionHeaderIndigo: {
        backgroundColor: "#4f46e5", // indigo-600
        paddingVertical: 6,
        paddingHorizontal: 15,
        color: "#ffffff",
        fontSize: 10,
        fontWeight: "bold",
        textTransform: "uppercase",
        letterSpacing: 1,
    },
    sectionHeaderSlate: {
        backgroundColor: "#334155", // slate-700
        paddingVertical: 6,
        paddingHorizontal: 15,
        color: "#ffffff",
        fontSize: 10,
        fontWeight: "bold",
        textTransform: "uppercase",
        letterSpacing: 1,
    },
    tableRow: {
        flexDirection: "row",
        paddingVertical: 6,
        paddingHorizontal: 15,
        alignItems: "flex-start",
    },
    rowIndigo: {
        borderLeftWidth: 4,
        borderLeftColor: "#818cf8", // indigo-400
    },
    rowSlate: {
        borderLeftWidth: 4,
        borderLeftColor: "#cbd5e1", // slate-200
    },
    rowLast: {
        borderBottomLeftRadius: 10,
        borderBottomRightRadius: 10,
    },
    colDesc: { flex: 4 },
    colPu: { flex: 1, textAlign: "right" },
    colQty: { flex: 0.5, textAlign: "center" },
    colTotal: { flex: 1, textAlign: "right" },

    formulaTitleBox: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
    starIcon: { fontSize: 12, color: "#4f46e5" },
    formulaTitle: { fontSize: 10, fontWeight: "bold", color: "#0f172a" },
    formulaText: { fontSize: 8, color: "#64748b", marginLeft: 18, fontStyle: "italic", lineHeight: 1.4 },
    optionPrefix: { fontSize: 12, color: "#818cf8", fontWeight: "bold", marginRight: 4 },

    totalsWrapper: {
        flexDirection: "row",
        justifyContent: "flex-end",
        marginTop: 10,
        paddingTop: 8,
    },
    totals: {
        width: "40%",
    },
    totalRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 5,
    },
    totalLabel: {
        fontSize: 9,
        color: "#64748b",
    },
    totalVal: {
        fontSize: 10,
        fontWeight: "bold",
        color: "#1e293b",
    },
    grandTotal: {
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 2,
        borderTopColor: "#0f172a",
    },
    grandTotalLabel: {
        fontSize: 12,
        fontWeight: "bold",
        color: "#0f172a",
    },
    grandTotalVal: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#0f172a",
    },
    signatures: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 10,
        gap: 30,
    },
    signatureBlock: {
        width: "48%",
    },
    signatureTitle: {
        fontSize: 8,
        fontWeight: "bold",
        color: "#94a3b8",
        textTransform: "uppercase",
        letterSpacing: 1,
        marginBottom: 8,
    },
    signatureBox: {
        height: 70,
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: "#cbd5e1",
        backgroundColor: "#f8fafc",
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    signatureImg: {
        maxHeight: "80%",
        maxWidth: "90%",
        objectFit: "contain",
    },
    cgvTitle: {
        fontSize: 20,
        fontWeight: "bold",
        marginBottom: 20,
        color: "#0f172a",
        borderBottomWidth: 1,
        borderBottomColor: "#f1f5f9",
        paddingBottom: 10,
    },
    cgvText: {
        fontSize: 8,
        textAlign: "justify",
        lineHeight: 1.5,
        color: "#475569",
    },
    cgvBold: { fontWeight: "bold", color: "#1e293b" },
    cgvUnderline: { textDecoration: "underline" },
    cgvRed: { color: "#dc2626" },
    cgvAlert: {
        color: "#dc2626",
        fontWeight: "bold",
        textTransform: "uppercase",
        textDecoration: "underline",
    }
})

interface ContractDocumentProps {
    data: any
    settings: any
    isInvoice?: boolean
    mode?: "devis" | "contrat"
    displayMode?: 'all' | 'contract_only' | 'cgv_only'
}

export const ContractDocument = ({ data, settings, isInvoice, mode, displayMode = 'all' }: ContractDocumentProps) => {
    const formatDate = (dateString: string) => {
        if (!dateString) return "Non définie"
        try {
            return format(new Date(dateString), "dd MMMM yyyy", { locale: fr })
        } catch (e) {
            return dateString
        }
    }

    const formatDateTime = (dateString: string) => {
        if (!dateString) return ""
        try {
            return format(new Date(dateString), "dd/MM/yyyy 'à' HH:mm", { locale: fr })
        } catch (e) {
            return ""
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

    const renderCGV = (text: string) => {
        if (!text) return null;

        // Automatically detected phrases (Red + Bold + Underline)
        const criticalPhrases = [
            "L'INSTALLATION DU PHOTOBOOTH N'EST PAS PERMISE EN EXTÉRIEUR",
            "AUCUNEMENT LE DROIT DE DÉPLACER LE MATÉRIEL UNE FOIS INSTALLÉ"
        ];

        let segments: (string | React.ReactNode)[] = [text];

        // 1. Detect critical phrases
        criticalPhrases.forEach((phrase, phraseIdx) => {
            const newSegments: (string | React.ReactNode)[] = [];
            segments.forEach((seg, segIdx) => {
                if (typeof seg === 'string') {
                    const parts = seg.split(new RegExp(`(${phrase})`, 'gi'));
                    parts.forEach((part, i) => {
                        if (part.toUpperCase() === phrase) {
                            newSegments.push(<Text key={`crit-${phraseIdx}-${segIdx}-${i}`} style={styles.cgvAlert}>{part}</Text>);
                        } else if (part !== "") {
                            newSegments.push(part);
                        }
                    });
                } else {
                    newSegments.push(seg);
                }
            });
            segments = newSegments;
        });

        // 2. Wrap manual formatting
        const finalSegments: (string | React.ReactNode)[] = [];
        segments.forEach((seg, segIdx) => {
            if (typeof seg === 'string') {
                const parts = seg.split(/(\[red\].*?\[\/red\]|\*\*.*?\*\*|__.*?__)/g);
                parts.forEach((part, i) => {
                    const key = `final-${segIdx}-${i}`;
                    if (part.startsWith("[red]") && part.endsWith("[/red]")) {
                        finalSegments.push(<Text key={key} style={styles.cgvRed}>{part.substring(5, part.length - 6)}</Text>);
                    } else if (part.startsWith("**") && part.endsWith("**")) {
                        finalSegments.push(<Text key={key} style={styles.cgvBold}>{part.substring(2, part.length - 2)}</Text>);
                    } else if (part.startsWith("__") && part.endsWith("__")) {
                        finalSegments.push(<Text key={key} style={styles.cgvUnderline}>{part.substring(2, part.length - 2)}</Text>);
                    } else if (part !== "") {
                        finalSegments.push(part);
                    }
                });
            } else {
                finalSegments.push(seg);
            }
        });

        return finalSegments;
    };

    const logoSrc = settings?.logo_url || settings?.logo_base64
    const signaturePresta = settings?.signature_base64
    const signatureClient = data.signature_client_base64

    return (
        <Document>
            {/* Main Page */}
            {(displayMode === 'all' || displayMode === 'contract_only') && (
                <Page size="A4" style={styles.page}>
                    {/* Header */}

                    <View style={styles.header}>
                        <View>
                            <Text style={styles.title}>
                                {isInvoice ? "Facture" : (mode === 'contrat' ? "Contrat de location" : "Devis")}
                            </Text>
                            <View style={styles.referencePill}>
                                <Text style={styles.referenceText}>Réf: {generateReference()}</Text>
                            </View>
                        </View>
                        <View style={styles.companyInfo}>
                            {logoSrc && <Image src={logoSrc} style={styles.logo} />}
                            <Text style={styles.companyName}>{settings?.nom_societe || "Mon Entreprise"}</Text>
                            <Text style={styles.companyDetail}>{settings?.adresse}</Text>
                            <Text style={styles.companyDetail}>{settings?.code_postal} {settings?.ville}</Text>
                            <Text style={styles.companyDetail}>{settings?.email_contact}</Text>
                            <Text style={styles.companyDetail}>{settings?.telephone_contact}</Text>
                            {settings?.siret && <Text style={styles.companyDetail}>SIRET: {settings.siret}</Text>}
                        </View>
                    </View>

                    {/* Client & Event */}
                    <View style={styles.section}>
                        <View style={styles.infoBlock}>
                            <Text style={styles.infoTitle}>Client</Text>
                            <Text style={styles.infoName}>{data.nom_client}</Text>
                            <Text style={styles.infoDetail}>{data.adresse_client}</Text>
                            <Text style={styles.infoDetail}>{data.email_client}</Text>
                            <Text style={styles.infoDetail}>{data.telephone_client}</Text>
                        </View>
                        <View style={styles.infoBlock}>
                            <Text style={styles.infoTitle}>Événement</Text>
                            <Text style={styles.infoName}>{data.nom_evenement || "Événement"}</Text>
                            <Text style={styles.infoDetail}><Text style={{ fontWeight: "bold" }}>Date:</Text> {formatDate(data.date_debut)}</Text>
                            <Text style={styles.infoDetail}><Text style={{ fontWeight: "bold" }}>Lieu:</Text> {data.lieu || "Non spécifié"}</Text>
                            {data.heure_debut && (
                                <Text style={styles.infoDetail}>
                                    <Text style={{ fontWeight: "bold" }}>Horaire:</Text> {data.heure_debut} - {data.heure_fin}
                                </Text>
                            )}
                        </View>
                    </View>

                    {/* Table Container */}
                    <View style={styles.tableContainer}>
                        <View style={styles.table}>
                            <View style={styles.tableHeader}>
                                <Text style={styles.colDesc}>Désignation</Text>
                                <Text style={styles.colPu}>P.U. (€)</Text>
                                <Text style={styles.colQty}>Qté</Text>
                                <Text style={styles.colTotal}>Total (€)</Text>
                            </View>

                            {/* Prestation Photobooth Section */}
                            <Text style={styles.sectionHeaderIndigo}>Prestation Photobooth</Text>

                            {/* Main Offer */}
                            <View style={[
                                styles.tableRow,
                                styles.rowIndigo,
                                { backgroundColor: "#f5f7ff" },
                                (!data.selected_options?.length && !(data.frais_livraison && parseFloat(data.frais_livraison) > 0)) ? styles.rowLast : {}
                            ]}>
                                <View style={styles.colDesc}>
                                    {(() => {
                                        const rawTitle = data.offre_impression || data.offre || "Formule Standard";
                                        const parts = rawTitle.includes(":") ? rawTitle.split(/:(.+)/) : [rawTitle];
                                        const title = parts[0];
                                        const desc = parts[1] ? parts[1].trim() : "";

                                        return (
                                            <>
                                                <View style={styles.formulaTitleBox}>
                                                    <Text style={styles.starIcon}>★</Text>
                                                    <Text style={styles.formulaTitle}>{title}</Text>
                                                </View>
                                                {desc && <Text style={styles.formulaText}>{desc}</Text>}
                                            </>
                                        );
                                    })()}
                                    {data.texte_libre && <Text style={[styles.formulaText, { color: "#4f46e5", fontWeight: "bold" }]}>{data.texte_libre}</Text>}
                                </View>
                                <Text style={styles.colPu}>
                                    {(() => {
                                        const total = parseFloat(data.prix_total) || 0;
                                        const remise = parseFloat(data.remise) || 0;
                                        const livraison = parseFloat(data.frais_livraison) || 0;
                                        const ops = data.selected_options?.reduce((acc: number, curr: any) => acc + (parseFloat(curr.price) || 0), 0) || 0;
                                        return (total - livraison + remise - ops).toFixed(2);
                                    })()}
                                </Text>
                                <Text style={styles.colQty}>1</Text>
                                <Text style={styles.colTotal}>
                                    {(() => {
                                        const total = parseFloat(data.prix_total) || 0;
                                        const remise = parseFloat(data.remise) || 0;
                                        const livraison = parseFloat(data.frais_livraison) || 0;
                                        const ops = data.selected_options?.reduce((acc: number, curr: any) => acc + (parseFloat(curr.price) || 0), 0) || 0;
                                        return (total - livraison + remise - ops).toFixed(2);
                                    })()}
                                </Text>
                            </View>

                            {/* Options */}
                            {data.selected_options?.map((opt: any, idx: number) => {
                                const isLastOption = idx === data.selected_options.length - 1;
                                const hasNoDeliverySuffix = !(data.frais_livraison && parseFloat(data.frais_livraison) > 0);
                                return (
                                    <View key={idx} style={[
                                        styles.tableRow,
                                        styles.rowIndigo,
                                        isLastOption && hasNoDeliverySuffix ? styles.rowLast : {},
                                        { backgroundColor: "#f5f7ff" }
                                    ]}>
                                        <View style={styles.colDesc}>
                                            <View style={styles.formulaTitleBox}>
                                                <Text style={styles.optionPrefix}>+</Text>
                                                <Text style={styles.formulaTitle}>{opt.name}</Text>
                                            </View>
                                        </View>
                                        <Text style={styles.colPu}>{parseFloat(opt.price || 0).toFixed(2)}</Text>
                                        <Text style={styles.colQty}>1</Text>
                                        <Text style={styles.colTotal}>{parseFloat(opt.price || 0).toFixed(2)}</Text>
                                    </View>
                                );
                            })}

                            {/* Delivery Fee Section */}
                            {data.frais_livraison && parseFloat(data.frais_livraison) > 0 ? (
                                <>
                                    <View wrap={false}>
                                        <Text style={styles.sectionHeaderSlate}>Frais de déplacement</Text>
                                        <View style={[styles.tableRow, styles.rowSlate, styles.rowLast, { backgroundColor: "#f8fafc" }]}>
                                            <View style={styles.colDesc}>
                                                <View style={styles.formulaTitleBox}>
                                                    <Text style={[styles.optionPrefix, { color: "#94a3b8" }]}>•</Text>
                                                    <Text style={[styles.formulaTitle, { color: "#475569" }]}>{settings?.label_livraison || "Livraison & Déplacement"}</Text>
                                                </View>
                                            </View>
                                            <Text style={styles.colPu}>{parseFloat(data.frais_livraison).toFixed(2)}</Text>
                                            <Text style={styles.colQty}>1</Text>
                                            <Text style={styles.colTotal}>{parseFloat(data.frais_livraison).toFixed(2)}</Text>
                                        </View>
                                    </View>
                                </>
                            ) : (
                                // No delivery fee, the last row is the last option or the main offer
                                null // Handled in the map above by checking index
                            )}
                        </View>
                    </View>

                    {/* Totals */}
                    <View style={styles.totalsWrapper}>
                        <View style={styles.totals}>
                            {data.remise && parseFloat(data.remise) > 0 && (
                                <View style={styles.totalRow}>
                                    <Text style={[styles.totalLabel, { color: "#db2777" }]}>Remise</Text>
                                    <Text style={[styles.totalVal, { color: "#db2777" }]}>- {parseFloat(data.remise).toFixed(2)} €</Text>
                                </View>
                            )}
                            {settings?.tva_active ? (
                                <>
                                    <View style={styles.totalRow}>
                                        <Text style={styles.totalLabel}>Total HT</Text>
                                        <Text style={styles.totalVal}>
                                            {(() => {
                                                const rate = parseFloat(settings.tva_taux || "0");
                                                const ttc = parseFloat(data.prix_total || "0");
                                                return (ttc / (1 + rate / 100)).toFixed(2);
                                            })()} €
                                        </Text>
                                    </View>
                                    <View style={styles.totalRow}>
                                        <Text style={styles.totalLabel}>TVA ({settings.tva_taux || "0"}%)</Text>
                                        <Text style={styles.totalVal}>
                                            {(() => {
                                                const rate = parseFloat(settings.tva_taux || "0");
                                                const ttc = parseFloat(data.prix_total || "0");
                                                const ht = ttc / (1 + rate / 100);
                                                return (ttc - ht).toFixed(2);
                                            })()} €
                                        </Text>
                                    </View>
                                    <View style={[styles.totalRow, styles.grandTotal]}>
                                        <Text style={styles.grandTotalLabel}>TOTAL TTC</Text>
                                        <Text style={styles.grandTotalVal}>{parseFloat(data.prix_total || "0").toFixed(2)} €</Text>
                                    </View>
                                </>
                            ) : (
                                <>
                                    <View style={[styles.totalRow, styles.grandTotal]}>
                                        <Text style={styles.grandTotalLabel}>TOTAL</Text>
                                        <Text style={styles.grandTotalVal}>{parseFloat(data.prix_total || "0").toFixed(2)} €</Text>
                                    </View>
                                    <View style={{ marginTop: 2, alignItems: "flex-end" }}>
                                        <Text style={{ fontSize: 7, color: "#94a3b8", fontStyle: "italic" }}>
                                            TVA non applicable, art. 293 B du CGI
                                        </Text>
                                    </View>
                                </>
                            )}
                            {data.acompte_recu && parseFloat(data.acompte_recu) > 0 && (
                                <View style={styles.totalRow}>
                                    <Text style={[styles.totalLabel, { color: data.acompte_paye ? "#059669" : "#64748b" }]}>
                                        {data.acompte_paye ? "Acompte reçu" : "Acompte à régler"}
                                    </Text>
                                    <Text style={[styles.totalVal, { color: data.acompte_paye ? "#059669" : "#64748b" }]}>
                                        {data.acompte_paye ? "- " : ""}{parseFloat(data.acompte_recu).toFixed(2)} €
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Signatures */}
                    {!isInvoice && (
                        <View style={styles.signatures} wrap={false}>
                            <View style={styles.signatureBlock}>
                                <Text style={styles.signatureTitle}>Signature Prestataire</Text>
                                <Text style={{ fontSize: 7, color: "transparent", marginBottom: 2 }}>Spacer</Text>
                                <View style={styles.signatureBox}>
                                    {signaturePresta && <Image src={signaturePresta} style={styles.signatureImg} />}
                                </View>
                            </View>
                            <View style={styles.signatureBlock}>
                                <Text style={styles.signatureTitle}>Signature Client</Text>
                                <Text style={{ fontSize: 7, color: "#64748b", marginBottom: 2, fontStyle: "italic" }}>Lu et approuvé, bon pour accord</Text>
                                <View style={styles.signatureBox}>
                                    {signatureClient && <Image src={signatureClient} style={styles.signatureImg} />}
                                    {!signatureClient && <Text style={{ fontSize: 8, color: "#cbd5e1", fontStyle: "italic" }}>En attente</Text>}
                                </View>
                                {signatureClient && (
                                    <Text style={{ fontSize: 6, color: "#94a3b8", marginTop: 2, textAlign: "center" }}>
                                        Signé le {formatDateTime(mode === 'devis' ? (data.date_signature_devis || data.date_signature_client) : (data.date_signature_contrat || data.date_signature_client))}
                                    </Text>
                                )}
                            </View>
                        </View>
                    )}

                </Page>
            )}

            {/* CGV Page */}
            {(displayMode === 'all' || displayMode === 'cgv_only') && !isInvoice && settings?.cgv_text && (
                <Page size="A4" style={styles.page}>
                    <Text style={styles.cgvTitle}>Conditions Générales de Vente</Text>
                    <Text style={styles.cgvText}>{renderCGV(settings.cgv_text)}</Text>

                    <View style={styles.signatures}>
                        <View style={styles.signatureBlock}>
                            <Text style={styles.signatureTitle}>Signature Prestataire</Text>
                            <Text style={{ fontSize: 7, color: "transparent", marginBottom: 2 }}>Spacer</Text>
                            <View style={styles.signatureBox}>
                                {signaturePresta && <Image src={signaturePresta} style={styles.signatureImg} />}
                            </View>
                        </View>
                        <View style={styles.signatureBlock}>
                            <Text style={styles.signatureTitle}>Signature Client</Text>
                            <Text style={{ fontSize: 7, color: "#64748b", marginBottom: 2, fontStyle: "italic" }}>Lu et approuvé, bon pour accord</Text>
                            <View style={styles.signatureBox}>
                                {signatureClient && <Image src={signatureClient} style={styles.signatureImg} />}
                                {!signatureClient && <Text style={{ fontSize: 8, color: "#cbd5e1", fontStyle: "italic" }}>En attente</Text>}
                            </View>
                            {signatureClient && (
                                <Text style={{ fontSize: 6, color: "#94a3b8", marginTop: 2, textAlign: "center" }}>
                                    Signé le {formatDateTime(mode === 'devis' ? (data.date_signature_devis || data.date_signature_client) : (data.date_signature_contrat || data.date_signature_client))}
                                </Text>
                            )}
                        </View>
                    </View>
                </Page>
            )}
        </Document>
    )
}
