"use client";

import { jwtDecode } from "jwt-decode";

interface JwtPayload {
    user_id: number;
}

export const useUserId = (): number | null => {
    if (typeof window === 'undefined') return null;
    
    const token = localStorage.getItem("auth_token");
    if (!token) return null;
    
    try {
        const decoded = jwtDecode<JwtPayload>(token);
        return decoded.user_id ?? null;
    } catch {
        return null;
    }
};