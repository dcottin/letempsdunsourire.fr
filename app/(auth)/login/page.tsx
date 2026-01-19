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
            {/* Background decor */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-50/20 via-white to-white pointer-events-none"></div>

            <div className="w-full max-w-[360px] relative z-10">
                <div className="text-center mb-6 flex flex-col items-center">
                    {logoSrc ? (
                        <div className="mb-4">
                            <img
                                src={logoSrc}
                                alt="Logo"
                                className="h-20 w-auto object-contain max-w-[180px] drop-shadow-sm"
                            />
                        </div>
                    ) : (
                        <div className="mb-4 aspect-square size-12 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg flex border-4 border-white">
                            <Camera className="size-5" />
                        </div>
                    )}

                    <h1 className="font-bold text-xl text-slate-900 tracking-tight font-script mb-0.5" style={{ fontFamily: 'var(--font-script)' }}>
                        {companyName}
                    </h1>
                    <p className="text-[8px] uppercase tracking-[0.2em] text-slate-400 font-bold opacity-70">Plateforme Admin</p>
                </div>

                <Card className="border-none shadow-[0_4px_20px_rgb(0,0,0,0.06)] bg-white rounded-[32px] overflow-hidden">
                    <CardHeader className="pt-8 px-8 pb-3 text-center">
                        <CardTitle className="text-lg font-bold text-slate-800">Connexion</CardTitle>
                    </CardHeader>
                    <form action={login} onSubmit={handleSubmit}>
                        <CardContent className="space-y-4 px-8 pb-6 text-left">
                            {errorMessage && (
                                <div className="bg-red-50 border border-red-100 text-red-600 px-3 py-2 rounded-full flex items-center gap-2 text-[11px] animate-in fade-in zoom-in-95">
                                    <AlertCircle className="size-3.5 shrink-0" />
                                    <p className="font-medium">{errorMessage}</p>
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-4">Email</Label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-3.5 text-slate-300 pointer-events-none" />
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        placeholder="votre@email.fr"
                                        required
                                        className="pl-11 h-10 bg-white border border-slate-100 rounded-full focus-visible:ring-2 focus-visible:ring-indigo-50 focus-visible:border-indigo-100 transition-all shadow-none text-xs"
                                        defaultValue="contact@letempsdunsourire.fr"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="password" className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-4">Mot de passe</Label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-3.5 text-slate-300 pointer-events-none" />
                                    <Input
                                        id="password"
                                        name="password"
                                        type="password"
                                        required
                                        className="pl-11 h-10 bg-white border border-slate-100 rounded-full focus-visible:ring-2 focus-visible:ring-indigo-50 focus-visible:border-indigo-100 transition-all shadow-none text-xs"
                                    />
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="px-8 py-5 bg-slate-50 border-t border-slate-100">
                            <div className="w-full bg-white rounded-full p-1 shadow-sm border border-slate-200/50">
                                <Button type="submit" className="w-full h-10 text-[10px] font-bold uppercase tracking-[0.2em] bg-slate-900 hover:bg-black text-white rounded-full shadow-none transition-all" disabled={isLoading}>
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 size-3 animate-spin" />
                                            ...
                                        </>
                                    ) : (
                                        'CONNEXION'
                                    )}
                                </Button>
                            </div>
                        </CardFooter>
                    </form>
                </Card>

                <div className="mt-8 text-center opacity-30">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                        &copy; {new Date().getFullYear()} {companyName}
                    </p>
                </div>
            </div>
        </div>
    )
}
