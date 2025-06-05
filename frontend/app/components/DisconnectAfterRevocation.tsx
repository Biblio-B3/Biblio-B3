"use client";

import { useRouter } from 'next/navigation';

const AUTH_ERRORS = ["Relogin is required", "Invalid Compact JWS"];

function handleApiError(error: any, router: any) {
    if (AUTH_ERRORS.some((msg) => error?.message?.includes(msg))) {
        localStorage.clear();
        router.replace("/login");
        router.refresh();
    }
}

async function fetchWithAuthCheck(input: RequestInfo, init?: RequestInit, router?: any) {
    const token = localStorage.getItem("auth_token");

    // Si pas de token, on continue sans redirection automatique
    // L'utilisateur pourra toujours cliquer sur le bouton "Se connecter"
    if (!token) {
        return fetch(input, init);
    }

    const response = await fetch(input, init);

    if (!response.ok) {
        try {
            const error = await response.json();
            handleApiError(error, router);
            return Promise.reject(error);
        } catch (parseError) {
            console.error("Unhandled API error:", parseError);
            return Promise.reject(parseError);
        }
    }

    return response;
}

export function useApiErrorHandler() {
    const router = useRouter();

    // Suppression de la redirection automatique vers /login
    // Nous gardons uniquement la logique de gestion des erreurs d'API
    
    return (input: RequestInfo, init?: RequestInit) => fetchWithAuthCheck(input, init, router);
}

export function DisconnectAfterRevocationWrapper({ children }: { children: React.ReactNode }) {
    useApiErrorHandler();
    return <>{children}</>;
}