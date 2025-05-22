"use client";

import { useState, useEffect } from "react";
import { Book } from "./types";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { CopiesList } from "./CopiesList";
import { ReviewsList } from "./ReviewsList";
import { useApiErrorHandler } from "@/app/components/DisconnectAfterRevocation";
import { authFetch } from "@/app/utils/authFetch";

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
  const fetchWithAuth = useApiErrorHandler();
  const userRole = useUserRole();
  const [numberOfCopies, setNumberOfCopies] = useState("");
  const [copyState, setCopyState] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleAddCopies = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!book || !copyState || !numberOfCopies) return;

    try {
      for (let i = 0; i < parseInt(numberOfCopies); i++) {
        await fetchWithAuth("/api/copy", {
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
          setError("Erreur lors de la r\u00e9cup\u00e9ration des d\u00e9tails du livre");
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
  }, [bookId, fetchWithAuth, dataFetched]);

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
          Livre non trouv\u00e9
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <Button
        variant="ghost"
        className="mb-4 flex items-center"
        onClick={() => router.push("/books")}
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
              <>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteBook}
                  className="ml-2"
                >
                  Supprimer le livre
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleArchiveBook}
                  className="ml-2"
                >
                  Archiver le livre
                </Button>
              </>
            )}
          </div>
          <p className="text-lg text-muted-foreground mb-4">par {book.author}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">ISBN-10: {book.ISBN_10 || "N/A"}</p>
              <p className="text-sm text-muted-foreground mb-1">ISBN-13: {book.ISBN_13 || "N/A"}</p>
              <p className="text-sm text-muted-foreground mb-1">\u00c9diteur: {book.publisher}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Date de publication: {formatDate(book.publish_date)}</p>
              <p className="text-sm text-muted-foreground mb-1">Cat\u00e9gorie: {book.category}</p>
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
        <h2 className="text-xl font-semibold">Exemplaires disponibles</h2>
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
                  Entrez le nombre d'exemplaires et leur \u00e9tat.
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
                      \u00c9tat de l'exemplaire
                    </Label>
                    <Select onValueChange={setCopyState}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="S\u00e9lectionner un \u00e9tat" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Disponible</SelectItem>
                        <SelectItem value="borrowed">Emprunt\u00e9</SelectItem>
                        <SelectItem value="damaged">Endommag\u00e9</SelectItem>
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