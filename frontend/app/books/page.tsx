"use client";

import { Suspense } from "react";
import Head from "next/head";
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
    <>
      <Head>
        <title>Catalogue des livres</title>
        <meta name="description" content="Parcourez notre catalogue complet de livres disponibles" />
        <meta property="og:title" content="Catalogue des livres" />
        <meta property="og:description" content="Parcourez notre catalogue complet de livres disponibles" />
        <meta property="og:url" content="/books" />
        <meta property="og:type" content="website" />
      </Head>
      <Suspense fallback={<div>Chargement...</div>}>
        <BooksContent />
      </Suspense>
    </>
  );
}