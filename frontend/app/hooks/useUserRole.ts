"use client";

import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { isClient, getLocalStorageItem } from "../utils/isClient";

type JwtPayload = {
    role?: string;
};

export const useUserRole = () => {
    const [role, setRole] = useState<string | null>(null);

    useEffect(() => {
        if (!isClient) return;
        
        const token = getLocalStorageItem("auth_token");
        if (!token) return;

        try {
            const decoded = jwtDecode<JwtPayload>(token);
            setRole(decoded.role || null);
        } catch (err) {
            console.error("Erreur lors du décodage du token JWT :", err);
            setRole(null);
        }
    }, []);

    return role;
};
