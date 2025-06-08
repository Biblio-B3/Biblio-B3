"use client";

import { useState, useEffect } from "react";
import { Review, Pagination } from "./types";
import { ReviewCard } from "./ReviewCard";
import { Button } from "@/components/ui/button";
import { authFetch } from "@/app/utils/authFetch";


type ReviewsListProps = {
  bookId: string;
};

export const ReviewsList = ({ bookId }: ReviewsListProps) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const itemsPerPage = 10;

  useEffect(() => {
    if (pagination && currentPage > pagination.totalPages) {
      setCurrentPage(pagination.totalPages);
    }
  }, [pagination, currentPage]);

  useEffect(() => {
    console.log("Fetching reviews for", bookId, "page", currentPage);

    if (!bookId) return;

    let isMounted = true;

    const fetchReviews = async () => {
      if (!isMounted) return;
      
      setLoading(true);
      setError(null);

      try {
        const response = await authFetch(
          `/api/books/${bookId}/reviews?page=${currentPage}&itemsPerPage=${itemsPerPage}`
        );

        if (!isMounted) return;

        const data = await response.json();

        const reviewsWithUserInfo = await Promise.all(
          data.data.map(async (review: Review) => {
            try {
              const userResponse = await authFetch(
                `/api/users/${review.user_id}`,
                {
                  headers: {
                    auth_token: `${localStorage.getItem("auth_token")}`,
                  },
                }
              );
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
            } catch {
              // fallback user unknown
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
          setLoading(false);
        }
      } catch (err: any) {
        console.log("Caught error:", err);
        
        if (isMounted) {
          // Vérifier si c'est une erreur 404 (aucun avis)
          if (err?.message === "No reviews found for this book.") {
            console.log("404 detected in catch - no reviews");
            // Cas avec 0 review
            setReviews([]);
            setPagination({
              page: 1,
              total: 0,
              totalPages: 1,
              hasNextPage: false,
              hasPreviousPage: false,
              itemsPerPage: itemsPerPage,
            });
            setError(null); // Pas d'erreur pour ce cas
          } else {
            // Vraie erreur
            setError("Erreur lors de la récupération des avis");
          }
          setLoading(false);
        }
      }
    };

    fetchReviews();

    return () => {
      isMounted = false;
    };
  }, [bookId, currentPage]);

  console.log("Current state:", { reviews: reviews.length, error, loading, pagination });

  if (loading) {
    return <div className="text-center py-4">Chargement des avis...</div>;
  }

  if (error) {
    console.log("Showing error:", error);
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

          {pagination && pagination.totalPages > 1 && (
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
          Aucun avis n'existe pour l'instant.
        </div>
      )}
    </div>
  );
};
