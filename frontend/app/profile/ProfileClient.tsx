"use client"

import { useState, useEffect, useCallback } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getLocalStorageItem } from "@/app/utils/isClient";
import { CheckUserId } from "@/app/login/LoginForm";
import { authFetch } from "@/app/utils/authFetch";

export default function SettingsPage() {
    const [emailNotifications, setEmailNotifications] = useState(false);
    const [email, setEmail] = useState("");
    const [bio, setBio] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [userId, setUserId] = useState<string | null>(null);
    const [hasFetchedUser, setHasFetchedUser] = useState(false);
    const [updateStatus, setUpdateStatus] = useState<{ message: string; type: "success" | "error" } | null>(null);
    const [resetPasswordStatus, setResetPasswordStatus] = useState<{ message: string; type: "success" | "error" } | null>(null);
    const [logoutStatus, setLogoutStatus] = useState<{ message: string; type: "success" | "error" } | null>(null);
    const [mounted, setMounted] = useState(false);

    const { theme, setTheme } = useTheme();

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const token = getLocalStorageItem("auth_token");
        const uid = token ? CheckUserId(token) : null;
        setUserId(uid);
    }, []);

    useEffect(() => {
        if (!userId || hasFetchedUser) return;

        (async () => {
            try {
                const response = await authFetch(`/api/users/${userId}`, {
                    method: "GET",
                    headers: {
                        auth_token: `${localStorage.getItem("auth_token")}`,
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    const user = data[0];
                    setEmailNotifications(!!user?.email_notification);
                    setEmail(user?.email || "");
                    setBio(user?.bio || "");
                    setFirstName(user?.first_name || "");
                    setLastName(user?.last_name || "");
                    setHasFetchedUser(true);
                }
            } catch {
                console.error("Impossible de charger les informations utilisateur.");
            }
        })();
    }, [userId, authFetch, hasFetchedUser]);

    const handleEmailChange = useCallback(
        async (checked: boolean) => {
            if (!userId) return;
            try {
                const res = await authFetch(`/api/users/${userId}/email-notification`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        auth_token: `${localStorage.getItem("auth_token")}`,
                    },
                    body: JSON.stringify({ email_notification: checked }),
                });
                if (!res.ok) throw new Error();
                setEmailNotifications(checked);
                // Pas de notification pour ce changement
            } catch {
                console.error("Échec de la mise à jour.");
            }
        },
        [userId, authFetch]
    );

    const handleDarkChange = useCallback((checked: boolean) => {
        setTheme(checked ? "dark" : "light");
    }, [setTheme]);

    const handleResetPassword = useCallback(async () => {
        if (!userId) return;
        try {
            const res = await authFetch(`/api/users/${userId}`, {
                method: "PUT",
                body: JSON.stringify({ resetPassword: true }),
            });
            if (!res.ok) throw new Error();
            setResetPasswordStatus({ message: "Email de réinitialisation envoyé avec succès.", type: "success" });
        } catch {
            setResetPasswordStatus({ message: "Impossible d'envoyer l'email de réinitialisation.", type: "error" });
        }
    }, [userId]);

    const handleLogoutAll = useCallback(async () => {
        if (!userId) return;
        try {
            const res = await authFetch(`/api/logout/${userId}`, {
                method: "POST",
                headers: {
                    auth_token: `${localStorage.getItem("auth_token")}`,
                },
            });
            if (!res.ok) throw new Error();
            setLogoutStatus({ message: "Tous les appareils ont été déconnectés avec succès.", type: "success" });
        } catch {
            setLogoutStatus({ message: "Échec de la déconnexion de tous les appareils.", type: "error" });
        }
    }, [userId, authFetch]);

    const handleSaveProfile = async () => {
        if (!userId) return;
        try {
            const res = await authFetch(`/api/users/${userId}`, {
                method: "PUT",
                body: JSON.stringify({ email, bio, first_name: firstName, last_name: lastName }),
            });
            if (!res.ok) throw new Error();
            setUpdateStatus({ message: "Profil mis à jour avec succès.", type: "success" });
        } catch {
            setUpdateStatus({ message: "Échec de la mise à jour du profil.", type: "error" });
        }
    };

    return (
        <div className="space-y-6 p-4 max-w-md mx-auto">
            <div className="flex items-center justify-between">
                <Label htmlFor="emailNotifications">Notifications par email</Label>
                <Switch id="emailNotifications" checked={emailNotifications} onCheckedChange={handleEmailChange} />
            </div>

            <div className="flex items-center justify-between">
                <Label htmlFor="darkMode">Mode sombre</Label>
                <Switch
                    id="darkMode"
                    checked={mounted ? theme === "dark" : false}
                    onCheckedChange={handleDarkChange}
                    disabled={!mounted}
                />
            </div>

            <div className="space-y-2">
                <div className="flex gap-4">
                    <div className="flex-1">
                        <Label htmlFor="firstName">Prénom</Label>
                        <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                    </div>
                    <div className="flex-1">
                        <Label htmlFor="lastName">Nom</Label>
                        <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                    </div>
                </div>

                <Label htmlFor="email">Adresse email</Label>
                <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} />

                <Label htmlFor="bio">Bio</Label>
                <Input id="bio" value={bio} onChange={(e) => setBio(e.target.value)} />

                <Button onClick={handleSaveProfile} className="w-full">
                    Sauvegarder le profil
                </Button>
                {updateStatus && (
                    <p
                        className={`mt-2 text-sm ${updateStatus.type === "success" ? "text-green-600" : "text-red-600"
                            }`}
                    >
                        {updateStatus.message}
                    </p>
                )}
            </div>

            {resetPasswordStatus && (
                <Alert className="mb-4" variant={resetPasswordStatus.type === "error" ? "destructive" : "default"}>
                    <AlertDescription>{resetPasswordStatus.message}</AlertDescription>
                </Alert>
            )}
            <Button className="w-full" onClick={handleResetPassword} variant="secondary">
                Réinitialiser le mot de passe
            </Button>

            {logoutStatus && (
                <Alert className="mb-4" variant={logoutStatus.type === "error" ? "destructive" : "default"}>
                    <AlertDescription>{logoutStatus.message}</AlertDescription>
                </Alert>
            )}
            <Button className="w-full" onClick={handleLogoutAll} variant="destructive">
                Déconnecter tous les appareils
            </Button>
        </div>
    );
}
