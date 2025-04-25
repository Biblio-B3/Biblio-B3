"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"

export default function ResetPasswordForm({ token }: { token: string }) {
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const { toast } = useToast()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (password !== confirmPassword) {
            toast({
                variant: "destructive",
                title: "Erreur",
                description: "Les mots de passe ne correspondent pas"
            })
            return
        }

        setLoading(true)
        try {
            const response = await fetch("/api/reset-password/confirm", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    token,
                    newPassword: password,
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                if (response.status === 401 || response.status === 400) {
                    toast({
                        variant: "destructive",
                        title: "Erreur",
                        description: "Le lien de réinitialisation a expiré ou est invalide"
                    })
                    setTimeout(() => {
                        router.push("/login")
                    }, 2000)
                    return
                }
                throw new Error(data.message || "Erreur lors de la réinitialisation du mot de passe")
            }

            toast({
                title: "Succès",
                description: "Mot de passe réinitialisé avec succès"
            })
            setTimeout(() => {
                router.push("/login")
            }, 2000)
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Erreur",
                description: "Erreur lors de la réinitialisation du mot de passe"
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Input
                    type="password"
                    placeholder="Nouveau mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
            </div>
            <div className="space-y-2">
                <Input
                    type="password"
                    placeholder="Confirmer le mot de passe"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Réinitialisation..." : "Réinitialiser le mot de passe"}
            </Button>
        </form>
    )
} 