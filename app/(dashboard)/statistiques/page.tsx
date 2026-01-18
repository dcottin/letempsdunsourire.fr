"use client"

import { useState, useEffect } from "react"
import { StatisticsView } from "@/components/statistics-view"
import { supabase } from "@/lib/supabase"
import { Loader2Icon } from "lucide-react"

// Types duplicated from DevisContratsPage (in a real app, these should be shared)
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
    [key: string]: any
}

const initialDevisData: Devis[] = [
    { id: "D-001", nom_client: "Acme Corp", prix_total: "1200", etat: "Sent", date_debut: "2024-01-15" },
    { id: "D-002", nom_client: "Globex Inc", prix_total: "3450", etat: "Draft", date_debut: "2024-01-16" },
    { id: "D-003", nom_client: "Soylent Corp", prix_total: "850", etat: "Paid", date_debut: "2024-01-14" },
]

const initialContratsData: Contrat[] = [
    { id: "C-101", nom_client: "Acme Corp", type: "Retainer", etat: "Active", date_debut: "2024-01-01", date_fin: "2024-12-31" },
    { id: "C-102", nom_client: "Globex Inc", type: "Project", etat: "Pending", date_debut: "2024-02-01", date_fin: "2024-05-01" },
]

export default function StatisticsPage() {
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

            setContratsList((contratsData || []).map(item => ({ ...item, ...item.data })))
        } catch (e) {
            console.error("Failed to fetch statistics data", e)
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
            <StatisticsView devis={devisList} contrats={contratsList} />
        </div>
    )
}
