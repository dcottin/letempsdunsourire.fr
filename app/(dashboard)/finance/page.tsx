"use client"

import { useState, useEffect } from "react"
import { FinanceView } from "@/components/finance-view"
import { supabase } from "@/lib/supabase"
import { Loader2Icon } from "lucide-react"

type Devis = {
    id: string
    nom_client: string
    prix_total: string
    etat: string
    date_debut: string
    [key: string]: any
}

type Contrat = {
    id: string
    nom_client: string
    etat: string
    type: string
    date_debut: string
    date_fin?: string
    acompte_recu: string
    acompte_paye: boolean
    acompte_methode?: string
    solde_paye: boolean
    solde_methode?: string
    prix_total: string
    remise: string
    frais_livraison: string
    [key: string]: any
}

export default function FinancePage() {
    const [devisList, setDevisList] = useState<Devis[]>([])
    const [contratsList, setContratsList] = useState<Contrat[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const loadData = async () => {
        setIsLoading(true)
        try {
            // Fetch Devis
            const { data: devisData, error: devisError } = await supabase
                .from('devis')
                .select('*')

            if (devisError) throw devisError

            setDevisList((devisData || []).map(item => ({ ...item, ...item.data })))

            // Fetch Contrats
            const { data: contratsData, error: contratsError } = await supabase
                .from('contrats')
                .select('*')

            if (contratsError) throw contratsError

            setContratsList((contratsData || []).map(item => ({
                ...item,
                ...item.data,
                // Explicitly ensure date and method fields are grabbed from data JSON if present
                acompte_date: item.data?.acompte_date || item.acompte_date,
                solde_date: item.data?.solde_date || item.solde_date,
                acompte_methode: item.data?.acompte_methode || item.acompte_methode,
                solde_methode: item.data?.solde_methode || item.solde_methode
            })))
        } catch (e) {
            console.error("Failed to fetch finance data", e)
        } finally {
            setIsLoading(false)
        }
    }

    // Load data from Supabase on mount and focus
    useEffect(() => {
        loadData()

        const handleFocus = () => {
            loadData()
        }

        window.addEventListener("focus", handleFocus)
        return () => window.removeEventListener("focus", handleFocus)
    }, [])

    if (isLoading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2Icon className="size-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
            <FinanceView devis={devisList} contrats={contratsList} />
        </div>
    )
}
