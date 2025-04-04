"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import ResetPasswordForm from "./ResetPasswordForm"

function ResetPasswordContent() {
    const searchParams = useSearchParams()
    const token = searchParams.get("token")

    if (!token) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="w-full max-w-md p-8 space-y-8 bg-card rounded-lg">
                    <div className="text-center space-y-2">
                        <h1 className="text-2xl font-bold text-destructive">Erreur</h1>
                        <p className="text-muted-foreground">
                            Le lien de réinitialisation est invalide ou a expiré.
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="w-full max-w-md p-8 space-y-8 bg-card rounded-lg">
                <div className="text-center space-y-2">
                    <h1 className="text-2xl font-bold">Nouveau mot de passe</h1>
                    <p className="text-muted-foreground">
                        Veuillez entrer votre nouveau mot de passe
                    </p>
                </div>

                <ResetPasswordForm token={token} />
            </div>
        </div>
    )
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="w-full max-w-md p-8 space-y-8 bg-card rounded-lg">
                    <div className="text-center space-y-2">
                        <h1 className="text-2xl font-bold">Chargement...</h1>
                    </div>
                </div>
            </div>
        }>
            <ResetPasswordContent />
        </Suspense>
    )
} 