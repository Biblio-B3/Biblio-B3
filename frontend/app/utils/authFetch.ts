"use client";

import { useRouter } from "next/navigation";
import { isClient, getLocalStorageItem } from "./isClient";

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
      window.location.href = "/login";
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
      window.location.href = "/login";
    }
    throw new Error("Session expirée");
  }

  return response;
};

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

    return response;
  };
};