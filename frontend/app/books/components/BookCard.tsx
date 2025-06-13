"use client";

import { Book } from "./types";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";
import { useUserRole } from "@/app/hooks/useUserRole";
import { EditBookDialog } from "./EditBookDialog";

type BookCardProps = {
  book: Book;
  onNavigate?: () => void;
  onBookUpdated?: (updatedBook: Book) => void;
};

export const BookCard = ({ book, onNavigate, onBookUpdated }: BookCardProps) => {
  const router = useRouter();
  const userRole = useUserRole();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentBook, setCurrentBook] = useState(book);

  const handleClick = (e: React.MouseEvent) => {
    // Empêcher la navigation si on clique sur le bouton d'édition
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    
    // Sauvegarder l'état avant de naviguer
    if (onNavigate) {
      onNavigate();
    }
    // Naviguer vers les détails du livre
    router.push(`/books?bookId=${currentBook.id}`);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditDialogOpen(true);
  };

  const handleBookUpdated = (updatedBook: Book) => {
    setCurrentBook(updatedBook);
    if (onBookUpdated) {
      onBookUpdated(updatedBook);
    }
  };

  return (
    <>
      <div
        className="w-48 bg-card text-card-foreground rounded-lg shadow-md overflow-hidden cursor-pointer relative"
        onClick={handleClick}
      >
        <div className="relative w-full h-60">
          <Image
            src={
              currentBook.image_link
                ? `data:image/jpeg;base64,${currentBook.image_link}`
                : "/placeholder.svg"
            }
            alt={`Couverture de ${currentBook.title}`}
            fill
            style={{ objectFit: "cover" }}
          />
          {userRole === "admin" && (
            <Button
              variant="secondary"
              size="sm"
              className="absolute top-2 right-2 p-2 h-8 w-8"
              onClick={handleEditClick}
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-bold text-lg mb-2">{currentBook.title}</h3>
          <p className="text-sm text-muted-foreground mb-1">par {currentBook.author}</p>
          <p className="text-sm text-muted-foreground mb-1">
            Nombre de pages: {currentBook.pageCount}
          </p>
          <p className="text-sm text-muted-foreground mb-1">
            Langue: {currentBook.language}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Exemplaires: {currentBook.quantity}
          </p>
        </div>
      </div>
      
      {/* Dialog de modification du livre */}
      <EditBookDialog
        isOpen={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        book={currentBook}
        onBookUpdated={handleBookUpdated}
      />
    </>
  );
};