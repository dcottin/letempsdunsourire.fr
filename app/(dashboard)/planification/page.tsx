"use client"

import { useState, useEffect } from "react"
import { CalendarIcon, MapPinIcon, TruckIcon, ExternalLinkIcon, RefreshCwIcon, ClockIcon, Trash2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

// Mock Nominatim (OpenStreetMap) Geocoding
const geocodeAddress = async (address: string): Promise<{ lat: number, lon: number, display_name: string } | null> => {
    try {
        console.log(`Geocoding: ${address}`)
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`, {
            headers: {
                'User-Agent': 'NextApp/1.0 (contact@example.com)' // Required by Nominatim
            }
        })
        const data = await response.json()
        if (data && data.length > 0) {
            console.log(`Geocoded: ${address} -> ${data[0].lat}, ${data[0].lon}`)
            return {
                lat: parseFloat(data[0].lat),
                lon: parseFloat(data[0].lon),
                display_name: data[0].display_name
            }
        }
        console.warn(`Geocoding failed for: ${address}`)
        return null
    } catch (error) {
        console.error("Geocoding error", error)
        return null
    }
}

// Haversine Distance Calculation (approximate straight line)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371 // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1)
    const dLon = deg2rad(lon2 - lon1)
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const d = R * c // Distance in km
    return d
}

const deg2rad = (deg: number) => {
    return deg * (Math.PI / 180)
}

type DeliveryStop = {
    id: string
    nom_client: string
    adresse: string
    lat?: number
    lon?: number
    distanceFromPrev?: number
    date_debut?: string
    travelTime?: number
    estimatedArrival?: string
    estimatedDeparture?: string
}

// OSRM Routing API
const getRouteData = async (coords: { lat: number, lon: number }[]): Promise<{ distances: number[], durations: number[] } | null> => {
    try {
        const coordString = coords.map(c => `${c.lon},${c.lat}`).join(';')
        const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordString}?overview=false`)
        const data = await response.json()
        if (data.code === 'Ok' && data.routes.length > 0) {
            const route = data.routes[0]
            return {
                // OSRM returns distances in meters and durations in seconds
                distances: route.legs.map((l: any) => l.distance / 1000),
                durations: route.legs.map((l: any) => l.duration / 60)
            }
        }
        return null
    } catch (error) {
        console.error("OSRM error", error)
        return null
    }
}

// Helper to round to next quarter hour
const roundToNextQuarter = (date: Date) => {
    const minutes = date.getMinutes()
    const roundedMinutes = Math.ceil(minutes / 15) * 15
    const newDate = new Date(date)
    newDate.setMinutes(roundedMinutes, 0, 0)
    return newDate
}

