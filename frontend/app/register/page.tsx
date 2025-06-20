"use client"
import Head from "next/head"
import RegisterForm from "./RegisterForm"
import { useLibrary } from "../components/LibraryContext"

export default function RegisterPage() {
  const { libraryName } = useLibrary()
  return (
    <>
      <Head>
        <title>Inscription - {libraryName}</title>
        <meta name="description" content="Créez un compte pour accéder à la bibliothèque" />
        <meta property="og:title" content={`Inscription - ${libraryName}`} />
        <meta property="og:description" content="Créez un compte pour accéder à la bibliothèque" />
        <meta property="og:url" content="/register" />
        <meta property="og:type" content="website" />
      </Head>
      
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="p-8 bg-card text-card-foreground rounded-lg shadow-md w-full max-w-md">
          <h1 className="text-2xl font-bold mb-6 text-center">Inscription à {libraryName}</h1>
          <RegisterForm />
        </div>
      </div>
    </>
  )
}
