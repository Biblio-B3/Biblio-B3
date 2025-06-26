"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function ResetPasswordForm() {
    const [email, setEmail] = useState("")
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        setMessage(null)
        
        try {
            const response = await fetch("/api/reset-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email }),
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.message || "Échec de la réinitialisation du mot de passe")
            }

            setMessage({
                text: "Si votre email est dans notre base de données, un email de réinitialisation a été envoyé.",
                type: "success"
            })

        } catch (error: any) {
            console.error("⚠️ Erreur lors de la réinitialisation du mot de passe :", error)
            setMessage({
                text: error.message || "Une erreur est survenue lors de la réinitialisation du mot de passe.",
                type: "error"
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {message && (
                <Alert className="mb-4" variant={message.type === "error" ? "destructive" : "default"}>
                    <AlertDescription>{message.text}</AlertDescription>
                </Alert>
            )}
            <div>
                <Label htmlFor="email">Email</Label>
                <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Envoi en cours..." : "Envoyer l'email de réinitialisation"}
            </Button>
        </form>
    )
} 