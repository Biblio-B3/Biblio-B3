"use client";

import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { isClient, getLocalStorageItem } from "../utils/isClient";

type JwtPayload = {
    role?: string;
};

// Cache global pour éviter les décodages multiples
let cachedRole: string | null = null;
let cachedToken: string | null = null;

export const useUserRole = () => {
    const [role, setRole] = useState<string | null>(cachedRole);

    useEffect(() => {
        if (!isClient) return;
        
        const token = getLocalStorageItem("auth_token");
        
        // Si le token n'a pas changé, utiliser le cache
        if (token === cachedToken && cachedRole !== null) {
            setRole(cachedRole);
            return;
        }
        
        if (!token) {
            cachedToken = null;
            cachedRole = null;
            setRole(null);
            return;
        }

        try {
            const decoded = jwtDecode<JwtPayload>(token);
            const newRole = decoded.role || null;
            
            // Mettre à jour le cache
            cachedToken = token;
            cachedRole = newRole;
            setRole(newRole);
        } catch (err) {
            console.error("Erreur lors du décodage du token JWT :", err);
            cachedToken = null;
            cachedRole = null;
            setRole(null);
        }
    }, []);

    return role;
};
