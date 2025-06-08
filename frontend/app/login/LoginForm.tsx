"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLibrary } from "../components/LibraryContext";

export const CheckUserId = (token: string) => {
  try {
    const payload = token.split(".")[1];
    const decodedPayload = window.atob(payload);
    const userId = JSON.parse(decodedPayload).user_id;
    return userId;
  } catch (error) {
    console.error("⚠️ Erreur lors de la vérification de l'ID utilisateur :", error);
    return error;
  }
};

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showExpiredMessage, setShowExpiredMessage] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    // Vérifier si l'utilisateur a été redirigé à cause d'un token expiré
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      console.log('URL params:', window.location.search);
      console.log('Expired param:', urlParams.get('expired'));
      if (urlParams.get('expired') === 'true') {
        console.log('Setting expired message to true');
        setShowExpiredMessage(true);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

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
        throw new Error(data.message || `Erreur ${response.status}: ${response.statusText}`);
      }

      localStorage.setItem("auth_token", data.token);
      const id = CheckUserId(data.token);

      try {
        const ResUserRole = await fetch(`/api/roles/${id}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "auth_token": data.token,
          },
        });

        let dataUserRole;
        try {
          dataUserRole = await ResUserRole.json();
        } catch (err) {
          throw new Error("Réponse invalide du serveur.");
        }

        if (dataUserRole.roles === "admin") {
          localStorage.setItem("userRole", "admin");
        } else {
          localStorage.setItem("userRole", "user");
        }

        router.push("/books"); // ✅ Redirection unique vers /books
      } catch (error: any) {
        console.error("⚠️ Erreur lors de la récupération du rôle :", error.message);
        setErrorMessage("Erreur lors de la récupération du rôle");
      }

      toast({
        title: "Connexion réussie",
        description: "Vous êtes maintenant connecté.",
      });
    } catch (error: any) {
      console.error("⚠️ Erreur de connexion :", error.message);
      setErrorMessage(error.message);

      toast({
        title: "Erreur de connexion",
        description: error.message || "Une erreur inconnue est survenue.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {showExpiredMessage && (
        <Alert className="mb-4">
          <AlertDescription>
            Votre session a expiré. Veuillez vous reconnecter pour continuer.
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

      {errorMessage && (
        <p className="text-red-500 text-sm mt-2 text-center">{errorMessage}</p>
      )}
    </form>
  );
}
