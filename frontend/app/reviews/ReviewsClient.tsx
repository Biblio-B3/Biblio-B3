"use client";

import { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { authFetch } from "@/app/utils/authFetch";
import { DeleteReviewButton } from "./components/DeleteReviewButton";

type Review = {
  id: number;
  description: string;
  note: number;
  condition: number;
  copy_id: number;
  book_id: number;
  user_id: number;
  user_first_name: string;
  user_last_name: string;
  book_title: string;
};

export default function ReviewsClient() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const response = await authFetch("/api/reviews");
        if (!response.ok) {
          if (response.status === 404) {
            setError(null); // Clear any previous errors
            return; // No reviews found, do not set an error
          }
          throw new Error("Erreur lors de la récupération des évaluations");
        }

        const data: Review[] = await response.json();
        setReviews(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      }
    };

    fetchReviews();
  }, []);

  const handleReviewDeleted = (reviewId: number) => {
    setReviews((prevReviews) =>
      prevReviews.filter((review) => review.id !== reviewId)
    );
  };

  return (
    <>
      {error && (
        <AlertDialog open={isOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Erreur</AlertDialogTitle>
              <AlertDialogDescription>
                {error}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setIsOpen(false)}>OK</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {!error && reviews.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          Il n'y a actuellement aucune évaluation à afficher.
        </div>
      )}

      {!error && reviews.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Livre</TableHead>
              <TableHead>Utilisateur</TableHead>
              <TableHead>Note</TableHead>
              <TableHead>Condition</TableHead>
              <TableHead>Commentaire</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reviews.map((review) => (
              <TableRow key={review.id}>
                <TableCell>{review.book_title}</TableCell>
                <TableCell>
                  {review.user_first_name} {review.user_last_name}
                </TableCell>
                <TableCell>{review.note}</TableCell>
                <TableCell>{review.condition}</TableCell>
                <TableCell>{review.description}</TableCell>
                <TableCell>
                  <DeleteReviewButton
                    reviewId={review.id}
                    onDeleted={handleReviewDeleted}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}
