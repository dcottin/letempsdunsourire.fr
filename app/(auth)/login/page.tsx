'use client'

import React from 'react'
import { useSearchParams } from 'next/navigation'
import { login } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Lock, Mail, Loader2, Camera } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
    const searchParams = useSearchParams()
    const [isLoading, setIsLoading] = React.useState(false)
    const [settings, setSettings] = React.useState<any>(null)
    const error = searchParams.get('error')

    React.useEffect(() => {
        const fetchSettings = async () => {
            const { data } = await supabase.from('settings').select('data').single()
            if (data?.data) {
                setSettings(data.data)
            }
        }
        fetchSettings()
    }, [])

    const errorMessage = {
        auth_failed: 'Email ou mot de passe incorrect.',
        unauthorized: 'Accès restreint aux administrateurs.',
    }[error as string] || (error ? 'Une erreur est survenue.' : null)

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        setIsLoading(true)
    }

    const companyName = settings?.nom_societe || "Le Temps d'un Sourire"
    const logoSrc = settings?.logo_base64 || null

    return (
        <div className="min-h-screen flex items-center justify-center bg-white p-6 relative overflow-hidden font-sans">
            {/* Minimal Background decor */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-50/20 via-white to-white"></div>

            <div className="w-full max-w-[420px] relative z-10">
                <div className="text-center mb-10 flex flex-col items-center">
                    {logoSrc ? (
                        <div className="mb-6 transition-transform hover:scale-105 duration-300">
                            <img
                                src={logoSrc}
                                alt="Logo"
                                className="h-28 w-auto object-contain max-w-[240px] drop-shadow-sm"
                            />
                        </div>
                    ) : (
                        <div className="mb-6 aspect-square size-16 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg flex">
                            <Camera className="size-8" />
                        </div>
                    )}

                    <h1 className="font-bold text-3xl text-slate-900 tracking-tight font-script mb-1" style={{ fontFamily: 'var(--font-script)' }}>
                        {companyName}
                    </h1>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold">Plateforme de Gestion</p>
                </div>

                <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-[32px] overflow-hidden">
                    <CardHeader className="pt-10 px-10 pb-4 text-center">
                        <CardTitle className="text-2xl font-bold text-slate-800">Se connecter</CardTitle>
                        <CardDescription className="text-slate-400 mt-1">
                            Accédez à votre espace administrateur
                        </CardDescription>
                    </CardHeader>
                    <form action={login} onSubmit={handleSubmit}>
                        <CardContent className="space-y-6 px-10 pb-8">
                            {errorMessage && (
                                <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-2xl flex items-center gap-3 text-sm animate-in fade-in zoom-in-95">
                                    <AlertCircle className="size-4 shrink-0" />
                                    <p className="font-medium">{errorMessage}</p>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-[11px] font-bold uppercase tracking-wider text-slate-400 ml-1">Email</Label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-300 pointer-events-none" />
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        placeholder="admin@example.com"
                                        required
                                        className="pl-12 h-12 bg-white border border-slate-200 rounded-2xl focus-visible:ring-2 focus-visible:ring-indigo-100 focus-visible:border-indigo-200 transition-all shadow-none"
                                        defaultValue="contact@letempsdunsourire.fr"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-[11px] font-bold uppercase tracking-wider text-slate-400 ml-1">Mot de passe</Label>
                                <div className="relative focus-within:text-indigo-500">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-300 pointer-events-none transition-colors" />
                                    <Input
                                        id="password"
                                        name="password"
                                        type="password"
                                        required
                                        className="pl-12 h-12 bg-white border border-slate-200 rounded-2xl focus-visible:ring-2 focus-visible:ring-indigo-100 focus-visible:border-indigo-200 transition-all shadow-none"
                                    />
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="p-10 bg-white">
                            <Button type="submit" className="w-full h-14 text-sm font-bold uppercase tracking-widest bg-slate-900 hover:bg-black text-white rounded-2xl shadow-xl active:scale-[0.98] transition-all" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 size-5 animate-spin" />
                                        Vérification...
                                    </>
                                ) : (
                                    'Connexion'
                                )}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>

                <div className="mt-12 flex items-center justify-center gap-4 grayscale opacity-40">
                    <div className="h-[1px] w-8 bg-slate-300"></div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap">
                        &copy; {new Date().getFullYear()} {companyName}
                    </p>
                    <div className="h-[1px] w-8 bg-slate-300"></div>
                </div>
            </div>
        </div>
    )
}
