"use client";

import { useRouter } from "next/navigation";
import { isClient, getLocalStorageItem } from "./isClient";

const AUTH_ERRORS = ["Relogin is required", "Invalid Compact JWS", "\"exp\" claim timestamp check failed"];

/**
 * Vérifie si le token JWT est expiré
 */
export function isTokenExpired(token: string | null): boolean {
  if (!token) return true;
  
  try {
    // Décoder le JWT (partie payload)
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    
    // Vérifier si le token a expiré
    return payload.exp < currentTime;
  } catch (error) {
    // Si on ne peut pas décoder le token, on considère qu'il est expiré
    return true;
  }
}

/**
 * Vérifie le token au chargement et redirige si nécessaire
 * Ne fait rien si aucun token n'est présent (visiteur non connecté)
 */
export function checkTokenOnLoad(): void {
  if (!isClient) return;
  
  const token = getLocalStorageItem("auth_token");
  
  // Si pas de token, c'est normal pour un visiteur non connecté
  if (!token) return;
  
  // Si un token existe mais qu'il est expiré, nettoyer et rediriger
  if (isTokenExpired(token)) {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("userRole");
    window.location.href = "/login?expired=true";
  }
}

function handleApiError(error: any) {
  if (AUTH_ERRORS.some((msg) => error?.message?.includes(msg))) {
    if (isClient) {
      // Supprimer seulement les données d'authentification, pas le thème
      localStorage.removeItem("auth_token");
      localStorage.removeItem("userRole");
      window.location.href = "/login?expired=true";
    }
    // Lancer une exception spéciale qui ne sera pas affichée
    throw new Error("AUTH_REDIRECT");
  }
}

/**
 * Fonction utilitaire pour effectuer des requêtes API avec vérification d'authentification
 * Redirige vers la page de connexion si l'utilisateur n'est pas authentifié
 * pour les méthodes POST, PUT, DELETE
 */
export const authFetch = async (url: string, options: RequestInit = {}) => {
  const token = getLocalStorageItem("auth_token");
  const method = options.method || "GET";
  
  // Pour les méthodes qui modifient des données, vérifier l'authentification
  if (["POST", "PUT", "DELETE"].includes(method.toUpperCase()) && !token) {
    // Rediriger vers la page de connexion
    if (isClient) {
      window.location.href = "/login?expired=true";
    }
    throw new Error("Authentification requise");
  }

  // Ajouter le token d'authentification aux en-têtes si disponible
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
    ...(token ? { auth_token: token } : {}),
  };

  // Effectuer la requête
  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Gérer les erreurs d'authentification
  if (response.status === 401) {
    if (isClient) {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("userRole");
      window.location.href = "/login?expired=true";
    }
    throw new Error("Session expirée");
  }

  // Vérifier les erreurs spécifiques dans la réponse
  if (!response.ok) {
    try {
      const error = await response.clone().json();
      handleApiError(error);
    } catch (parseError) {
      // Si on ne peut pas parser la réponse, on continue normalement
    }
  }

  return response;
};

function handleApiErrorWithRouter(error: any, router: any) {
  if (AUTH_ERRORS.some((msg) => error?.message?.includes(msg))) {
    if (isClient) {
      // Supprimer seulement les données d'authentification, pas le thème
      localStorage.removeItem("auth_token");
      localStorage.removeItem("userRole");
      router.push("/login?expired=true");
      router.refresh();
    }
    // Lancer une exception spéciale qui ne sera pas affichée
    throw new Error("AUTH_REDIRECT");
  }
}

/**
 * Hook pour utiliser authFetch avec redirection via useRouter
 */
export const useAuthFetch = () => {
  const router = useRouter();

  return async (url: string, options: RequestInit = {}) => {
    const token = getLocalStorageItem("auth_token");
    const method = options.method || "GET";
    
    // Pour les méthodes qui modifient des données, vérifier l'authentification
    if (["POST", "PUT", "DELETE"].includes(method.toUpperCase()) && !token) {
      // Rediriger vers la page de connexion
      if (isClient) {
        router.push("/login");
      }
      throw new Error("Authentification requise");
    }

    // Ajouter le token d'authentification aux en-têtes si disponible
    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
      ...(token ? { auth_token: token } : {}),
    };

    // Effectuer la requête
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Gérer les erreurs d'authentification
    if (response.status === 401) {
      if (isClient) {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("userRole");
        router.push("/login");
      }
      throw new Error("Session expirée");
    }

    // Vérifier les erreurs spécifiques dans la réponse
    if (!response.ok) {
      try {
        const error = await response.clone().json();
        handleApiErrorWithRouter(error, router);
      } catch (parseError) {
        // Si on ne peut pas parser la réponse, on continue normalement
      }
    }

    return response;
  };
};