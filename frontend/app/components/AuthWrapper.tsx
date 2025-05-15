"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import { jwtDecode } from "jwt-decode";
import { isClient, getLocalStorageItem } from "../utils/isClient";

import type React from "react";

type AuthWrapperProps = {
  children: React.ReactNode;
};

const publicRoutes = ["/login", "/register", "/reset-password", "/books", "/"];

type JwtPayload = {
  role?: string;
};

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const isPublicRoute = (path: string) => {
    // La racine est toujours considérée comme une route publique
    if (path === "/") return true;
    return publicRoutes.includes(path);
  };

  useEffect(() => {
    if (!isClient) return;
    
    const token = getLocalStorageItem("auth_token");

    if (!token) {
      if (!isPublicRoute(pathname)) {
        router.push("/login");
      }
      return;
    }

    try {
      const decoded = jwtDecode<JwtPayload>(token);
      const role = decoded.role || null;
      setUserRole(role);

      //Si c'est une route publique, on autorise l'accès même sans rôle
      if (isPublicRoute(pathname)) {
        setIsAuthenticated(true);
      } else if (!role) {
        // Si ce n'est pas une route publique et qu'il n'y a pas de rôle, on redirige
        router.push("/login");
      } else {
        // Si ce n'est pas une route publique mais qu'il y a un rôle, on autorise
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error("Erreur de décodage du token :", error);
      if (isClient) {
        localStorage.removeItem("auth_token");
      }
      router.push("/login");
    }
  }, [pathname, router]);

  // Pour les routes publiques qui ne sont pas /books, afficher sans sidebar
  if (isPublicRoute(pathname) && pathname !== "/books") {
    return <>{children}</>;
  }

  // Pour /books ou les routes authentifiées, afficher avec sidebar
  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
