'use client'

import React, { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { login } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-white">
                <Loader2 className="size-10 animate-spin text-indigo-600" />
            </div>
        }>
            <LoginContent />
        </Suspense>
    )
}

function LoginContent() {
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
    const logoSrc = settings?.logo_url || settings?.logo_base64 || null

    return (
        <div className="min-h-screen flex items-center justify-center bg-white p-4 font-sans">
            <div className="w-full max-w-[500px]">
                {/* Logo Section */}
                <div className="text-center mb-8">
                    {logoSrc ? (
                        <img
                            src={logoSrc}
                            alt={companyName}
                            className="w-3/4 mx-auto object-contain max-h-32"
                        />
                    ) : (
                        <h1 className="text-3xl font-bold text-indigo-600">{companyName}</h1>
                    )}
                </div>

                {/* Login Form */}
                <form
                    action={login}
                    onSubmit={handleSubmit}
                    className="border border-slate-200 p-8 rounded-2xl shadow-sm bg-white space-y-6"
                >
                    {errorMessage && (
                        <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl flex items-center gap-3 text-sm">
                            <AlertCircle className="size-4 shrink-0" />
                            <p>{errorMessage}</p>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                            Email
                        </Label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="votre@email.com"
                            required
                            className="h-12 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                            defaultValue="contact@letempsdunsourire.fr"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                            Mot de passe
                        </Label>
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            required
                            className="h-12 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        />
                    </div>

                    <div className="pt-2">
                        <Button
                            type="submit"
                            className="w-full h-12 text-base font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition-all active:scale-[0.98]"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 className="size-5 animate-spin" /> Connexion...
                                </span>
                            ) : (
                                'Connexion'
                            )}
                        </Button>
                    </div>
                </form>

                {/* Bottom Links */}
                <div className="mt-8 text-center space-y-4 text-slate-500">
                    <p className="text-sm">Merci de vous connecter</p>
                    <div>
                        <a
                            href="#"
                            className="text-indigo-600 hover:text-indigo-700 font-medium text-sm transition-colors"
                            onClick={(e) => {
                                e.preventDefault();
                                alert("Cette section est réservée aux administrateurs. Pour les clients, veuillez utiliser votre lien personnalisé reçu par email.");
                            }}
                        >
                            Je suis client
                        </a>
                    </div>
                </div>
            </div>
        </div>
    )
}
