"use client";

import { useState } from "react";
import { authFetch } from "@/app/utils/authFetch";

export const useDeleteReview = () => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteReview = async (reviewId: number): Promise<boolean> => {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await authFetch(`/api/reviews/${reviewId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la suppression de l'avis");
      }

      setIsDeleting(false);
      return true;
    } catch (err: any) {
      setError(err.message || "Erreur lors de la suppression de l'avis");
      setIsDeleting(false);
      return false;
    }
  };

  return {
    deleteReview,
    isDeleting,
    error,
    clearError: () => setError(null),
  };
};