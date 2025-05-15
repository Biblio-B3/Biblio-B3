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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

  const handleClose = () => {
    setIsOpen(false);
  };

  useEffect(() => {
    if (!error && reviews.length > 0) {
      handleClose();
    }
  }, [reviews, error]);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const response = await fetch("/api/reviews", {
          method: "GET",
          headers: {
            auth_token: `${localStorage.getItem("auth_token")}`,
          },
        });
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

  const handleDeleteReview = async (id: number) => {
    try {
      const response = await fetch(`/api/reviews/${id}`, {
        method: "DELETE",
        headers: {
          auth_token: `${localStorage.getItem("auth_token")}`,
        },
      });

      if (!response.ok)
        throw new Error("Erreur lors de la suppression de l'évaluation");

      setReviews((prevReviews) =>
        prevReviews.filter((review) => review.id !== id)
      );
    } catch (error) {
      setError(error instanceof Error ? error.message : "Erreur inconnue");
    }
  };

  return (
    <>
      {error && (
        <AlertDialog open={isOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <DialogTitle>Erreur</DialogTitle>
              <DialogDescription>
                {error}
              </DialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setIsOpen(false)}>OK</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {!error && reviews.length === 0 && (
        <Dialog open={isOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Information</DialogTitle>
              <DialogDescription>
                Il n'y a actuellement aucune évaluation à afficher.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => setIsOpen(false)}>OK</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

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
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteReview(review.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
