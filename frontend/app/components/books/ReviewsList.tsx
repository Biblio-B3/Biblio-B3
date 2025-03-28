"use client";

import { useState, useEffect } from "react";
import { Review, Pagination } from "./types";
import { ReviewCard } from "./ReviewCard";
import { Button } from "@/components/ui/button";
import { useApiErrorHandler } from "@/app/components/DisconnectAfterRevocation";

type ReviewsListProps = {
  bookId: string;
};

export const ReviewsList = ({ bookId }: ReviewsListProps) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchWithAuth = useApiErrorHandler();

  const itemsPerPage = 10;

  useEffect(() => {
    if (!bookId) return;

    if (pagination && currentPage > pagination.totalPages) {
      setCurrentPage(1);
      return;
    }

    let isMounted = true;

    const fetchReviews = async () => {
      try {
        setLoading(true);
        const response = await fetchWithAuth(
          `/api/books/${bookId}/reviews?page=${currentPage}&itemsPerPage=${itemsPerPage}`,
          {
            headers: {
              auth_token: `${localStorage.getItem("auth_token")}`,
            },
          }
        );

        if (!isMounted) return;

        if (!response.ok) {
          if (response.status === 404) {
            if (isMounted) {
              setError("Aucun avis trouvé.");
              setLoading(false);
            }
          }
          if (isMounted) {
            setError(`Erreur: ${response.statusText}`);
          }
          setLoading(false);
          return;
        }

        const data = await response.json();

        const reviewsData = data.data;

        const reviewsWithUserInfo = await Promise.all(
          reviewsData.map(async (review: Review) => {
            try {
              const userResponse = await fetchWithAuth(`/api/users/${review.user_id}`, {
                headers: {
                  auth_token: `${localStorage.getItem("auth_token")}`,
                },
              });
              if (userResponse.ok) {
                const userData = await userResponse.json();

                return {
                  ...review,
                  user: {
                    first_name: userData.user_first_name || "Inconnu",
                    last_name: userData.user_last_name || "Inconnu",
                  },
                };
              }
            } catch (error) {
              console.error("Erreur lors de la récupération des données utilisateur:", error);
            }
            return {
              ...review,
              user: {
                first_name: "Inconnu",
                last_name: "Inconnu",
              },
            };
          })
        );

        if (isMounted) {
          setReviews(reviewsWithUserInfo);
          setPagination(data.pagination);
        }
        if (pagination && pagination.totalPages > 0 && currentPage > pagination.totalPages) {
          setCurrentPage(1);
          return;
        }
      } catch (error) {
        if (isMounted) {
          console.error("Erreur lors de la récupération des avis:", error);
          setError("Erreur lors de la récupération des avis");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchReviews();

    return () => {
      isMounted = false;
    };
  }, [bookId, currentPage, fetchWithAuth, itemsPerPage]);

  if (loading && !reviews.length) {
    return <div className="text-center py-4">Chargement des avis...</div>;
  }

  if (error) {
    return <div className="text-center py-4 text-red-500">{error}</div>;
  }

  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold mb-4">
        Avis sur le livre {pagination && `(${pagination.total})`}
      </h2>
      {reviews.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-4">
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>

          {pagination && (
            <div className="flex justify-center items-center mt-6 gap-4">
              <Button
                variant="outline"
                disabled={!pagination.hasPreviousPage}
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              >
                Précédent
              </Button>
              <span>
                Page {pagination.page} sur {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                disabled={!pagination.hasNextPage}
                onClick={() => setCurrentPage((prev) => prev + 1)}
              >
                Suivant
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          Aucun avis pour ce livre pour le moment.
        </div>
      )}
    </div>
  );
};