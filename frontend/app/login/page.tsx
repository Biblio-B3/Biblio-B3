"use client";
import { useState } from "react"
import Head from "next/head"
import LoginForm from "./LoginForm"
import ResetPasswordForm from "./ResetPasswordForm"
import { useLibrary } from "../components/LibraryContext";

export default function LoginPage() {
  const { libraryName } = useLibrary();
  const [showResetForm, setShowResetForm] = useState(false)

  return (
    <>
      <Head>
        <title>Connexion</title>
        <meta name="description" content="Connectez-vous à votre compte" />
        <meta property="og:title" content="Connexion" />
        <meta property="og:description" content="Connectez-vous à votre compte" />
        <meta property="og:url" content="/login" />
        <meta property="og:type" content="website" />
      </Head>
      
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
    </>
  )
}
