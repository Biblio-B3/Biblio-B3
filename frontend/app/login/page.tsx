"use client";
import { useState } from "react"
import LoginForm from "./LoginForm"
import ResetPasswordForm from "./ResetPasswordForm"
import { useLibrary } from "../components/LibraryContext";

export default function LoginPage() {
  const { libraryName } = useLibrary();
  const [showResetForm, setShowResetForm] = useState(false)

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-8 bg-card rounded-lg">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">
            {showResetForm ? "Réinitialisation" : "Connexion"}
          </h1>
          <p className="text-muted-foreground text-center">
            {showResetForm
              ? "Entrez votre email pour réinitialiser votre mot de passe"
              : "Connectez-vous à votre compte"}
          </p>
        </div>

        {showResetForm ? (
          <ResetPasswordForm />
        ) : (
          <LoginForm />
        )}

        <div className="text-center">
          <button
            onClick={() => setShowResetForm(!showResetForm)}
            className="text-sm text-muted-foreground hover:text-primary"
          >
            {showResetForm
              ? "Retour à la connexion"
              : "Mot de passe oublié ?"}
          </button>
        </div>
      </div>
    </div>
  )
}

