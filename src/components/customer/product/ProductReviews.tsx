"use client";

import { useState } from "react";
import { Star, MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProductReview } from "@/types/product";

interface ProductReviewsProps {
  productId: string;
  reviews: ProductReview[];
  averageRating: number;
  reviewCount: number;
  canReview: boolean; // Only true if user has a delivered order for this product
  onReviewSubmitted?: () => void;
}

/**
 * Product Reviews Component
 * Displays reviews with ratings and allows users to write reviews
 * Swiggy Dec 2025 pattern: 5-star rating system, text reviews
 */
export function ProductReviews({
  productId,
  reviews,
  averageRating,
  reviewCount,
  canReview,
  onReviewSubmitted,
}: ProductReviewsProps) {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const handleSubmitReview = async () => {
    if (!user) {
      showError("Please sign in to write a review");
      return;
    }

    if (rating === 0) {
      showError("Please select a rating");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/products/${productId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          comment: comment.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit review");
      }

      success("Review submitted successfully");
      setRating(0);
      setComment("");
      setShowReviewForm(false);
      onReviewSubmitted?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to submit review";
      showError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 pt-4 border-t">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground">Customer Reviews</h3>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-medium">{averageRating.toFixed(1)}</span>
            </div>
            <span className="text-xs text-muted-foreground">({reviewCount} {reviewCount === 1 ? "review" : "reviews"})</span>
          </div>
        </div>
        {canReview && !showReviewForm && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowReviewForm(true)}
            className="text-xs"
          >
            <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
            Write Review
          </Button>
        )}
      </div>

      {/* Review Form */}
      {showReviewForm && (
        <div className="p-4 border rounded-lg space-y-3 bg-muted/30">
          <div>
            <label className="text-xs font-medium mb-2 block">Your Rating</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="focus:outline-none"
                >
                  <Star
                    className={cn(
                      "w-5 h-5 transition-colors",
                      star <= rating
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground"
                    )}
                  />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium mb-2 block">Your Review (optional)</label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience..."
              className="min-h-[80px] text-sm"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {comment.length}/500 characters
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleSubmitReview}
              disabled={isSubmitting || rating === 0}
              size="sm"
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  Submit Review
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowReviewForm(false);
                setRating(0);
                setComment("");
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Reviews List */}
      {reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="space-y-2 pb-4 border-b last:border-0">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-xs font-medium">
                      {review.userName?.[0]?.toUpperCase() || "U"}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{review.userName || "Anonymous"}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(review.createdAt).toLocaleDateString("en-IN", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={cn(
                        "w-3.5 h-3.5",
                        star <= review.rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground"
                      )}
                    />
                  ))}
                </div>
              </div>
              {review.comment && (
                <p className="text-sm text-muted-foreground">{review.comment}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No reviews yet. Be the first to review!
        </div>
      )}
    </div>
  );
}


