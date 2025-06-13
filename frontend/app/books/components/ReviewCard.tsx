"use client";

import { Review } from "./types";
import { Card } from "@/components/ui/card";
import { DeleteReviewButton } from "@/app/reviews/components/DeleteReviewButton";

type ReviewCardProps = {
  review: Review;
  onDeleted?: (reviewId: number) => void;
};

export const ReviewCard = ({ review, onDeleted }: ReviewCardProps) => {
  const formattedDate = new Date(review.created_at).toLocaleDateString("fr-FR", {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <div className="flex text-yellow-400">
            {[...Array(5)].map((_, index) => (
              <svg
                key={index}
                className={`w-5 h-5 ${index < review.note ? "text-yellow-400" : "text-gray-300"}`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          <span className="ml-2 text-gray-600">
            {review.note}/5
          </span>
        </div>
        <DeleteReviewButton
          reviewId={review.id}
          userId={review.user_id}
          onDeleted={onDeleted}
        />
      </div>
      <p className="text-gray-700">{review.description}</p>
      <p className="text-sm text-gray-500 mt-2">
        Par {review.user_first_name && review.user_last_name ? `${review.user_first_name} ${review.user_last_name}`.trim() : 'Utilisateur inconnu'}
      </p>
      <p className="text-sm text-gray-500 mt-2">
        Créé le {formattedDate}
      </p>
    </Card>
  );
};