"use client";

import { isTokenExpired } from "@/app/utils/authFetch";
import { isClient, getLocalStorageItem } from "@/app/utils/isClient";

/**
 * Composant qui vérifie la validité du token au chargement de l'application
 */
export function TokenChecker({ children }: { children: React.ReactNode }) {
  // Vérification synchrone dès le rendu initial
  if (isClient) {
    const token = getLocalStorageItem("auth_token");
    
    // Si un token existe et qu'il est expiré, rediriger immédiatement
    if (token && isTokenExpired(token)) {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("userRole");
      
      window.location.href = "/login?expired=true";
      return null;
    }
  }

  return <>{children}</>;
}