export default function PlanificationPage() {
    const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"))
    const [startCity, setStartCity] = useState("")
    const [endCity, setEndCity] = useState("")
    const [startTime, setStartTime] = useState("08:00")
    const [stops, setStops] = useState<DeliveryStop[]>([])
    const [optimizedRoute, setOptimizedRoute] = useState<DeliveryStop[]>([])
    const [returnLeg, setReturnLeg] = useState<{ distance: number, duration: number, arrivalAtReturn: string } | null>(null)
    const [installTime, setInstallTime] = useState(45)
    const [geocodingProgress, setGeocodingProgress] = useState<{ current: number, total: number } | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [message, setMessage] = useState<string | null>(null)
    const [mounted, setMounted] = useState(false)

    // Fetch Settings to pre-fill cities
    useEffect(() => {
        setMounted(true)
        const fetchSettings = async () => {
            const { data: settings } = await supabase
                .from('personnalisation')
                .select('*')
                .single()

            if (settings) {
                if (settings.ville && !startCity) setStartCity(settings.ville)
                if (settings.ville && !endCity) setEndCity(settings.ville)
            }
        }
        fetchSettings()
    }, [])

    const handleReset = () => {
        setStops([])
        setOptimizedRoute([])
        setReturnLeg(null)
        setMessage(null)
        setGeocodingProgress(null)
    }

    const handlePlanRoute = async () => {
        setIsLoading(true)
        setMessage(null)
        setStops([])
        setOptimizedRoute([])
        setReturnLeg(null)
        setGeocodingProgress(null)

        if (!startCity) {
            setMessage("Veuillez renseigner une ville de départ.")
            setIsLoading(false)
            return
        }

        try {
            // 1. Fetch Contracts for the Date
            const { data: allContracts, error } = await supabase
                .from('contrats')
                .select('*')

            if (error) throw error

            const rawContracts = allContracts?.filter(c =>
                c.date_debut && (c.date_debut === selectedDate || c.date_debut.startsWith(selectedDate))
            ) || []

            const contracts = rawContracts.map(c => ({
                ...c,
                ...c.data
            }))

            if (contracts.length === 0) {
                setMessage("Aucun contrat trouvé pour cette date.")
                setIsLoading(false)
                return
            }

            setGeocodingProgress({ current: 0, total: contracts.length + 1 })

            // 2. Geocode Start City
            const startLocation = await geocodeAddress(startCity)
            if (!startLocation) {
                setMessage("Impossible de localiser la ville de départ.")
                setIsLoading(false)
                return
            }
            if (startLocation.display_name) {
                setStartCity(startLocation.display_name.split(',')[0])
            }
            setGeocodingProgress(prev => prev ? { ...prev, current: 1 } : null)

            // 3. Geocode Delivery Addresses
            const deliveryStops: DeliveryStop[] = []
            for (let i = 0; i < contracts.length; i++) {
                const contract = contracts[i]
                const parts = [contract.lieu, contract.adresse, contract.ville, contract.code_postal].filter(Boolean)
                const addressQuery = parts.length > 0 ? parts.join(", ") : (contract.nom_evenement || "Adresse inconnue")

                const loc = await geocodeAddress(addressQuery)

                if (loc) {
                    deliveryStops.push({
                        id: contract.id,
                        nom_client: contract.nom_client,
                        adresse: loc.display_name,
                        lat: loc.lat,
                        lon: loc.lon,
                        date_debut: contract.date_debut
                    })
                }
                setGeocodingProgress(prev => prev ? { ...prev, current: i + 2 } : null)
                await new Promise(resolve => setTimeout(resolve, 1000))
            }

            setStops(deliveryStops)
            setGeocodingProgress(null)

            // 4. Optimize Route (TSP Solver)
            const validStops = deliveryStops.filter(s => s.lat !== undefined && s.lon !== undefined)
            if (validStops.length === 0) {
                setMessage("Contrats trouvés, mais impossible de localiser les adresses.")
                setIsLoading(false)
                return
            }

            let endLocation = null
            if (endCity) {
                endLocation = await geocodeAddress(endCity)
            }

            let optimized: DeliveryStop[] = []

            if (validStops.length <= 9) {
                let bestPath: DeliveryStop[] = []
                let minTotalDist = Infinity

                const permute = (arr: DeliveryStop[], m: DeliveryStop[] = []) => {
                    if (arr.length === 0) {
                        let currentDist = 0
                        let prevLoc = { lat: startLocation.lat, lon: startLocation.lon }

                        for (const stop of m) {
                            currentDist += calculateDistance(prevLoc.lat, prevLoc.lon, stop.lat!, stop.lon!)
                            prevLoc = { lat: stop.lat!, lon: stop.lon! }
                        }

                        if (endLocation) {
                            currentDist += calculateDistance(prevLoc.lat, prevLoc.lon, endLocation.lat, endLocation.lon)
                        }

                        if (currentDist < minTotalDist) {
                            minTotalDist = currentDist
                            bestPath = JSON.parse(JSON.stringify(m))
                        }
                    } else {
                        for (let i = 0; i < arr.length; i++) {
                            let curr = arr.slice()
                            let next = curr.splice(i, 1)
                            permute(curr.slice(), m.concat(next))
                        }
                    }
                }
                permute(validStops)
                optimized = bestPath

                let prevLoc = { lat: startLocation.lat, lon: startLocation.lon }
                optimized.forEach(s => {
                    s.distanceFromPrev = calculateDistance(prevLoc.lat, prevLoc.lon, s.lat!, s.lon!)
                    prevLoc = { lat: s.lat!, lon: s.lon! }
                })
            } else {
                let currentLocation = { lat: startLocation.lat, lon: startLocation.lon }
                let remainingStops = [...validStops]

                while (remainingStops.length > 0) {
                    let bestIdx = -1
                    let bestScore = Infinity

                    for (let i = 0; i < remainingStops.length; i++) {
                        const stop = remainingStops[i]
                        const dStart = calculateDistance(currentLocation.lat, currentLocation.lon, stop.lat!, stop.lon!)
                        if (dStart < bestScore) {
                            bestScore = dStart
                            bestIdx = i
                        }
                    }

                    const nextStop = remainingStops[bestIdx]
                    nextStop.distanceFromPrev = bestScore
                    optimized.push(nextStop)
                    currentLocation = { lat: nextStop.lat!, lon: nextStop.lon! }
                    remainingStops.splice(bestIdx, 1)
                }
            }

            setOptimizedRoute(optimized)

            // 5. Fetch Real Road Data (OSRM)
            const routeCoords = [
                { lat: startLocation.lat, lon: startLocation.lon },
                ...optimized.map(s => ({ lat: s.lat!, lon: s.lon! }))
            ]
            if (endLocation) {
                routeCoords.push({ lat: endLocation.lat, lon: endLocation.lon })
            }

            const realRoute = await getRouteData(routeCoords)

            // 6. Calculate Times
            let currentTime = new Date(`${selectedDate}T${startTime}:00`)

            optimized.forEach((stop, index) => {
                const realDist = realRoute ? realRoute.distances[index] : stop.distanceFromPrev || 0
                const realDuration = realRoute ? realRoute.durations[index] : (realDist / 50 * 60)

                stop.distanceFromPrev = realDist
                stop.travelTime = Math.round(realDuration)

                currentTime = new Date(currentTime.getTime() + realDuration * 60000)
                currentTime = roundToNextQuarter(currentTime)
                stop.estimatedArrival = format(currentTime, 'HH:mm')

                currentTime = new Date(currentTime.getTime() + installTime * 60000)
                currentTime = roundToNextQuarter(currentTime)
                stop.estimatedDeparture = format(currentTime, 'HH:mm')
            })

            setOptimizedRoute([...optimized])

            if (endLocation && realRoute) {
                const lastLegIndex = realRoute.distances.length - 1
                const returnDuration = realRoute.durations[lastLegIndex]
                currentTime = new Date(currentTime.getTime() + returnDuration * 60000)
                currentTime = roundToNextQuarter(currentTime)
                setReturnLeg({
                    distance: realRoute.distances[lastLegIndex],
                    duration: returnDuration,
                    arrivalAtReturn: format(currentTime, 'HH:mm')
                })
            } else {
                setReturnLeg(null)
            }

        } catch (e: any) {
            console.error("Planning error", e)
            setMessage("Une erreur est survenue lors de la planification.")
        } finally {
            setIsLoading(false)
        }
    }

    const generateMapsLink = () => {
        if (!optimizedRoute.length) return "#"

        const origin = encodeURIComponent(startCity)
        const waypoints = (endCity ? optimizedRoute : optimizedRoute.slice(0, -1))
            .map(s => encodeURIComponent(`${s.lat},${s.lon}`))
            .join('|')

        const destination = endCity ? encodeURIComponent(endCity) : encodeURIComponent(`${optimizedRoute[optimizedRoute.length - 1].lat},${optimizedRoute[optimizedRoute.length - 1].lon}`)

        let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`
        if (waypoints) {
            url += `&waypoints=${waypoints}`
        }
        return url
    }

    if (!mounted) return null

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 min-h-screen bg-slate-50/50">
            <div className="flex items-center justify-between">
                <h1 className="text-lg font-semibold md:text-2xl">Planification des Livraisons</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Inputs Panel */}
                <Card className="lg:col-span-1 h-fit">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TruckIcon className="size-5 text-indigo-600" /> Paramètres de Tournée
                        </CardTitle>
                        <CardDescription>
                            Définissez le point de départ et la date.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Ville de départ</Label>
                            <div className="relative">
                                <MapPinIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
                                <Input
                                    className="pl-9"
                                    value={startCity}
                                    onChange={(e) => setStartCity(e.target.value)}
                                    placeholder="Ex: Paris, Lyon..."
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Ville de retour</Label>
                            <div className="relative">
                                <MapPinIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
                                <Input
                                    className="pl-9"
                                    value={endCity}
                                    onChange={(e) => setEndCity(e.target.value)}
                                    placeholder="Ex: Paris, Lyon..."
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Heure de départ</Label>
                                <div className="relative">
                                    <ClockIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
                                    <Input
                                        type="time"
                                        className="pl-9"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Installation (min)</Label>
                                <div className="relative">
                                    <RefreshCwIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
                                    <Input
                                        type="number"
                                        className="pl-9"
                                        value={installTime}
                                        onChange={(e) => setInstallTime(parseInt(e.target.value) || 0)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Date de livraison</Label>
                            <div className="relative">
                                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
                                <Input
                                    type="date"
                                    className="pl-9"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <Button
                                variant="outline"
                                onClick={handleReset}
                                disabled={isLoading}
                                className="flex-1"
                            >
                                <Trash2Icon className="mr-2 h-4 w-4" /> Reset
                            </Button>
                            <Button
                                className="flex-[2] bg-indigo-600 hover:bg-indigo-700 font-bold"
                                onClick={handlePlanRoute}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <RefreshCwIcon className="mr-2 h-4 w-4 animate-spin" /> Optimisation...
                                    </>
                                ) : (
                                    "Générer la Tournée"
                                )}
                            </Button>
                        </div>

                        {geocodingProgress && (
                            <div className="space-y-2 bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                                <div className="flex justify-between text-[10px] font-bold text-indigo-600 uppercase">
                                    <span>Géolocalisation des adresses...</span>
                                    <span>{geocodingProgress.current} / {geocodingProgress.total}</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-indigo-600 transition-all duration-300"
                                        style={{ width: `${(geocodingProgress.current / geocodingProgress.total) * 100}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {message && (
                            <div className={`p-3 rounded-md text-sm font-medium ${message.includes("Aucun") ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>
                                {message}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Results Panel */}
                <div className="lg:col-span-2 space-y-6">
                    {optimizedRoute.length > 0 ? (
                        <>
                            <Card className="border-l-4 border-l-emerald-500">
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle>Itinéraire Optimisé</CardTitle>
                                            <CardDescription>
                                                {optimizedRoute.length} livraisons prévues pour le {format(new Date(selectedDate), 'dd MMMM yyyy', { locale: fr })}.
                                            </CardDescription>
                                        </div>
                                        <Button className="bg-emerald-600 hover:bg-emerald-700" asChild>
                                            <a href={generateMapsLink()} target="_blank" rel="noopener noreferrer">
                                                <ExternalLinkIcon className="mr-2 size-4" /> Voir sur Google Maps
                                            </a>
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="relative border-l-2 border-slate-200 ml-4 space-y-8 py-2">
                                        {/* Start Point */}
                                        <div className="relative pl-8">
                                            <div className="absolute -left-[9px] top-0 size-4 rounded-full bg-slate-900 border-4 border-white shadow-sm z-20" />
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-white bg-slate-900 px-3 py-1 rounded-full shadow-sm">
                                                        DÉPART
                                                    </span>
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] uppercase text-slate-400 font-bold leading-tight">Sortie Dépôt</span>
                                                        <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                                            {startTime}
                                                        </span>
                                                    </div>
                                                </div>
                                                <h4 className="font-bold text-slate-900">{startCity}</h4>
                                                <p className="text-xs text-slate-500">Entrepôt / Bureau</p>
                                            </div>
                                        </div>

                                        {/* Stops */}
                                        {optimizedRoute.map((stop, index) => {
                                            return (
                                                <div key={stop.id} className="relative">
                                                    {/* Travel Leg Info (Distance/Time from previous) */}
                                                    {stop.distanceFromPrev !== undefined && (
                                                        <div className="absolute -left-1 -top-6 h-4 flex items-center">
                                                            <div className="bg-white px-2 py-0.5 rounded-full border border-slate-200 shadow-sm flex items-center gap-1.5 z-10">
                                                                <TruckIcon className="size-3 text-emerald-600" />
                                                                <span className="text-[10px] font-bold text-emerald-700">
                                                                    {stop.distanceFromPrev.toFixed(1)} km
                                                                </span>
                                                                {stop.travelTime !== undefined && (
                                                                    <span className="text-[10px] text-slate-400 font-medium">
                                                                        ({stop.travelTime} min)
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="relative pl-8 group pb-8 last:pb-0">
                                                        <div className="absolute -left-[9px] top-0 size-4 rounded-full bg-indigo-600 border-4 border-white shadow-sm group-hover:scale-125 transition-transform z-20" />
                                                        <div className="flex flex-col gap-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-bold text-white bg-indigo-600 px-3 py-1 rounded-full shadow-sm">
                                                                    LIVRAISON #{index + 1}
                                                                </span>
                                                                <div className="flex flex-col">
                                                                    <span className="text-[10px] uppercase text-slate-400 font-bold leading-tight">Installation</span>
                                                                    <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                                                        {stop.estimatedArrival} - {stop.estimatedDeparture}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="flex justify-between items-start">
                                                                <div>
                                                                    <h4 className="font-bold text-slate-800">{stop.nom_client}</h4>
                                                                    <p className="text-sm text-slate-600">{stop.adresse}</p>
                                                                    {(!stop.lat) && (
                                                                        <span className="text-xs text-red-500 font-medium">⚠️ Adresse non trouvable</span>
                                                                    )}
                                                                </div>
                                                                <Button variant="ghost" size="sm" className="h-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50" asChild>
                                                                    <a href={`/devis-contrats?id=${stop.id}`} target="_blank" rel="noopener noreferrer">
                                                                        Contrat <ExternalLinkIcon className="ml-1 size-3" />
                                                                    </a>
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}

                                        {/* Return Leg Leg Info */}
                                        {returnLeg && (
                                            <div className="relative">
                                                <div className="absolute -left-1 -top-6 h-4 flex items-center">
                                                    <div className="bg-white px-2 py-0.5 rounded-full border border-slate-200 shadow-sm flex items-center gap-1.5 z-10">
                                                        <TruckIcon className="size-3 text-emerald-600" />
                                                        <span className="text-[10px] font-bold text-emerald-700">
                                                            {returnLeg.distance.toFixed(1)} km
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 font-medium">
                                                            ({Math.round(returnLeg.duration)} min)
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* End Point */}
                                        {endCity && (
                                            <div className="relative pl-8">
                                                <div className="absolute -left-[9px] top-0 size-4 rounded-full bg-slate-900 border-4 border-white shadow-sm z-20" />
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-bold text-white bg-slate-900 px-3 py-1 rounded-full shadow-sm">
                                                            RETOUR
                                                        </span>
                                                        {returnLeg && (
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] uppercase text-slate-400 font-bold leading-tight">Arrivée Dépôt</span>
                                                                <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                                                    {returnLeg.arrivalAtReturn}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <h4 className="font-bold text-slate-900">{endCity}</h4>
                                                    <p className="text-xs text-slate-500">Dépôt / Entrepôt</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    ) : (
                        !isLoading && (
                            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-slate-400">
                                <TruckIcon className="size-12 opacity-20 mb-4" />
                                <p>Lancer la recherche pour voir l'itinéraire.</p>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    )
}
