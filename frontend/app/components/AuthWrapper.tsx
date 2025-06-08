"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import { jwtDecode } from "jwt-decode";
import { isClient, getLocalStorageItem } from "../utils/isClient";
import NotFound from "../not-found";

import type React from "react";

type AuthWrapperProps = {
  children: React.ReactNode;
};

const publicRoutes = ["/login", "/register", "/reset-password", "/books", "/", "/not-found"];

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
    // Vérification directe pour les routes exactes
    if (adminRoutes.includes(path)) {
      return true;
    }
    
    // Vérification pour les routes dynamiques comme /users/[id]
    return adminRoutes.some(route => {
      if (route.includes('[id]')) {
        const routePattern = route.replace('[id]', '\\d+');
        const regex = new RegExp(`^${routePattern}$`);
        return regex.test(path);
      }
      return false;
    });
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

      // Ne plus rediriger ici, on gère l'affichage dans le rendu
      setIsAuthenticated(true);

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

    // Route admin : vérifier le rôle admin et afficher 404 avec sidebar si non autorisé
    if (isAdminRoute(pathname) && userRole !== "admin") {
      return (
        <div className="flex h-screen bg-background text-foreground">
          <Sidebar />
          <main className="flex-1 overflow-y-auto p-8">
            <NotFound />
          </main>
        </div>
      );
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
