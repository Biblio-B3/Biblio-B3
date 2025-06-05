"use client";

import { useState, useEffect } from "react";
import { BookCard } from "./BookCard";
import { Button } from "@/components/ui/button";
import { Book, Pagination } from "./types";
import { Plus, Archive } from "lucide-react";
import { AddBookDialog } from "./AddBookDialog";
import { useApiErrorHandler } from "@/app/components/DisconnectAfterRevocation";
import { isClient, getLocalStorageItem } from "@/app/utils/isClient";
import { useSearchParams } from "next/navigation";
import SearchBar from "./SearchBar";
import { useUserRole } from "@/app/hooks/useUserRole"; // ✅ import du hook

export const BooksList = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  const [isAddBookDialogOpen, setIsAddBookDialogOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showArchivedOnly, setShowArchivedOnly] = useState(false);
  const searchParams = useSearchParams();
  const role = useUserRole();

  const itemsPerPage = 30;

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, showArchivedOnly]);

  useEffect(() => {
    if (!isClient) return;
    
    const token = getLocalStorageItem("auth_token");
    setIsAuthenticated(!!token);
  }, []);

  const fetchBooks = async () => {
    const isSearching = debouncedSearchTerm.trim().length > 0;

    const baseUrl = isSearching
      ? `/api/books/search/?title=${encodeURIComponent(debouncedSearchTerm)}&page=${currentPage}&itemsPerPage=${itemsPerPage}`
      : `/api/books?page=${currentPage}&itemsPerPage=${itemsPerPage}`;
    
    const url = showArchivedOnly ? `${baseUrl}&is_removed=true` : baseUrl;

    console.log("📡 URL appelée depuis le frontend :", url);

    try {
      // Utiliser authFetch pour les requêtes GET (pas besoin d'authentification)
      const response = await fetch(url);

      const data = await response.json();

      if (response.ok) {
        setBooks(data.data);
        setPagination(data.pagination);
      } else {
        console.error("Erreur API :", data.message);
        setBooks([]);
        setPagination(null);
      }
    } catch (error) {
      console.error("Erreur lors du fetch des livres :", error);
      setBooks([]);
      setPagination(null);
    }
  };

  useEffect(() => {
    if (!searchParams.get("bookId")) {
      fetchBooks();
      document.body.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [debouncedSearchTerm, currentPage, showArchivedOnly]);

  if (searchParams.get("bookId")) return null;

  return (
    <>
      <div className="container mx-auto py-6">
        <div className="flex justify-between mb-4">
          <SearchBar onSearch={setSearchTerm} />
          <div className="flex gap-2">
            {isAuthenticated && role === "admin" && (
              <>
                <Button
                  variant={showArchivedOnly ? "default" : "outline"}
                  onClick={() => setShowArchivedOnly(!showArchivedOnly)}
                  className="w-40"
                >
                  <Archive className="mr-2 h-4 w-4" />
                  {showArchivedOnly ? "Tous les livres" : "Livres archivés"}
                </Button>
                <Button onClick={() => setIsAddBookDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Ajouter un livre
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {books.length > 0 ? (
            books.map((book) => <BookCard key={book.id} book={book} />)
          ) : (
            <p className="col-span-full text-center text-gray-500">Aucun livre trouvé.</p>
          )}
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
      </div>

      {isAuthenticated && role === "admin" && (
        <AddBookDialog
          isOpen={isAddBookDialogOpen}
          onOpenChange={setIsAddBookDialogOpen}
        />
      )}
    </>
  );
};
