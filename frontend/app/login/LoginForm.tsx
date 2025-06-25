"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { authFetch } from "../utils/authFetch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const CheckUserId = (token: string) => {
  try {
    const payload = token.split(".")[1];
    const decodedPayload = window.atob(payload);
    const userId = JSON.parse(decodedPayload).user_id;
    return userId;
  } catch (error) {
    console.error("Erreur lors de la vérification de l'ID utilisateur :", error);
    return error;
  }
};

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showExpiredMessage, setShowExpiredMessage] = useState(false);
  const [showLoginError, setShowLoginError] = useState(false);
  const [loginErrorType, setLoginErrorType] = useState("");
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changePasswordError, setChangePasswordError] = useState("");
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    // Vérifier si l'utilisateur a été redirigé à cause d'un token expiré
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('expired') === 'true') {
        setShowExpiredMessage(true);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");
    setShowLoginError(false);
    setLoginErrorType("");

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      let data;
      try {
        data = await response.json();
      } catch (err) {
        throw new Error("Réponse invalide du serveur.");
      }

      if (!response.ok) {
        // Mapper les codes d'erreur aux types d'erreur
        let errorType = "";
        switch (response.status) {
          case 400:
            errorType = "missing_fields";
            break;
          case 401:
            errorType = "invalid_credentials";
            break;
          case 500:
            errorType = "server_error";
            break;
          default:
            errorType = "unknown_error";
        }
        throw new Error(errorType);
      }

      localStorage.setItem("auth_token", data.token);

      try {
        // Décoder le token pour extraire le rôle, sans appel réseau
        const payload = data.token.split('.')[1];
        const decodedPayload = window.atob(payload);
        const userRole = JSON.parse(decodedPayload).role;

        if (userRole) {
            localStorage.setItem("userRole", userRole);
        } else {
            // Sécurité : si le rôle est absent, on utilise 'user' par défaut
            localStorage.setItem("userRole", "user");
            console.error("Le rôle est absent du token JWT, utilisation du rôle 'user' par défaut.");
        }

        // Vérifier si un changement de mot de passe est requis
        if (data.requiresPasswordChange) {
          setShowPasswordChangeModal(true);
        } else {
          router.push("/books");
          toast({
            title: "Connexion réussie",
            description: "Vous êtes maintenant connecté.",
          });
        }
      } catch (error) {
          console.error("Erreur lors du décodage du token pour le rôle :", error);
          setShowLoginError(true);
          setLoginErrorType("unknown_error");
      }
    } catch (error: any) {
      setShowLoginError(true);
      setLoginErrorType(error.message);

      // Mapper les types d'erreur pour le toast
      let toastDescription = "";
      switch (error.message) {
        case "missing_fields":
          toastDescription = "Veuillez remplir tous les champs requis.";
          break;
        case "invalid_credentials":
          toastDescription = "Email ou mot de passe incorrect.";
          break;
        case "server_error":
          toastDescription = "Erreur serveur. Veuillez réessayer plus tard.";
          break;
        default:
          toastDescription = "Une erreur inconnue est survenue.";
      }

      toast({
        title: "Erreur de connexion",
        description: toastDescription,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!newEmail || !newPassword || !confirmPassword) {
      setChangePasswordError("Veuillez remplir tous les champs.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setChangePasswordError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    setChangePasswordError("");

    try {
      const requestBody = {
        newEmail,
        newPassword,
      };
      
      console.log("Envoi de la requête avec:", requestBody);
      
      const response = await fetch("/api/change-default-credentials", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Échec de la mise à jour des identifiants");
      }

      toast({
        title: "Identifiants mis à jour",
        description: "Vos identifiants ont été changés avec succès. Veuillez vous reconnecter.",
      });
      setShowPasswordChangeModal(false);
      
      // Supprimer le token et rediriger vers la page de login
      localStorage.removeItem("auth_token");
      localStorage.removeItem("userRole");
      window.location.reload();
    } catch (error: any) {
      setChangePasswordError(error.message || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        {showExpiredMessage && (
          <Alert className="mb-4">
            <AlertDescription>
              Votre session a expiré. Veuillez vous reconnecter pour continuer.
            </AlertDescription>
          </Alert>
        )}

        {showLoginError && (
          <Alert className="mb-4" variant="destructive">
            <AlertDescription>
              {loginErrorType === "missing_fields" && "Veuillez remplir tous les champs requis."}
              {loginErrorType === "invalid_credentials" && "Email ou mot de passe incorrect. Veuillez vérifier vos informations."}
              {loginErrorType === "server_error" && "Erreur serveur. Veuillez réessayer plus tard."}
              {loginErrorType === "unknown_error" && "Une erreur inconnue est survenue. Veuillez réessayer."}
              {!["missing_fields", "invalid_credentials", "server_error", "unknown_error"].includes(loginErrorType) && "Une erreur est survenue. Veuillez réessayer."}
            </AlertDescription>
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
        <div>
          <Label htmlFor="password">Mot de passe</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Connexion en cours..." : "Se connecter"}
        </Button>
        <div className="text-center mt-4">
          <p className="text-sm text-muted-foreground">
            Vous n'avez pas de compte ?{" "}
            <Button
              variant="link"
              className="p-0 h-auto font-semibold"
              onClick={() => {
                router.push("/register");
              }}
            >
              S'inscrire
            </Button>
          </p>
        </div>
      </form>

      <Dialog open={showPasswordChangeModal} onOpenChange={setShowPasswordChangeModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Changer vos identifiants</DialogTitle>
            <DialogDescription>
              Pour des raisons de sécurité, vous devez changer votre email et mot de passe par défaut.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="newEmail">Nouvel email</Label>
              <Input
                id="newEmail"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="newPassword">Nouveau mot de passe</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            {changePasswordError && (
              <Alert variant="destructive">
                <AlertDescription>{changePasswordError}</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button type="button" onClick={handlePasswordChange} disabled={loading}>
              {loading ? "Changement en cours..." : "Changer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
