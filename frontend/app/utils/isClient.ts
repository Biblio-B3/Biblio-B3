/**
 * Vérifie si le code s'exécute côté client (navigateur)
 * Utilisé pour éviter les erreurs avec localStorage et window dans le SSR
 */
export const isClient = typeof window !== 'undefined';

/**
 * Récupère une valeur depuis localStorage de manière sécurisée (compatible SSR)
 */
export const getLocalStorageItem = (key: string): string | null => {
  if (isClient) {
    return localStorage.getItem(key);
  }
  return null;
};

/**
 * Définit une valeur dans localStorage de manière sécurisée (compatible SSR)
 */
export const setLocalStorageItem = (key: string, value: string): void => {
  if (isClient) {
    localStorage.setItem(key, value);
  }
};

/**
 * Supprime une valeur de localStorage de manière sécurisée (compatible SSR)
 */
export const removeLocalStorageItem = (key: string): void => {
  if (isClient) {
    localStorage.removeItem(key);
  }
};