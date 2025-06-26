"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function RegisterForm() {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [bio, setBio] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null)
  const router = useRouter()

  const CheckUserId = (token: string) => {
    try {
      const payload = token.split(".")[1]
      const decodedPayload = window.atob(payload)
      const userId = JSON.parse(decodedPayload).user_id
      return userId
    } catch (error) {
      console.error("Erreur lors de la vérification de l'ID utilisateur :", error)
      return error
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch("/api/registration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          email,
          password,
          bio,
        }),
      })

      let data
      try {
        data = await response.json()
      } catch (err) {
        throw new Error("Réponse invalide du serveur.")
      }

      if (!response.ok) {
        throw new Error(JSON.stringify(data))
      }

      if (data.token) {
        localStorage.setItem("auth_token", data.token)
        const id = CheckUserId(data.token)
        localStorage.setItem("userRole", "user")
      }

      setMessage({
        text: "Votre compte a été créé avec succès. Redirection...",
        type: "success"
      })

      setTimeout(() => {
        router.push("/")
      }, 2000)
    } catch (error: any) {
      console.error(" Erreur d'inscription :", error.message)

      let errorMessage = "Une erreur inconnue est survenue."
      
      try {
        const errorData = JSON.parse(error.message)
        
        if (errorData.details && errorData.details.issues && errorData.details.issues.length > 0) {
          const issues = errorData.details.issues
          const translatedErrors = issues.map((issue: any) => {
            const field = issue.path?.[0] || "champ"
            
            switch (issue.code) {
              case "too_small":
                if (field === "password") {
                  return `Le mot de passe doit contenir au moins ${issue.minimum} caractères.`
                }
                return `Le ${field} doit contenir au moins ${issue.minimum} caractères.`
              
              case "invalid_string":
                if (issue.validation === "email") {
                  return "L'adresse email n'est pas valide."
                }
                return `Le format du ${field} n'est pas valide.`
              
              case "too_big":
                return `Le ${field} ne peut pas dépasser ${issue.maximum} caractères.`
              
              case "invalid_type":
                return `Le ${field} est requis.`
              
              default:
                return issue.message || `Erreur de validation pour ${field}.`
            }
          })
          
          errorMessage = translatedErrors.join(" ")
        } else if (errorData.message) {
          switch (errorData.message) {
            case "Error during registarion.":
              errorMessage = "Erreur lors de l'inscription."
              break
            case "This email is already in use.":
              errorMessage = "Cette adresse email est déjà utilisée."
              break
            case "User already exists":
              errorMessage = "Un compte avec cette adresse email existe déjà."
              break
            case "Invalid email format":
              errorMessage = "L'adresse email n'est pas valide."
              break
            case "Password too weak":
              errorMessage = "Le mot de passe n'est pas assez fort."
              break
            default:
              errorMessage = errorData.message
          }
        }
      } catch {
        errorMessage = error.message || "Une erreur inconnue est survenue."
      }

      setMessage({
        text: errorMessage,
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
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName">Prénom</Label>
          <Input id="firstName" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="lastName">Nom</Label>
          <Input id="lastName" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
        </div>
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="password">Mot de passe</Label>
        <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="bio">Bio (optionnel)</Label>
        <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} className="resize-none" rows={3} />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Inscription en cours..." : "S'inscrire"}
      </Button>
    </form>
  )
}

