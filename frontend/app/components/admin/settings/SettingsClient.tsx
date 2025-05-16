"use client"

import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import { CheckUserId } from "@/app/login/LoginForm"
import { useApiErrorHandler } from "../../DisconnectAfterRevocation";
import { isClient, getLocalStorageItem, setLocalStorageItem } from "@/app/utils/isClient";

export default function SettingsClient() {
  const [libraryName, setLibraryName] = useState("WardenPro Librario")
  const [emailNotifications, setEmailNotifications] = useState(false) // Initialize to false, will fetch actual value
  const [darkMode, setDarkMode] = useState(false);

  const { toast } = useToast()
  const { setTheme } = useTheme()
  const fetchWithAuth = useApiErrorHandler();
  const token = getLocalStorageItem("auth_token");
  const userId = token ? CheckUserId(token) : null;

  // Initialiser le mode sombre côté client uniquement
  useEffect(() => {
    if (isClient) {
      const savedMode = localStorage.getItem("darkMode");
      setDarkMode(savedMode === "true");
    }
  }, []);

  useEffect(() => {
    setTheme(darkMode ? "dark" : "light")
  }, [darkMode, setTheme]);

  useEffect(() => {
    if (isClient) {
      // Save the dark mode preference to local storage
      localStorage.setItem("darkMode", JSON.stringify(darkMode));
    }
  }, [darkMode]);

  // Fetch initial email notification preference
  useEffect(() => {
    const fetchEmailNotificationPreference = async () => {
      if (!userId) return;

      try {
        const response = await fetchWithAuth(`/api/users/${userId}`, {
          method: "GET",
          headers: {
            "auth_token": token,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch email notification preference");
        }

        const userData = await response.json();
        setEmailNotifications(userData.email_notification);
      } catch (error) {
        console.error("Error fetching email notification preference:", error);
        toast({
          title: "Erreur",
          description: "Une erreur est survenue lors du chargement de votre préférence de notification.",
          variant: "destructive",
        });
      }
    };

    fetchEmailNotificationPreference();
  }, [userId, fetchWithAuth, token, toast]);


  const handleEmailNotificationsChange = async (checked: boolean) => {
    if (!userId) return;

    try {
      const response = await fetchWithAuth(`/api/users/${userId}/email-notification`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "auth_token": token } : {}),
        },
        body: JSON.stringify({ email_notification: checked }),
      });

      if (!response.ok) {
        throw new Error("Failed to update email notification preference");
      }

      setEmailNotifications(checked);

      toast({
        title: "Préférence de notification mise à jour",
        description: "Votre préférence de notification par email a été mise à jour avec succès.",
      });
    } catch (error) {
      console.error("Error updating email notification preference:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la mise à jour de votre préférence de notification.",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    try {
      const newName = libraryName.trim();

      const ResUserRole = await fetch("/api/library", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "auth_token": token } : {}),
        },
        body: JSON.stringify({ newName }),
      });

      if (!ResUserRole.ok) {
        const errorData = await ResUserRole.json();
        throw new Error(errorData.message || "Échec de la mise à jour.");
      }

      setLibraryName(newName);

      toast({
        title: "Paramètres sauvegardés",
        description: "Vos modifications ont été enregistrées avec succès.",
      });

    } catch (error) {
      console.error("⚠️ Erreur lors de la sauvegarde des paramètres :", error);

      toast({
        title: "Erreur",
        description: "Une erreur inconnue est survenue.",
        variant: "destructive",
      });
    }
  }

  const handleLogoutAllDevices = async () => {
    try {
      const token = getLocalStorageItem("auth_token")
      if (!token) {
        throw new Error("Aucun token trouvé")
      }

      const userId = CheckUserId(token)

      const response = await fetchWithAuth(`/api/logout/${userId}`, {
        method: "POST",
        headers: {
          ...(token ? { "auth_token": token } : {})
        }
      })

      if (!response.ok) {
        throw new Error("Échec de la déconnexion")
      }

      toast({
        title: "Déconnexion réussie",
        description: "Tous les appareils ont été déconnectés avec succès.",
      });

    } catch (error) {
      console.error("⚠️ Erreur lors de la déconnexion :", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la déconnexion.",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="libraryName">Nom de la bibliothèque</Label>
        <Input id="libraryName" value={libraryName} onChange={(e) => setLibraryName(e.target.value)} />
      </div>

      <div className="flex items-center space-x-2">
        <Switch id="emailNotifications" checked={emailNotifications} onCheckedChange={handleEmailNotificationsChange} />
        <Label htmlFor="emailNotifications">Activer les notifications par email</Label>
      </div>

      <div className="flex items-center space-x-2">
        <Switch id="darkMode" checked={darkMode} onCheckedChange={setDarkMode} />
        <Label htmlFor="darkMode">Activer le mode sombre</Label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="resetPassword">Réinitialiser le mot de passe</Label>
        <Button
          variant="secondary"
          onClick={async () => {
            try {
              const token = getLocalStorageItem("auth_token")
              if (!token) {
                throw new Error("Aucun token trouvé")
              }

              const userId = CheckUserId(token)

              const response = await fetch(`/api/users/${userId}`, {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  ...(token ? { "auth_token": token } : {}),
                },
                body: JSON.stringify({ resetPassword: true })
              })

              if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.message || "Échec de la réinitialisation du mot de passe")
              }

              toast({
                title: "Email envoyé",
                description: "Un email de réinitialisation de mot de passe a été envoyé à votre adresse email.",
              })
            } catch (error: any) {
              console.error("⚠️ Erreur lors de la réinitialisation du mot de passe :", error)
              toast({
                title: "Erreur",
                description: error.message || "Une erreur est survenue lors de la réinitialisation du mot de passe.",
                variant: "destructive",
              })
            }
          }}
          className="w-full"
        >
          Réinitialiser le mot de passe
        </Button>
      </div>


      <Button onClick={handleSave}>Enregistrer les modifications</Button>

      <Button
        variant="destructive"
        onClick={handleLogoutAllDevices}
        className="w-full"
      >
        Déconnecter tous les appareils
      </Button>
    </div>
  )
}
