// Sidebar.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Book, Users, Calendar, Star, BarChart2, Settings, LogOut, Clock, Home, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useLibrary } from "./LibraryContext";
import { isClient, getLocalStorageItem, removeLocalStorageItem } from "../utils/isClient";

const dayLabels: Record<string, string> = {
  monday: "Lundi",
  tuesday: "Mardi",
  wednesday: "Mercredi",
  thursday: "Jeudi",
  friday: "Vendredi",
  saturday: "Samedi",
  sunday: "Dimanche",
};
const dayLabels: Record<string, string> = {
  monday: "Lundi",
  tuesday: "Mardi",
  wednesday: "Mercredi",
  thursday: "Jeudi",
  friday: "Vendredi",
  saturday: "Samedi",
  sunday: "Dimanche",
};

export default function Sidebar() {
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();
  const { libraryName, address, email, phone, openingHours } = useLibrary();
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();
  const { libraryName, address, email, phone, openingHours } = useLibrary();

  useEffect(() => {
    if (!isClient) return;
    const token = getLocalStorageItem("auth_token");
    setIsAuthenticated(!!token);
    setUserRole(getLocalStorageItem("userRole"));
  }, []);

  const handleLogout = () => {
    if (isClient) {
      removeLocalStorageItem("userRole");
      removeLocalStorageItem("auth_token");
      removeLocalStorageItem("userRole");
      removeLocalStorageItem("auth_token");
    }
    router.push("/login");
  };
    router.push("/login");
  };

  const handleLogin = () => {
    router.push("/login");
  };

  const adminNavItems = [
    { href: "/components/admin/reservations", icon: Calendar, label: "Réservations" },
    { href: "/books", icon: Book, label: "Livres" },
    { href: "/components/admin/users", icon: Users, label: "Utilisateurs" },
    { href: "/components/admin/reviews", icon: Star, label: "Évaluations" },
    { href: "/components/admin/stats", icon: BarChart2, label: "Statistiques" },
    { href: "/components/admin/settings", icon: Settings, label: "Paramètres" },
    { href: "/components/admin/profile", icon: Home, label: "Profil" },
  ];

  const userNavItems = [
    { href: "/books", icon: Home, label: "Accueil" },
    { href: "/components/user/reservation_user", icon: Clock, label: "Reservation" },
    { href: "/components/user/history", icon: Clock, label: "Historique" },
  ];

  const navItems = !isAuthenticated
    ? [{ href: "/books", icon: Home, label: "Accueil" }]
    : userRole === "admin"
      ? adminNavItems
      : userNavItems;
  const navItems = !isAuthenticated
    ? [{ href: "/books", icon: Home, label: "Accueil" }]
    : userRole === "admin"
      ? adminNavItems
      : userNavItems;

  return (
    <aside className="w-64 bg-gray-100 dark:bg-gray-800 p-4 flex flex-col">
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold">{libraryName}</h1>
        <p className="text-sm mt-1">{address}</p>
        <p className="text-sm">{email}</p>
        <p className="text-sm">{phone}</p>
      </div>

      <nav className="flex-1">
    <aside className="w-64 bg-gray-100 dark:bg-gray-800 p-4 flex flex-col">
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold">{libraryName}</h1>
        <p className="text-sm mt-1">{address}</p>
        <p className="text-sm">{email}</p>
        <p className="text-sm">{phone}</p>
      </div>

      <nav className="flex-1">
        <ul>
          {navItems.map(item => (
          {navItems.map(item => (
            <li key={item.href} className="mb-2">
              <Link
                href={item.href}
                className={`flex items-center p-2 rounded-lg ${pathname === item.href
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
              >
                <item.icon className="mr-2 h-5 w-5" />
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="opacity-80 mb-4 bg-white dark:bg-gray-700 p-2 rounded-lg">
        <h2 className="font-semibold text-sm mb-1">Horaires d'ouverture</h2>
        {Object.entries(openingHours).map(([day, hours]) => (
          <div key={day} className="flex justify-between text-xs capitalize">
            <span>{dayLabels[day] || day}</span>
            <span>{hours}</span>
          </div>
        ))}
      </div>

      <div>

      <div className="opacity-80 mb-4 bg-white dark:bg-gray-700 p-2 rounded-lg">
        <h2 className="font-semibold text-sm mb-1">Horaires d'ouverture</h2>
        {Object.entries(openingHours).map(([day, hours]) => (
          <div key={day} className="flex justify-between text-xs capitalize">
            <span>{dayLabels[day] || day}</span>
            <span>{hours}</span>
          </div>
        ))}
      </div>

      <div>
        {isAuthenticated ? (
          <Button variant="outline" className="w-full" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Déconnexion
          </Button>
        ) : (
          <Button variant="outline" className="w-full" onClick={handleLogin}>
            <LogIn className="mr-2 h-4 w-4" />
            Connexion
          </Button>
        )}
      </div>
    </aside>
  );
  );
}
