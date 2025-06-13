"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import SearchBar from "./SearchBar";
import { Plus, Archive } from "lucide-react";

interface BooksFiltersProps {
  setSearchTerm: (term: string) => void;
  selectedCategory: string;
  setSelectedCategory: (value: string) => void;
  selectedAuthor: string;
  setSelectedAuthor: (value: string) => void;
  selectedPublisher: string;
  setSelectedPublisher: (value: string) => void;
  sortBy: "title" | "author" | "publisher" | "publish_date" | "category";
  setSortBy: (value: "title" | "author" | "publisher" | "publish_date" | "category") => void;
  sortOrder: "asc" | "desc";
  setSortOrder: (value: "asc" | "desc") => void;
  showArchivedOnly: boolean;
  setShowArchivedOnly: (value: boolean) => void;
  isAuthenticated: boolean;
  role: string | null;
  categories: string[];
  authors: string[];
  publishers: string[];
  setIsAddBookDialogOpen: (open: boolean) => void;
}

export const BooksFilters = ({
  setSearchTerm,
  selectedCategory,
  setSelectedCategory,
  selectedAuthor,
  setSelectedAuthor,
  selectedPublisher,
  setSelectedPublisher,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  showArchivedOnly,
  setShowArchivedOnly,
  isAuthenticated,
  role,
  categories,
  authors,
  publishers,
  setIsAddBookDialogOpen,
}: BooksFiltersProps) => {
  return (
    <div className="flex flex-col gap-4">
      <div className="w-full">
        <SearchBar onSearch={setSearchTerm} />
      </div>
      
      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <Label className="text-xs">Catégorie</Label>
          <Select
            value={selectedCategory}
            onValueChange={setSelectedCategory}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Toutes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs">Auteur</Label>
          <Select
            value={selectedAuthor}
            onValueChange={setSelectedAuthor}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Tous" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              {authors.map(au => (
                <SelectItem key={au} value={au}>
                  {au}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs">Éditeur</Label>
          <Select
            value={selectedPublisher}
            onValueChange={setSelectedPublisher}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Tous" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              {publishers.map(pub => (
                <SelectItem key={pub} value={pub}>
                  {pub}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs">Trier par</Label>
          <Select value={sortBy} onValueChange={val => setSortBy(val as any)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Trier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="title">Titre</SelectItem>
              <SelectItem value="author">Auteur</SelectItem>
              <SelectItem value="publisher">Éditeur</SelectItem>
              <SelectItem value="publish_date">Date publication</SelectItem>
              <SelectItem value="category">Catégorie</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs">Ordre</Label>
          <Select value={sortOrder} onValueChange={val => setSortOrder(val as any)}>
            <SelectTrigger className="w-30">
              <SelectValue placeholder="Ordre" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">Ascendant</SelectItem>
              <SelectItem value="desc">Descendant</SelectItem>
            </SelectContent>
          </Select>
        </div>

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
  );
};