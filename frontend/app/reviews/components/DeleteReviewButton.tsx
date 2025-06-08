"use client";

import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useUserRole } from "@/app/hooks/useUserRole";
import { useDeleteReview } from "../hooks/useDeleteReview";

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
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleDelete}
      disabled={isDeleting}
      className={`text-red-500 hover:text-red-700 hover:bg-red-50 ${className}`}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
};