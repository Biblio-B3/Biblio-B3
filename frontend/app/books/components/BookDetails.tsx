"use client";

import { useState, useEffect } from "react";
import { Book } from "./types";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fr } from "date-fns/locale";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { CopiesList } from "./CopiesList";
import { ReviewsList } from "./ReviewsList";
import { authFetch } from "@/app/utils/authFetch";
import { useUserRole } from "@/app/hooks/useUserRole";

type BookDetailsProps = {
  bookId: string;
};

export const BookDetails = ({ bookId }: BookDetailsProps) => {
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataFetched, setDataFetched] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const userRole = useUserRole();
  const [numberOfCopies, setNumberOfCopies] = useState("");
  const [copyState, setCopyState] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleAddCopies = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!book || !copyState || !numberOfCopies) return;

    try {
      for (let i = 0; i < parseInt(numberOfCopies); i++) {
        await authFetch("/api/copy", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            auth_token: `${localStorage.getItem("auth_token")}`,
          },
          body: JSON.stringify({
            book_id: parseInt(bookId),
            state: copyState,
            is_reserved: false,
            is_claimed: false,
          }),
        });
      }
      setDialogOpen(false);
    } catch (error) {
      console.error("Error adding copies:", error);
    }
  };

  useEffect(() => {
    if (!bookId || dataFetched) return;

    let isMounted = true;

    const fetchBookDetails = async () => {
      try {
        setLoading(true);
        const bookResponse = await fetch(`/api/books/${bookId}`);

        if (!isMounted) return;

        if (bookResponse.ok) {
          const bookData = await bookResponse.json();
          setBook(bookData);
        } else {
          setError("Erreur lors de la récupération des détails du livre");
        }
      } catch (error) {
        if (isMounted) {
          setError("Erreur lors de la connexion au serveur");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          setDataFetched(true);
        }
      }
    };

    fetchBookDetails();
    return () => {
      isMounted = false;
    };
  }, [bookId, authFetch, dataFetched]);

  const handleDeleteBook = async () => {
    try {
      const response = await authFetch(`/api/books/${bookId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          auth_token: `${localStorage.getItem("auth_token")}`,
        },
      });

      if (response.ok) {
        setDeleteDialogOpen(false);
        router.back();
      } else {
        const errorData = await response.json();
        setError(errorData.message || "Erreur lors de la suppression du livre");
      }
    } catch (error) {
      console.error("Error deleting book:", error);
      setError("Erreur lors de la connexion au serveur");
    }
  };

  const handleArchiveBook = async () => {
    try {
      const endpoint = book?.is_removed ? 'unarchiving' : 'archiving';
      const response = await authFetch(`/api/books/${bookId}/${endpoint}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          auth_token: `${localStorage.getItem("auth_token")}`,
        },
      });

      if (response.ok) {
        setBook(prev => prev ? { ...prev, is_removed: !prev.is_removed } : null);
      } else {
        const errorData = await response.json();
        const action = book?.is_removed ? "désarchivage" : "archivage";
        setError(errorData.message || `Erreur lors du ${action} du livre`);
      }
    } catch (error) {
      console.error("Error archiving/unarchiving book:", error);
      setError("Erreur lors de la connexion au serveur");
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd-MM-yyyy", { locale: fr });
  };

  if (loading) {
    return <div className="container mx-auto py-6">Chargement...</div>;
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <div className="bg-red-100 text-red-800 p-4 rounded-md mb-4">
          {error}
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="container mx-auto py-6">
        <div className="bg-yellow-100 text-yellow-800 p-4 rounded-md">
          Livre non trouvé
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <Button
        variant="ghost"
        className="mb-4 flex items-center"
        onClick={() => router.back()}
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Retour aux livres
      </Button>

      <div className="flex flex-col md:flex-row gap-6 mb-8">
        <div className="w-full md:w-1/4 flex-shrink-0">
          <div className="relative h-64 md:h-80 rounded-lg overflow-hidden">
            <Image
              src={
                book.image_link
                  ? `data:image/jpeg;base64,${book.image_link}`
                  : "/placeholder.svg"
              }
              alt={`Couverture de ${book.title}`}
              fill
              style={{ objectFit: "cover" }}
            />
          </div>
        </div>
        <div className="w-full md:w-3/4">
          <div className="flex justify-between items-start mb-2">
            <h1 className="text-2xl font-bold">{book.title}</h1>
            {userRole === "admin" && (
              <div className="flex gap-2">
                <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                    >
                      Supprimer le livre
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Confirmer la suppression</DialogTitle>
                      <DialogDescription>
                        Êtes-vous sûr de vouloir supprimer définitivement ce livre ?
                        Cette action est irréversible et supprimera également tous les exemplaires et avis associés.
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
                        onClick={handleDeleteBook}
                      >
                        Supprimer définitivement
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Button
                  variant={book.is_removed ? "default" : "destructive"}
                  size="sm"
                  onClick={handleArchiveBook}
                >
                  {book.is_removed ? "Désarchiver le livre" : "Archiver le livre"}
                </Button>
              </div>
            )}
          </div>
          <p className="text-lg text-muted-foreground mb-4">par {book.author}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">ISBN-10: {book.ISBN_10 || "N/A"}</p>
              <p className="text-sm text-muted-foreground mb-1">ISBN-13: {book.ISBN_13 || "N/A"}</p>
              <p className="text-sm text-muted-foreground mb-1">Éditeur: {book.publisher}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Date de publication: {formatDate(book.publish_date)}</p>
              <p className="text-sm text-muted-foreground mb-1">Catégorie: {book.category}</p>
              <p className="text-sm text-muted-foreground mb-1">Type: {book.printType}</p>
            </div>
          </div>
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Description:</h3>
            <p className="text-sm">{book.description}</p>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        {userRole === "admin" && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Ajouter des exemplaires
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter des exemplaires</DialogTitle>
                <DialogDescription>
                  Entrez le nombre d'exemplaires et leur état.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddCopies}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="numberOfCopies" className="text-right">
                      Nombre d'exemplaires
                    </Label>
                    <Input
                      id="numberOfCopies"
                      type="number"
                      className="col-span-3"
                      value={numberOfCopies}
                      onChange={(e) => setNumberOfCopies(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="copyState" className="text-right">
                      État de l'exemplaire
                    </Label>
                    <Select onValueChange={setCopyState}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Sélectionner un état" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Disponible</SelectItem>
                        <SelectItem value="borrowed">Emprunté</SelectItem>
                        <SelectItem value="damaged">Endommagé</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="secondary">
                      Annuler
                    </Button>
                  </DialogClose>
                  <Button type="submit">Ajouter</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <CopiesList bookId={bookId} />
      <ReviewsList bookId={bookId} />
    </div>
  );
};