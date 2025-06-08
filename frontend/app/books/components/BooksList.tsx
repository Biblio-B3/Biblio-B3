"use client";

import { useState, useEffect } from "react";
import { BookCard } from "./BookCard";
import { Button } from "@/components/ui/button";
import { Book, Pagination } from "./types";
import { Plus, Archive } from "lucide-react";
import { AddBookDialog } from "./AddBookDialog";
import { authFetch } from "@/app/utils/authFetch";
import { isClient, getLocalStorageItem } from "@/app/utils/isClient";
import { useSearchParams } from "next/navigation";
import SearchBar from "./SearchBar";
import { useUserRole } from "@/app/hooks/useUserRole";

export const BooksList = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  const [isAddBookDialogOpen, setIsAddBookDialogOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showArchivedOnly, setShowArchivedOnly] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [pendingScrollRestore, setPendingScrollRestore] = useState<number | null>(null);
  const searchParams = useSearchParams();
  const role = useUserRole();

  const itemsPerPage = 30;

  // Initialisation
  useEffect(() => {
    if (!isClient) return;
    
    const token = getLocalStorageItem("auth_token");
    setIsAuthenticated(!!token);

    // Restaurer l'état sauvegardé au retour des détails ou au refresh
    const savedState = sessionStorage.getItem("booksListState");
    
    if (savedState) {
      try {
        const { page, scrollPosition, searchTerm: savedSearchTerm, showArchived } = JSON.parse(savedState);
        
        setCurrentPage(page);
        setSearchTerm(savedSearchTerm);
        setDebouncedSearchTerm(savedSearchTerm);
        setShowArchivedOnly(showArchived);
        
        // Marquer qu'on doit restaurer le scroll une fois les livres chargés
        setPendingScrollRestore(scrollPosition);
      } catch (error) {
        console.error("Erreur lors de la restauration de l'état:", error);
        sessionStorage.removeItem("booksListState");
      }
    }
    
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    if (isInitialized) {
      setCurrentPage(1);
    }
  }, [searchTerm, showArchivedOnly]);

  // Sauvegarder l'état en continu
  const saveCurrentState = () => {
    if (!isClient) return;
    
    // Le scroll se fait sur l'élément main
    const mainElement = document.querySelector('main');
    const scrollPosition = mainElement?.scrollTop || 0;
    
    const state = {
      page: currentPage,
      scrollPosition,
      searchTerm,
      showArchived: showArchivedOnly
    };
    sessionStorage.setItem("booksListState", JSON.stringify(state));
  };

  // Sauvegarder l'état automatiquement quand il change
  useEffect(() => {
    if (isInitialized) {
      saveCurrentState();
    }
  }, [currentPage, searchTerm, showArchivedOnly, isInitialized]);

  // Sauvegarder la position de scroll périodiquement
  useEffect(() => {
    if (!isInitialized) return;

    const saveScrollPosition = () => {
      const mainElement = document.querySelector('main');
      const scrollPosition = mainElement?.scrollTop || 0;
      
      const existingState = sessionStorage.getItem("booksListState");
      if (existingState) {
        try {
          const state = JSON.parse(existingState);
          state.scrollPosition = scrollPosition;
          sessionStorage.setItem("booksListState", JSON.stringify(state));
        } catch (error) {
          console.error("Erreur lors de la sauvegarde du scroll:", error);
        }
      }
    };

    const interval = setInterval(saveScrollPosition, 1000); // Sauvegarder toutes les secondes
    return () => clearInterval(interval);
  }, [isInitialized]);

  const fetchBooks = async () => {
    const isSearching = debouncedSearchTerm.trim().length > 0;

    const baseUrl = isSearching
      ? `/api/books/search/?title=${encodeURIComponent(debouncedSearchTerm)}&page=${currentPage}&itemsPerPage=${itemsPerPage}`
      : `/api/books?page=${currentPage}&itemsPerPage=${itemsPerPage}`;
    
    const url = showArchivedOnly ? `${baseUrl}&is_removed=true` : baseUrl;

    try {
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

  // Restaurer le scroll une fois que les livres sont affichés
  useEffect(() => {
    if (books.length > 0 && pendingScrollRestore !== null) {
      const mainElement = document.querySelector('main');
      if (mainElement) {
        mainElement.scrollTop = pendingScrollRestore;
      }
      setPendingScrollRestore(null);
    }
  }, [books, pendingScrollRestore]);

  useEffect(() => {
    if (!searchParams.get("bookId") && isInitialized) {
      fetchBooks();
      
      // Vérifier si on doit restaurer le scroll (pas de scroll automatique si on restaure)
      if (pendingScrollRestore === null) {
        const mainElement = document.querySelector('main');
        if (mainElement) {
          mainElement.scrollTop = 0;
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }
    }
  }, [debouncedSearchTerm, currentPage, showArchivedOnly, isInitialized]);

  if (searchParams.get("bookId")) return null;

  return (
    <>
      <div className="container mx-auto py-6">
        {/* Navigation en haut si page > 1 */}
        {pagination && pagination.totalPages > 1 && currentPage > 1 && (
          <div className="flex justify-center items-center mb-6 gap-4">
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
            books.map((book) => <BookCard key={book.id} book={book} onNavigate={saveCurrentState} />)
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
