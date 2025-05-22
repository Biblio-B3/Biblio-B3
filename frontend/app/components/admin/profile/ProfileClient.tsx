"use client"

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { getLocalStorageItem } from "@/app/utils/isClient";
import { useApiErrorHandler } from "../../DisconnectAfterRevocation";
import { CheckUserId } from "@/app/login/LoginForm";

export default function SettingsPage() {
    const [emailNotifications, setEmailNotifications] = useState(false);
    const [darkMode, setDarkMode] = useState(false);

    const { toast } = useToast();
    const { setTheme } = useTheme();
    const fetchWithAuth = useApiErrorHandler();

    const token = getLocalStorageItem("auth_token");
    const userId = token ? CheckUserId(token) : null;

    // Load initial preferences
    useEffect(() => {
        if (typeof window === "undefined" || !userId) return;

        // Dark mode from localStorage
        const savedMode = localStorage.getItem("darkMode");
        setDarkMode(savedMode === "true");

        // Email notifications preference from API
        (async () => {
            try {
                const response = await fetchWithAuth(`/api/users/${userId}`, {
                    method: "GET",
                    headers: {
                        auth_token: `${localStorage.getItem("auth_token")}`,
                    },
                });
                const data = await response.json();
                setEmailNotifications(data.email_notification);
            } catch (err) {
                toast({
                    title: "Erreur",
                    description: "Impossible de charger la préférence d'email.",
                    variant: "destructive"
                });
            }
        })();
    }, [userId, token, fetchWithAuth, toast]);

    // Sync theme
    useEffect(() => {
        setTheme(darkMode ? "dark" : "light");
        if (typeof window !== "undefined") {
            localStorage.setItem("darkMode", JSON.stringify(darkMode));
        }
    }, [darkMode, setTheme]);

    // Handlers
    const toggleEmailNotifications = async (checked: boolean) => {
        if (!userId) return;
        try {
            const res = await fetchWithAuth(`/api/users/${userId}/email-notification`, {
                method: "PUT",
                headers: {
                    auth_token: `${localStorage.getItem("auth_token")}`,
                },
                body: JSON.stringify({ email_notification: checked })
            });
            if (!res.ok) throw new Error();
            setEmailNotifications(checked);
            toast({ title: "Mise à jour", description: "Préférence email mise à jour." });
        } catch {
            toast({ title: "Erreur", description: "Échec de la mise à jour.", variant: "destructive" });
        }
    };

    const handleResetPassword = async () => {
        if (!userId) return;
        try {
            const res = await fetch(`/api/users/${userId}`, {
                method: "PUT",
                headers: {
                    auth_token: `${localStorage.getItem("auth_token")}`,
                },
                body: JSON.stringify({ resetPassword: true })
            });
            if (!res.ok) throw new Error();
            toast({ title: "Email envoyé", description: "Réinitialisation demandée." });
        } catch {
            toast({ title: "Erreur", description: "Impossible d'envoyer l'email.", variant: "destructive" });
        }
    };

    const handleLogoutAll = async () => {
        if (!userId) return;
        try {
            const res = await fetchWithAuth(`/api/logout/${userId}`, {
                method: "POST", headers: {
                    auth_token: `${localStorage.getItem("auth_token")}`,
                },
            });
            if (!res.ok) throw new Error();
            toast({ title: "Déconnecté", description: "Tous les appareils ont été déconnectés." });
        } catch {
            toast({ title: "Erreur", description: "Échec de la déconnexion.", variant: "destructive" });
        }
    };

    return (
        <div className="space-y-6 p-4 max-w-md mx-auto">
            <div className="flex items-center justify-between">
                <Label htmlFor="emailNotifications">Notifications par email</Label>
                <Switch
                    id="emailNotifications"
                    checked={emailNotifications}
                    onCheckedChange={toggleEmailNotifications}
                />
            </div>

            <div className="flex items-center justify-between">
                <Label htmlFor="darkMode">Mode sombre</Label>
                <Switch
                    id="darkMode"
                    checked={darkMode}
                    onCheckedChange={setDarkMode}
                />
            </div>

            <Button className="w-full" onClick={handleResetPassword} variant="secondary">
                Réinitialiser le mot de passe
            </Button>

            <Button className="w-full" onClick={handleLogoutAll} variant="destructive">
                Déconnecter tous les appareils
            </Button>
        </div>
    );
}

