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

const adminRoutes = ["/settings", "/reservations", "/stats", "/reviews", "/users", "/users/[id]"];

type JwtPayload = {
  role?: string;
};

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const isPublicRoute = (path: string) => {
    if (path === "/") return true;
    return publicRoutes.includes(path);
  };

  const isAdminRoute = (path: string) => {
    return adminRoutes.includes(path);
  };

  useEffect(() => {
    if (!isClient) {
      setIsLoading(false);
      return;
    }

    const token = getLocalStorageItem("auth_token");

    if (!token) {
      setIsAuthenticated(false);
      setUserRole(null);
      setIsLoading(false);
      if (!isPublicRoute(pathname)) {
        router.push("/login");
      }
      return;
    }

    try {
      const decoded = jwtDecode<JwtPayload>(token);
      const role = decoded.role || null;
      setUserRole(role);

      if (isAdminRoute(pathname) && role !== "admin") {
        router.push("/books");
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      if (isPublicRoute(pathname)) {
        setIsAuthenticated(true);
      } else if (!role) {
        router.push("/login");
        setIsAuthenticated(false);
      } else {
        setIsAuthenticated(true);
      }
      setIsLoading(false);
    } catch (error) {
      console.error("Erreur de décodage du token :", error);
      if (isClient) {
        localStorage.removeItem("auth_token");
      }
      setIsAuthenticated(false);
      setUserRole(null);
      setIsLoading(false);
      router.push("/login");
    }
  }, [pathname, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-foreground">Chargement...</div>
      </div>
    );
  }

  if (isPublicRoute(pathname) && pathname !== "/books") {
    return <>{children}</>;
  }

  // Vérification des permissions avant le rendu
  if (!isPublicRoute(pathname)) {
    // Route protégée : vérifier l'authentification
    if (!isAuthenticated) {
      return null; // Ne rien rendre, la redirection est en cours
    }

    // Route admin : vérifier le rôle admin
    if (isAdminRoute(pathname) && userRole !== "admin") {
      return null; // Ne rien rendre, la redirection est en cours
    }
  }

  // Pour /books ou les routes authentifiées autorisées, afficher avec sidebar
  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
