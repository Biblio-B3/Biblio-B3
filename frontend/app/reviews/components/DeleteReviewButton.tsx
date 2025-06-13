"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useUserRole } from "@/app/hooks/useUserRole";
import { useDeleteReview } from "../hooks/useDeleteReview";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

type DeleteReviewButtonProps = {
  reviewId: number;
  onDeleted?: (reviewId: number) => void;
  className?: string;
};

export const DeleteReviewButton = ({
  reviewId,
  onDeleted,
  className = ""
}: DeleteReviewButtonProps) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const userRole = useUserRole();
  const isAdmin = userRole === "admin";
  const { deleteReview, isDeleting } = useDeleteReview();

  if (!isAdmin) {
    return null;
  }

  const handleDelete = async () => {
    const success = await deleteReview(reviewId);
    if (success && onDeleted) {
      onDeleted(reviewId);
    }
    setDeleteDialogOpen(false);
  };

  return (
    <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          disabled={isDeleting}
          className={`text-red-500 hover:text-red-700 hover:bg-red-50 ${className}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmer la suppression</DialogTitle>
          <DialogDescription>
            Êtes-vous sûr de vouloir supprimer définitivement cet avis ?
            Cette action est irréversible.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Annuler
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
          >
            Supprimer définitivement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};