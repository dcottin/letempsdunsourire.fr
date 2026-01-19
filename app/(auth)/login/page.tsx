'use client'

import React from 'react'
import { useSearchParams } from 'next/navigation'
import { login } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Lock, Mail, Loader2 } from 'lucide-react'

export default function LoginPage() {
    const searchParams = useSearchParams()
    const [isLoading, setIsLoading] = React.useState(false)
    const error = searchParams.get('error')

    const errorMessage = {
        auth_failed: 'Email ou mot de passe incorrect.',
        unauthorized: 'Accès restreint aux administrateurs.',
    }[error as string] || (error ? 'Une erreur est survenue.' : null)

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        setIsLoading(true)
        // No need to preventDefault because we are using standard form action 
        // but we want to show loading state before redirection.
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="font-bold text-4xl text-primary tracking-wider font-script mb-2" style={{ fontFamily: 'var(--font-script)' }}>
                        Le Temps d'un Sourire
                    </h1>
                    <p className="text-slate-500 text-sm">Administration SAAS</p>
                </div>

                <Card className="border-2 shadow-xl">
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold">Connexion</CardTitle>
                        <CardDescription>
                            Entrez vos identifiants pour accéder au tableau de bord.
                        </CardDescription>
                    </CardHeader>
                    <form action={login} onSubmit={handleSubmit}>
                        <CardContent className="space-y-4">
                            {errorMessage && (
                                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex items-center gap-3 text-sm animate-in fade-in slide-in-from-top-2">
                                    <AlertCircle className="size-5 shrink-0" />
                                    <p>{errorMessage}</p>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 size-4 text-slate-400" />
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        placeholder="contact@example.com"
                                        required
                                        className="pl-10"
                                        defaultValue="contact@letempsdunsourire.fr"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">Mot de passe</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 size-4 text-slate-400" />
                                    <Input
                                        id="password"
                                        name="password"
                                        type="password"
                                        required
                                        className="pl-10"
                                    />
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" className="w-full h-12 text-sm font-bold uppercase tracking-wider" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 size-4 animate-spin" />
                                        Connexion en cours...
                                    </>
                                ) : (
                                    'Se connecter'
                                )}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>

                <p className="text-center mt-6 text-xs text-slate-400 font-medium">
                    &copy; {new Date().getFullYear()} Le Temps d'un Sourire. Tous droits réservés.
                </p>
            </div>
        </div>
    )
}
