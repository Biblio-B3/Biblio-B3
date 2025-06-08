"use client";

import { useState, useEffect } from "react";
import { Copy } from "./types";
import { CopyCard } from "./CopyCard";
import { authFetch } from "@/app/utils/authFetch";
import { useUserRole } from "@/app/hooks/useUserRole"; // ✅ ajout du hook
// Removed authFetch import as we're using fetch directly now
import { isClient, getLocalStorageItem } from "@/app/utils/isClient";

type CopiesListProps = {
  bookId: string;
};

export const CopiesList = ({ bookId }: CopiesListProps) => {
  const [copies, setCopies] = useState<Copy[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataFetched, setDataFetched] = useState(false);
  const role = useUserRole(); // ✅ rôle récupéré
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    if (!isClient) return;
    
    const token = getLocalStorageItem("auth_token");
    setIsAuthenticated(!!token);
  }, []);

  useEffect(() => {
    if (!bookId || dataFetched) return;

    let isMounted = true;

    const fetchCopies = async () => {
      try {
        setLoading(true);
        // Utiliser fetch standard pour les requêtes GET (pas besoin d'authentification)
        const response = await fetch(`/api/books/${bookId}/copy`);

        if (!isMounted) return;

        if (response.ok) {
          const data: Copy[] = await response.json();
          setCopies(data);
        }
      } catch (error) {
        if (isMounted) {
          setError("Erreur lors de la connexion au serveur");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          setDataFetched(true);
        }
      }
    };

    fetchCopies();
    return () => {
      isMounted = false;
    };
  }, [bookId, authFetch, dataFetched]);

  const handleDeleteCopy = async (copyId: number) => {
    const confirmed = window.confirm("Êtes-vous sûr de vouloir supprimer cette copie ?");
    if (!confirmed) return;

    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/copy/${copyId}`, {
        method: "DELETE",
        headers: {
          "auth_token": token || ""
        }
      });

      if (response.ok) {
        setCopies((prev) => prev.filter((copy) => copy.copy_id !== copyId));
        console.log("Copie supprimée avec succès");
      } else {
        const data = await response.json();
        alert(data.message || "Erreur lors de la suppression.");
      }
    } catch (error) {
      console.error("Erreur lors de la suppression de la copie:", error);
      alert("Une erreur est survenue lors de la suppression.");
    }
  };

  const handleUpdateCopy = async (copyId: number, newState: string) => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/copy/${copyId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "auth_token": token || ""
        },
        body: JSON.stringify({ state: newState }),
      });

      if (response.ok) {
        setCopies((prev) =>
          prev.map((copy) =>
            copy.copy_id === copyId ? { ...copy, state: newState } : copy
          )
        );
      } else {
        const data = await response.json();
        alert(data.message || "Erreur lors de la mise à jour.");
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour de la copie:", error);
      alert("Une erreur est survenue lors de la mise à jour.");
    }
  };

  if (loading) {
    return <div className="text-center py-8">Chargement des exemplaires...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-100 text-red-800 p-4 rounded-md mb-4">
        {error}
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">
        Exemplaires disponibles ({copies.length})
      </h2>

      {copies.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {copies.map((copy) => (
            <CopyCard
              key={copy.copy_id}
              copy={copy}
              {...(isAuthenticated && role === "admin" ? {
                onDelete: handleDeleteCopy,
                onUpdateCopy: handleUpdateCopy
              } : {})} // ✅ condition avec vérification d'authentification
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          Aucun exemplaire disponible pour ce livre.
        </div>
      )}
    </div>
  );
};
