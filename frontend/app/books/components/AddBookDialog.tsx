"use client";

import { useState, useEffect, FormEvent } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useUserRole } from "@/app/hooks/useUserRole";
import { authFetch } from "@/app/utils/authFetch";

type AddBookDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

export const AddBookDialog = ({ isOpen, onOpenChange }: AddBookDialogProps) => {
  const role = useUserRole();
  const [importMode, setImportMode] = useState<"isbn" | "manual">("isbn");
  const [importError, setImportError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [manualQuantity, setManualQuantity] = useState<number>(1);
  const [copyStates, setCopyStates] = useState<string[]>(["new"]);
  const [prefilledIsbn, setPrefilledIsbn] = useState<string>("");
  const [showAutoSwitchMessage, setShowAutoSwitchMessage] = useState<boolean>(false);
  const router = useRouter();

  useEffect(() => {
    // S'assurer que la quantité est positive pour éviter les erreurs Array
    const validQuantity = Math.max(1, manualQuantity);
    setCopyStates(Array(validQuantity).fill("new"));
  }, [manualQuantity, importMode]);

  useEffect(() => {
    if (isOpen) {
      setImportError(null);
      setSuccessMessage(null);
      setIsLoading(false);
      setPrefilledIsbn("");
      setShowAutoSwitchMessage(false);
      setImportMode("isbn");
    }
  }, [isOpen]);

  if (role !== "admin") return null;

  const handleImportSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setImportError(null);
    setSuccessMessage(null);
    setShowAutoSwitchMessage(false);

    const formData = new FormData(e.currentTarget);
    const rawIsbn = formData.get("isbn") as string;

    // Nettoyer l'ISBN en supprimant les tirets, espaces et autres caractères non numériques (sauf X)
    const isbn = rawIsbn.replace(/[^0-9Xx]/g, "");

    // Validation côté frontend avant d'envoyer la requête
    if (!isbn || isbn.trim() === "") {
      setImportError("Veuillez saisir un ISBN valide.");
      setIsLoading(false);
      return;
    }

    // Vérifier le format ISBN (10 ou 13 chiffres, ou 9 chiffres + X pour ISBN-10)
    const isbnRegex = /^(?:\d{9}[xX]|\d{10}|\d{13})$/;
    if (!isbnRegex.test(isbn)) {
      setImportError("Format d'ISBN invalide. L'ISBN doit contenir 10 ou 13 chiffres (ou 9 chiffres + X pour ISBN-10).");
      setIsLoading(false);
      return;
    }

    const quantity = Number(formData.get("quantity"));
    const payload = { isbn, quantity, state: "new", copies: copyStates };

    try {
      const response = await authFetch("/api/books/import", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || "Erreur lors de l'import via ISBN");
      }

      setSuccessMessage("Le livre a été importé avec succès via ISBN !");

      // Fermer la dialog après 2 secondes pour laisser le temps de voir le message
      setTimeout(() => {
        onOpenChange(false);
        window.location.reload();
      }, 2000);

    } catch (error) {
      let errorMessage = "Erreur inconnue";

      if (error instanceof Error) {
        try {
          // Essayer de parser la réponse JSON du backend
          const errorData = JSON.parse(error.message);
          if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.details_error) {
            errorMessage = "Erreur lors du traitement de la demande";
          }
        } catch {
          // Si ce n'est pas du JSON, utiliser le message tel quel
          errorMessage = error.message;
        }
      }

      // Vérifier si c'est une erreur "Book not found on Google Books"
      if (errorMessage.includes("Book not found on Google Books") || errorMessage.includes("404")) {
        setPrefilledIsbn(rawIsbn);
        setImportMode("manual");
        setShowAutoSwitchMessage(true);
        setImportError(null);
      } else {
        // Traduire certains messages d'erreur courants
        if (errorMessage.includes("Invalid ISBN format")) {
          errorMessage = "Format d'ISBN invalide. Veuillez vérifier le numéro saisi.";
        } else if (errorMessage.includes("already exists")) {
          errorMessage = "Ce livre existe déjà dans la base de données.";
        } else if (errorMessage.includes("Error retrieving book information")) {
          errorMessage = "Erreur lors de la récupération des informations du livre.";
        }

        setImportError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setImportError(null);
    setSuccessMessage(null);

    const formData = new FormData(e.currentTarget);
    const bookData = {
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      printType: formData.get("printType") as string,
      category: formData.get("category") as string,
      publisher: formData.get("publisher") as string,
      author: formData.get("author") as string,
      quantity: Number(formData.get("quantity")),
      publish_date: formData.get("publish_date") as string,
      pages: Number(formData.get("pages")),
      language: formData.get("language") as string,
      ISBN_10: formData.get("ISBN_10") as string,
      ISBN_13: formData.get("ISBN_13") as string,
      image_link: formData.get("image_link") as string,
      copies: copyStates,
    };

    try {
      const response = await authFetch("/api/books/manual", {
        method: "POST",
        body: JSON.stringify(bookData),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || "Erreur lors de l'import manuel");
      }

      setSuccessMessage("Le livre a été ajouté avec succès !");

      // Fermer la dialog après 2 secondes pour laisser le temps de voir le message
      setTimeout(() => {
        onOpenChange(false);
        window.location.reload();
      }, 2000);

    } catch (error) {
      let errorMessage = "Erreur inconnue";

      if (error instanceof Error) {
        try {
          // Essayer de parser la réponse JSON du backend
          const errorData = JSON.parse(error.message);
          if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.details_error) {
            errorMessage = "Erreur lors du traitement de la demande";
          }
        } catch {
          // Si ce n'est pas du JSON, utiliser le message tel quel
          errorMessage = error.message;
        }
      }

      // Traduire certains messages d'erreur courants
      if (errorMessage.includes("Invalid ISBN format")) {
        errorMessage = "Format d'ISBN invalide. Veuillez vérifier le numéro saisi.";
      } else if (errorMessage.includes("already exists")) {
        errorMessage = "Ce livre existe déjà dans la base de données.";
      } else if (errorMessage.includes("Failed to insert book")) {
        errorMessage = "Erreur lors de l'ajout du livre dans la base de données.";
      } else if (errorMessage.includes("Error inserting copies")) {
        errorMessage = "Erreur lors de la création des exemplaires du livre.";
      }

      setImportError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className={importMode === "manual" ? "max-w-4xl w-full max-h-[90vh]" : ""}>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold mb-2">
            {importMode === "isbn" ? "Importer via ISBN" : "Import manuel"}
          </DialogTitle>
          {importError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              <p className="font-medium">Erreur</p>
              <p>{importError}</p>
            </div>
          )}
          {successMessage && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
              <p className="font-medium">Succès</p>
              <p>{successMessage}</p>
            </div>
          )}
          {showAutoSwitchMessage && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded mb-4">
              <p className="font-medium">Livre non trouvé</p>
              <p>Le livre n'a pas été trouvé sur Google Books. Vous avez été basculé vers l'import manuel avec l'ISBN prérempli.</p>
            </div>
          )}
        </DialogHeader>
        {importMode === "isbn" ? (
          <form onSubmit={handleImportSubmit} className="grid gap-4 py-4">
            <div className="flex flex-col">
              <Label htmlFor="isbn">ISBN</Label>
              <Input id="isbn" name="isbn" type="text" required />
            </div>
            <div className="flex flex-col">
              <Label htmlFor="quantity">Quantité</Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                required
                defaultValue={1}
                min={1}
                onChange={(e) => {
                  const qty = Number(e.target.value);
                  setManualQuantity(qty);
                }}
              />
            </div>
            <ScrollArea className="h-[300px] w-full rounded-md border p-4">
              {copyStates.map((copyState, index) => (
                <div key={index} className="flex flex-col mb-4">
                  <Label htmlFor={`copyState-${index}`}>État de la copie {index + 1}</Label>
                  <Select
                    value={copyStates[index]}
                    onValueChange={(value) => {
                      const newStates = [...copyStates];
                      newStates[index] = value;
                      setCopyStates(newStates);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un état" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">Neuf</SelectItem>
                      <SelectItem value="good">Bon état</SelectItem>
                      <SelectItem value="used">Usé</SelectItem>
                      <SelectItem value="damaged">Endommagé</SelectItem>
                      <SelectItem value="lost">Perdu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </ScrollArea>
            <div className="flex gap-2">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Import en cours..." : "Importer via ISBN"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setImportMode("manual");
                  setImportError(null);
                  setSuccessMessage(null);
                }}
                disabled={isLoading}
              >
                Import manuel
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto max-h-[50vh]">
              <form id="manual-form" onSubmit={handleManualSubmit} className="grid gap-4 py-4">
                <div className="flex flex-col">
                  <Label htmlFor="title">Titre</Label>
                  <Input id="title" name="title" type="text" required />
                </div>
                <div className="flex flex-col">
                  <Label htmlFor="author">Auteur</Label>
                  <Input id="author" name="author" type="text" required />
                </div>
                <div className="flex flex-col">
                  <Label htmlFor="description">Description</Label>
                  <Input id="description" name="description" type="text" required />
                </div>
                <div className="flex flex-col">
                  <Label htmlFor="printType">Type d'impression</Label>
                  <Input id="printType" name="printType" type="text" required />
                </div>
                <div className="flex flex-col">
                  <Label htmlFor="category">Catégorie</Label>
                  <Input id="category" name="category" type="text" required />
                </div>
                <div className="flex flex-col">
                  <Label htmlFor="publisher">Éditeur</Label>
                  <Input id="publisher" name="publisher" type="text" required />
                </div>
                <div className="flex flex-col">
                  <Label htmlFor="pages">Nombre de pages</Label>
                  <Input id="pages" name="pages" type="number" required min={1} />
                </div>
                <div className="flex flex-col">
                  <Label htmlFor="language">Langue</Label>
                  <Input id="language" name="language" type="text" required />
                </div>
                <div className="flex flex-col">
                  <Label htmlFor="publish_date">Date de publication</Label>
                  <Input id="publish_date" name="publish_date" type="date" required />
                </div>
                <div className="flex flex-col">
                  <Label htmlFor="ISBN_10">ISBN-10 (optionnel)</Label>
                  <Input
                    id="ISBN_10"
                    name="ISBN_10"
                    type="text"
                    defaultValue={prefilledIsbn && prefilledIsbn.length === 10 ? prefilledIsbn : ""}
                  />
                </div>
                <div className="flex flex-col">
                  <Label htmlFor="ISBN_13">ISBN-13 (optionnel)</Label>
                  <Input
                    id="ISBN_13"
                    name="ISBN_13"
                    type="text"
                    defaultValue={prefilledIsbn && prefilledIsbn.length === 13 ? prefilledIsbn : ""}
                  />
                </div>
                <div className="flex flex-col">
                  <Label htmlFor="image_link">Lien de l'image (optionnel)</Label>
                  <Input id="image_link" name="image_link" type="text" />
                </div>
                <div className="flex flex-col">
                  <Label htmlFor="quantity">Quantité</Label>
                  <Input
                    id="quantity"
                    name="quantity"
                    type="number"
                    required
                    defaultValue={1}
                    min={1}
                    onChange={(e) => {
                      const qty = Number(e.target.value);
                      setManualQuantity(qty);
                    }}
                  />
                </div>
                {copyStates.map((copyState, index) => (
                  <div key={index} className="flex flex-col">
                    <Label htmlFor={`copyState-${index}`}>État de la copie {index + 1}</Label>
                    <Select
                      value={copyStates[index]}
                      onValueChange={(value) => {
                        const newStates = [...copyStates];
                        newStates[index] = value;
                        setCopyStates(newStates);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un état" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">Neuf</SelectItem>
                        <SelectItem value="good">Bon état</SelectItem>
                        <SelectItem value="used">Usé</SelectItem>
                        <SelectItem value="damaged">Endommagé</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </form>
            </div>
            <div className="flex gap-2 pt-4 mt-4 border-t">
              <Button type="submit" form="manual-form" disabled={isLoading}>
                {isLoading ? "Ajout en cours..." : "Ajouter le livre"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setImportMode("isbn");
                  setImportError(null);
                  setSuccessMessage(null);
                  setShowAutoSwitchMessage(false);
                  setPrefilledIsbn("");
                }}
                disabled={isLoading}
              >
                Retour
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
