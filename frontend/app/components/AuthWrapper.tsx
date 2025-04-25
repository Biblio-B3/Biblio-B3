"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import { jwtDecode } from "jwt-decode";

import type React from "react";

type AuthWrapperProps = {
  children: React.ReactNode;
};

const publicRoutes = ["/login", "/register", "/reset-password"];

type JwtPayload = {
  role?: string;
};

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const isPublicRoute = (path: string) => {
    return publicRoutes.includes(path);
  };

  useEffect(() => {
    const token = localStorage.getItem("auth_token");

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

      if (!role && !isPublicRoute(pathname)) {
        router.push("/login");
      } else {
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error("Erreur de décodage du token :", error);
      localStorage.removeItem("auth_token");
      router.push("/login");
    }
  }, [pathname, router]);

  if (isPublicRoute(pathname)) {
    return <>{children}</>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
