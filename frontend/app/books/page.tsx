"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { BooksList } from "./components/BooksList";
import { BookDetails } from "./components/BookDetails";

function BooksContent() {
  const searchParams = useSearchParams();
  const bookId = searchParams.get("bookId");

  return (
    <>
      {bookId ? (
        <BookDetails bookId={bookId} />
      ) : (
        <BooksList />
      )}
    </>
  );
}

export default function BooksPage() {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <BooksContent />
    </Suspense>
  );
}