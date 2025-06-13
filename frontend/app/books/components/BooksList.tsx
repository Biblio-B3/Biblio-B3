"use client";

import { useState, useEffect, useCallback } from "react";
import { BookCard } from "./BookCard";
import { Button } from "@/components/ui/button";
import { Book, Pagination } from "./types";
import { AddBookDialog } from "./AddBookDialog";
import { authFetch } from "@/app/utils/authFetch";
import { isClient, getLocalStorageItem } from "@/app/utils/isClient";
import { useSearchParams } from "next/navigation";
import { useUserRole } from "@/app/hooks/useUserRole";
import { BooksFilters } from "./BooksFilters";

export const BooksList = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  const [isAddBookDialogOpen, setIsAddBookDialogOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showArchivedOnly, setShowArchivedOnly] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [pendingScrollRestore, setPendingScrollRestore] = useState<number | null>(null);

  const searchParams = useSearchParams();
  const role = useUserRole();

  const itemsPerPage = 30;

  // États pour filtres additionnels, initialisés à "all"
  const [categories, setCategories] = useState<string[]>([]);
  const [authors, setAuthors] = useState<string[]>([]);
  const [publishers, setPublishers] = useState<string[]>([]);

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedAuthor, setSelectedAuthor] = useState<string>("all");
  const [selectedPublisher, setSelectedPublisher] = useState<string>("all");

  const [sortBy, setSortBy] = useState<"title" | "author" | "publisher" | "publish_date" | "category">("title");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Initialisation : auth + restauration d'état
  useEffect(() => {
    if (!isClient) return;
    const token = getLocalStorageItem("auth_token");
    setIsAuthenticated(!!token);

    const savedState = sessionStorage.getItem("booksListState");
    if (savedState) {
      try {
        const {
          page,
          scrollPosition,
          searchTerm: savedSearchTerm,
          showArchived,
          selectedCategory: savedCategory,
          selectedAuthor: savedAuthor,
          selectedPublisher: savedPublisher,
          sortBy: savedSortBy,
          sortOrder: savedSortOrder,
        } = JSON.parse(savedState);

        if (typeof page === "number") setCurrentPage(page);
        if (typeof savedSearchTerm === "string") {
          setSearchTerm(savedSearchTerm);
          setDebouncedSearchTerm(savedSearchTerm);
        }
        if (typeof showArchived === "boolean") setShowArchivedOnly(showArchived);
        if (typeof savedCategory === "string") setSelectedCategory(savedCategory);
        if (typeof savedAuthor === "string") setSelectedAuthor(savedAuthor);
        if (typeof savedPublisher === "string") setSelectedPublisher(savedPublisher);
        if (["title", "author", "publisher", "publish_date", "category"].includes(savedSortBy)) {
          setSortBy(savedSortBy as typeof sortBy);
        }
        if (savedSortOrder === "asc" || savedSortOrder === "desc") {
          setSortOrder(savedSortOrder);
        }
        setPendingScrollRestore(scrollPosition);
      } catch (e) {
        console.error("Erreur lors de la restauration de l'état:", e);
        sessionStorage.removeItem("booksListState");
      }
    }
    setIsInitialized(true);
  }, []);

  // Debounce searchTerm
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Quand searchTerm ou filtres changent, reset page à 1
  useEffect(() => {
    if (isInitialized) {
      setCurrentPage(1);
    }
  }, [
    debouncedSearchTerm,
    showArchivedOnly,
    selectedCategory,
    selectedAuthor,
    selectedPublisher,
    sortBy,
    sortOrder,
    isInitialized,
  ]);

  // Sauvegarde d'état dans sessionStorage
  const saveCurrentState = useCallback(() => {
    if (!isClient) return;
    const mainElement = document.querySelector("main");
    const scrollPosition = mainElement?.scrollTop || 0;
    const state = {
      page: currentPage,
      scrollPosition,
      searchTerm,
      showArchived: showArchivedOnly,
      selectedCategory,
      selectedAuthor,
      selectedPublisher,
      sortBy,
      sortOrder,
    };
    sessionStorage.setItem("booksListState", JSON.stringify(state));
  }, [
    currentPage,
    searchTerm,
    showArchivedOnly,
    selectedCategory,
    selectedAuthor,
    selectedPublisher,
    sortBy,
    sortOrder,
  ]);

  useEffect(() => {
    if (isInitialized) {
      saveCurrentState();
    }
  }, [saveCurrentState, isInitialized]);

  // Sauvegarde scroll périodique
  useEffect(() => {
    if (!isInitialized) return;
    const saveScrollPosition = () => {
      const mainElement = document.querySelector("main");
      const scrollPosition = mainElement?.scrollTop || 0;
      const existingState = sessionStorage.getItem("booksListState");
      if (existingState) {
        try {
          const state = JSON.parse(existingState);
          state.scrollPosition = scrollPosition;
          sessionStorage.setItem("booksListState", JSON.stringify(state));
        } catch (e) {
          console.error("Erreur lors de la sauvegarde du scroll:", e);
        }
      }
    };
    const interval = setInterval(saveScrollPosition, 1000);
    return () => clearInterval(interval);
  }, [isInitialized]);

  const handleBookUpdated = (updatedBook: Book) => {
    setBooks(prevBooks =>
      prevBooks.map(book =>
        book.id === updatedBook.id ? updatedBook : book
      )
    );
  };

  // Charger listes de filtres (catégories, auteurs, éditeurs)
  useEffect(() => {
    const fetchFilterLists = async () => {
      try {
        const [catRes, authRes, pubRes] = await Promise.all([
          authFetch("/api/books/categories"),
          authFetch("/api/books/authors"),
          authFetch("/api/books/publishers"),
        ]);
        if (catRes.ok) {
          const arr: string[] = await catRes.json();
          setCategories(arr);
        } else {
          console.error("Erreur chargement catégories");
        }
        if (authRes.ok) {
          const arr: string[] = await authRes.json();
          setAuthors(arr);
        } else {
          console.error("Erreur chargement auteurs");
        }
        if (pubRes.ok) {
          const arr: string[] = await pubRes.json();
          setPublishers(arr);
        } else {
          console.error("Erreur chargement éditeurs");
        }
      } catch (e) {
        console.error("Erreur fetch filtres:", e);
      }
    };
    fetchFilterLists();
  }, []);

  // Fonction fetchBooks avec tous paramètres (sans dates)
  const fetchBooks = useCallback(async () => {
    if (searchParams.get("bookId")) return;

    const params = new URLSearchParams();
    if (debouncedSearchTerm.trim()) {
      params.append("title", debouncedSearchTerm.trim());
    }
    if (selectedAuthor !== "all") {
      params.append("author", selectedAuthor);
    }
    if (selectedCategory !== "all") {
      params.append("category", selectedCategory);
    }
    if (selectedPublisher !== "all") {
      params.append("publisher", selectedPublisher);
    }
    params.append("page", currentPage.toString());
    params.append("itemsPerPage", itemsPerPage.toString());
    params.append("sortBy", sortBy);
    params.append("sortOrder", sortOrder);
    params.append("is_removed", showArchivedOnly ? "true" : "false");

    const url = `/api/books/search?${params.toString()}`;
    try {
      const response = await authFetch(url);
      const data = await response.json();
      if (response.ok) {
        setBooks(data.data);
        setPagination(data.pagination);
      } else {
        console.error("Erreur API search:", data);
        setBooks([]);
        setPagination(null);
      }
    } catch (e) {
      console.error("Erreur lors du fetch des livres :", e);
      setBooks([]);
      setPagination(null);
    }
  }, [
    debouncedSearchTerm,
    selectedAuthor,
    selectedCategory,
    selectedPublisher,
    currentPage,
    showArchivedOnly,
    sortBy,
    sortOrder,
    searchParams,
  ]);

  // Restaurer scroll après chargement
  useEffect(() => {
    if (books.length > 0 && pendingScrollRestore !== null) {
      const mainElement = document.querySelector("main");
      if (mainElement) {
        mainElement.scrollTop = pendingScrollRestore;
      }
      setPendingScrollRestore(null);
    }
  }, [books, pendingScrollRestore]);

  // Effet principal fetch
  useEffect(() => {
    if (isInitialized) {
      fetchBooks();
      if (pendingScrollRestore === null && !searchParams.get("bookId")) {
        const mainElement = document.querySelector("main");
        if (mainElement) {
          mainElement.scrollTop = 0;
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }
    }
  }, [fetchBooks, isInitialized, pendingScrollRestore, searchParams]);

  if (searchParams.get("bookId")) {
    return null;
  }

  return (
    <>
      <div className="container mx-auto py-6 space-y-4">
        {/* Pagination en haut */}
        {pagination && pagination.totalPages > 1 && currentPage > 1 && (
          <div className="flex justify-center items-center gap-4">
            <Button
              variant="outline"
              disabled={!pagination.hasPreviousPage}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            >
              Précédent
            </Button>
            <span>
              Page {pagination.page} sur {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              disabled={!pagination.hasNextPage}
              onClick={() => setCurrentPage(prev => prev + 1)}
            >
              Suivant
            </Button>
          </div>
        )}

        {/* Barre de recherche et filtres */}
        <BooksFilters
          setSearchTerm={setSearchTerm}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          selectedAuthor={selectedAuthor}
          setSelectedAuthor={setSelectedAuthor}
          selectedPublisher={selectedPublisher}
          setSelectedPublisher={setSelectedPublisher}
          sortBy={sortBy}
          setSortBy={setSortBy}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
          showArchivedOnly={showArchivedOnly}
          setShowArchivedOnly={setShowArchivedOnly}
          isAuthenticated={isAuthenticated}
          role={role}
          categories={categories}
          authors={authors}
          publishers={publishers}
          setIsAddBookDialogOpen={setIsAddBookDialogOpen}
        />

        {/* Grille de livres */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {books.length > 0 ? (
            books.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                onNavigate={saveCurrentState}
                onBookUpdated={handleBookUpdated}
              />
            ))
          ) : (
            <p className="col-span-full text-center text-gray-500">Aucun livre trouvé.</p>
          )}
        </div>

        {/* Pagination en bas */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex justify-center items-center mt-6 gap-4">
            <Button
              variant="outline"
              disabled={!pagination.hasPreviousPage}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            >
              Précédent
            </Button>
            <span>
              Page {pagination.page} sur {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              disabled={!pagination.hasNextPage}
              onClick={() => setCurrentPage(prev => prev + 1)}
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
