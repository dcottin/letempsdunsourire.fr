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
        <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4 relative overflow-hidden">
            {/* Background decorative elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-50 rounded-full blur-3xl opacity-60"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-50 rounded-full blur-3xl opacity-60"></div>

            <div className="w-full max-w-[440px] relative z-10">
                <div className="text-center mb-8 flex flex-col items-center">
                    {logoSrc ? (
                        <div className="mb-6 p-1 bg-white rounded-2xl shadow-xl overflow-hidden ring-4 ring-indigo-50/50">
                            <img
                                src={logoSrc}
                                alt="Logo"
                                className="h-24 w-auto object-contain max-w-[200px]"
                            />
                        </div>
                    ) : (
                        <div className="mb-6 aspect-square size-20 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-500/20 flex translate-y-2">
                            <Camera className="size-10" />
                        </div>
                    )}

                    <h1 className="font-bold text-4xl text-slate-900 tracking-tight font-script mb-2" style={{ fontFamily: 'var(--font-script)' }}>
                        {companyName}
                    </h1>
                    <div className="h-1 w-12 bg-indigo-500 rounded-full mb-4"></div>
                </div>

                <Card className="border-none shadow-[0_20px_50px_rgba(0,0,0,0.08)] bg-white/90 backdrop-blur-sm rounded-3xl overflow-hidden">
                    <CardHeader className="pt-8 px-8 pb-4">
                        <CardTitle className="text-2xl font-bold text-slate-800">C'est génial de vous revoir !</CardTitle>
                        <CardDescription className="text-slate-500">
                            Identifiez-vous pour gérer votre activité.
                        </CardDescription>
                    </CardHeader>
                    <form action={login} onSubmit={handleSubmit}>
                        <CardContent className="space-y-5 px-8">
                            {errorMessage && (
                                <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-2xl flex items-center gap-3 text-sm animate-in fade-in slide-in-from-top-2">
                                    <AlertCircle className="size-5 shrink-0 opacity-80" />
                                    <p className="font-medium">{errorMessage}</p>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">Email</Label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400 transition-colors group-focus-within:text-indigo-500" />
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        placeholder="admin@example.com"
                                        required
                                        className="pl-12 h-12 bg-slate-50 border-slate-100 rounded-2xl focus-visible:ring-indigo-500 focus-visible:bg-white transition-all shadow-sm"
                                        defaultValue="contact@letempsdunsourire.fr"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">Mot de passe</Label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400 transition-colors group-focus-within:text-indigo-500" />
                                    <Input
                                        id="password"
                                        name="password"
                                        type="password"
                                        required
                                        className="pl-12 h-12 bg-slate-50 border-slate-100 rounded-2xl focus-visible:ring-indigo-500 focus-visible:bg-white transition-all shadow-sm"
                                    />
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="p-8">
                            <Button type="submit" className="w-full h-14 text-sm font-bold uppercase tracking-widest bg-indigo-600 hover:bg-indigo-700 rounded-2xl shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 size-5 animate-spin" />
                                        Authentification...
                                    </>
                                ) : (
                                    'Accéder au Dashboard'
                                )}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>

                <p className="text-center mt-10 text-xs text-slate-400 font-medium tracking-wide">
                    &copy; {new Date().getFullYear()} {companyName}. Solution SaaS Premium.
                </p>
            </div>
        </div>
    )
}
