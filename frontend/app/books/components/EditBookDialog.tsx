"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useUserRole } from "@/app/hooks/useUserRole";
import { authFetch } from "@/app/utils/authFetch";
import { Book } from "./types";
import Image from "next/image";

type EditBookDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  book: Book;
  onBookUpdated?: (updatedBook: Book) => void;
};

export const EditBookDialog = ({ isOpen, onOpenChange, book, onBookUpdated }: EditBookDialogProps) => {
  const role = useUserRole();
  const [editError, setEditError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageWarning, setImageWarning] = useState<string | null>(null);
  const [processingMessage, setProcessingMessage] = useState<string | null>(null);
  const [closeTimeoutId, setCloseTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const router = useRouter();

  // Limite de taille d'image en MB
  const MAX_IMAGE_SIZE_MB = 5;
  const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

  // États pour les champs du formulaire
  const [formData, setFormData] = useState({
    title: book.title,
    author: book.author,
    description: book.description,
    printType: book.printType,
    category: book.category,
    publisher: book.publisher,
    pageCount: book.pageCount,
    language: book.language,
    publish_date: book.publish_date ? new Date(book.publish_date).toISOString().split('T')[0] : '',
    ISBN_10: book.ISBN_10 || '',
    ISBN_13: book.ISBN_13 || '',
    image_link: book.image_link || '',
  });

  useEffect(() => {
    if (isOpen) {
      // Nettoyer le timeout précédent si il existe
      if (closeTimeoutId) {
        clearTimeout(closeTimeoutId);
        setCloseTimeoutId(null);
      }
      
      setEditError(null);
      setSuccessMessage(null);
      setIsLoading(false);
      setImageFile(null);
      setImagePreview(null);
      setImageWarning(null);
      setProcessingMessage(null);
      // Réinitialiser le formulaire avec les données du livre
      setFormData({
        title: book.title,
        author: book.author,
        description: book.description,
        printType: book.printType,
        category: book.category,
        publisher: book.publisher,
        pageCount: book.pageCount,
        language: book.language,
        publish_date: book.publish_date ? new Date(book.publish_date).toISOString().split('T')[0] : '',
        ISBN_10: book.ISBN_10 || '',
        ISBN_13: book.ISBN_13 || '',
        image_link: book.image_link || '',
      });
    }
    
    // Nettoyer le timeout au démontage du composant
    return () => {
      if (closeTimeoutId) {
        clearTimeout(closeTimeoutId);
      }
    };
  }, [isOpen, book, closeTimeoutId]);

  if (role !== "admin") return null;

  const getErrorMessage = (error: any): string => {
    // Si c'est une erreur réseau
    if (!navigator.onLine) {
      return "Aucune connexion internet. Veuillez vérifier votre connexion.";
    }

    // Essayer de parser l'erreur du backend
    let backendError = null;
    try {
      if (typeof error === 'string') {
        backendError = JSON.parse(error);
      } else if (error?.message) {
        backendError = JSON.parse(error.message);
      }
    } catch {
      // Pas une erreur JSON du backend
    }

    // Mapper les erreurs selon le code de statut HTTP ou le type d'erreur
    if (backendError?.status === 400 || error?.message?.includes('400')) {
      return "Les données saisies sont invalides. Veuillez vérifier tous les champs obligatoires.";
    }
    
    if (backendError?.status === 401 || error?.message?.includes('401') || error?.message?.includes('Unauthorized')) {
      return "Votre session a expiré. Veuillez vous reconnecter.";
    }
    
    if (backendError?.status === 403 || error?.message?.includes('403') || error?.message?.includes('Forbidden')) {
      return "Vous n'avez pas les permissions nécessaires pour modifier ce livre.";
    }
    
    if (backendError?.status === 404 || error?.message?.includes('404') || error?.message?.includes('not found')) {
      return "Le livre que vous tentez de modifier n'existe plus.";
    }
    
    if (backendError?.status === 413 || error?.message?.includes('too large') || error?.message?.includes('413')) {
      return "L'image sélectionnée est trop volumineuse. Veuillez choisir une image plus petite.";
    }
    
    if (backendError?.status === 422 || error?.message?.includes('422')) {
      return "Les données fournies ne respectent pas le format attendu.";
    }
    
    if (backendError?.status >= 500 || error?.message?.includes('500') || error?.message?.includes('Internal Server Error')) {
      return "Une erreur technique s'est produite sur le serveur. Veuillez réessayer dans quelques instants.";
    }
    
    // Erreurs spécifiques aux champs
    if (error?.message?.includes('title')) {
      return "Le titre du livre est requis et ne peut pas être vide.";
    }
    
    if (error?.message?.includes('author')) {
      return "L'auteur du livre est requis et ne peut pas être vide.";
    }
    
    if (error?.message?.includes('ISBN')) {
      return "Le format de l'ISBN saisi n'est pas valide.";
    }
    
    // Erreurs de connexion
    if (error?.message?.includes('fetch') || error?.message?.includes('Network')) {
      return "Impossible de contacter le serveur. Vérifiez votre connexion internet.";
    }
    
    if (error?.message?.includes('timeout')) {
      return "La requête a pris trop de temps. Veuillez réessayer.";
    }
    
    // Message par défaut pour les erreurs non identifiées
    return "Une erreur inattendue s'est produite lors de la modification du livre. Veuillez réessayer.";
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Vérifier la taille du fichier
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        setImageWarning(`L'image est trop volumineuse (${(file.size / 1024 / 1024).toFixed(1)} MB). La taille maximale autorisée est de ${MAX_IMAGE_SIZE_MB} MB. L'image sera automatiquement compressée.`);
      } else {
        setImageWarning(null);
      }

      // Vérifier le type de fichier
      if (!file.type.startsWith('image/')) {
        setEditError("Veuillez sélectionner un fichier image valide.");
        return;
      }

      setImageFile(file);
      
      // Créer un aperçu de l'image
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const compressAndConvertImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = document.createElement('img') as HTMLImageElement;
      
      img.onload = () => {
        // Définir les dimensions maximales
        const maxWidth = 800;
        const maxHeight = 1200;
        
        let { width, height } = img;
        
        // Calculer les nouvelles dimensions en gardant le ratio
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Dessiner l'image redimensionnée
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Convertir en base64 avec compression JPEG
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        const base64 = compressedDataUrl.split(',')[1];
        resolve(base64);
      };
      
      img.onerror = reject;
      
      // Créer une URL pour l'image
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleEditSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setEditError(null);
    setSuccessMessage(null);
    setProcessingMessage(null);

    try {
      // Préparer les données pour l'API
      let imageBase64 = formData.image_link;
      
      // Si une nouvelle image a été sélectionnée, la convertir en base64
      if (imageFile) {
        imageBase64 = await compressAndConvertImage(imageFile);
      }

      const updateData = {
        title: formData.title,
        author: formData.author,
        description: formData.description,
        printType: formData.printType,
        category: formData.category,
        publisher: formData.publisher,
        pageCount: Number(formData.pageCount),
        language: formData.language,
        publish_date: formData.publish_date,
        ISBN_10: formData.ISBN_10 || null,
        ISBN_13: formData.ISBN_13 || null,
        image_link: imageBase64 || null,
      };

      const response = await authFetch(`/api/books/${book.id}`, {
        method: "PUT",
        body: JSON.stringify(updateData),
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || "Erreur lors de la modification du livre");
      }
      
      const updatedBook = await response.json();
      
      // Arrêter le loading d'abord pour que l'interface se mette à jour
      setIsLoading(false);
      
      // Notifier le parent de la mise à jour
      if (onBookUpdated) {
        onBookUpdated(updatedBook);
      }
      
      // Attendre un peu pour que l'interface se mette à jour, puis afficher le message
      setTimeout(() => {
        setSuccessMessage("Le livre a été modifié avec succès !");
        
        // Fermer la dialog après 2 secondes
        setTimeout(() => {
          setSuccessMessage(null);
          onOpenChange(false);
          router.refresh();
        }, 2000);
      }, 100);
      
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      setEditError(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold mb-2">
            Modifier le livre: {book.title}
          </DialogTitle>
          {editError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              <p className="font-medium">Erreur</p>
              <p>{editError}</p>
            </div>
          )}
        </DialogHeader>
        
        {imageWarning && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded mb-4">
            <p className="font-medium">Avertissement</p>
            <p>{imageWarning}</p>
          </div>
        )}
        
        {processingMessage && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded mb-4">
            <p className="font-medium">Traitement en cours</p>
            <p>{processingMessage}</p>
          </div>
        )}
        
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto max-h-[60vh]">
            <form id="edit-form" onSubmit={handleEditSubmit} className="grid gap-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <Label htmlFor="title">Titre *</Label>
                  <Input 
                    id="title" 
                    name="title" 
                    type="text" 
                    required 
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                  />
                </div>
                <div className="flex flex-col">
                  <Label htmlFor="author">Auteur *</Label>
                  <Input 
                    id="author" 
                    name="author" 
                    type="text" 
                    required 
                    value={formData.author}
                    onChange={(e) => handleInputChange('author', e.target.value)}
                  />
                </div>
              </div>
              
              <div className="flex flex-col">
                <Label htmlFor="description">Description *</Label>
                <Textarea 
                  id="description" 
                  name="description" 
                  required 
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <Label htmlFor="printType">Type d'impression *</Label>
                  <Input 
                    id="printType" 
                    name="printType" 
                    type="text" 
                    required 
                    value={formData.printType}
                    onChange={(e) => handleInputChange('printType', e.target.value)}
                  />
                </div>
                <div className="flex flex-col">
                  <Label htmlFor="category">Catégorie *</Label>
                  <Input 
                    id="category" 
                    name="category" 
                    type="text" 
                    required 
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <Label htmlFor="publisher">Éditeur *</Label>
                  <Input 
                    id="publisher" 
                    name="publisher" 
                    type="text" 
                    required 
                    value={formData.publisher}
                    onChange={(e) => handleInputChange('publisher', e.target.value)}
                  />
                </div>
                <div className="flex flex-col">
                  <Label htmlFor="language">Langue *</Label>
                  <Input 
                    id="language" 
                    name="language" 
                    type="text" 
                    required 
                    value={formData.language}
                    onChange={(e) => handleInputChange('language', e.target.value)}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <Label htmlFor="pageCount">Nombre de pages *</Label>
                  <Input 
                    id="pageCount" 
                    name="pageCount" 
                    type="number" 
                    required 
                    min={1} 
                    value={formData.pageCount}
                    onChange={(e) => handleInputChange('pageCount', Number(e.target.value))}
                  />
                </div>
                <div className="flex flex-col">
                  <Label htmlFor="publish_date">Date de publication *</Label>
                  <Input 
                    id="publish_date" 
                    name="publish_date" 
                    type="date" 
                    required 
                    value={formData.publish_date}
                    onChange={(e) => handleInputChange('publish_date', e.target.value)}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <Label htmlFor="ISBN_10">ISBN-10</Label>
                  <Input
                    id="ISBN_10"
                    name="ISBN_10"
                    type="text"
                    value={formData.ISBN_10}
                    onChange={(e) => handleInputChange('ISBN_10', e.target.value)}
                  />
                </div>
                <div className="flex flex-col">
                  <Label htmlFor="ISBN_13">ISBN-13</Label>
                  <Input
                    id="ISBN_13"
                    name="ISBN_13"
                    type="text"
                    value={formData.ISBN_13}
                    onChange={(e) => handleInputChange('ISBN_13', e.target.value)}
                  />
                </div>
              </div>
              
              <div className="flex flex-col">
                <Label htmlFor="image_upload">Image du livre</Label>
                <div className="space-y-4">
                  {/* Aperçu de l'image actuelle */}
                  {(imagePreview || book.image_link) && (
                    <div className="relative w-32 h-48 border rounded-lg overflow-hidden">
                      <Image
                        src={
                          imagePreview ||
                          (book.image_link ? `data:image/jpeg;base64,${book.image_link}` : "/placeholder.svg")
                        }
                        alt="Aperçu de l'image"
                        fill
                        style={{ objectFit: "cover" }}
                      />
                    </div>
                  )}
                  
                  {/* Input pour sélectionner une nouvelle image */}
                  <Input
                    id="image_upload"
                    name="image_upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                  
                  <p className="text-xs text-muted-foreground">
                    Formats acceptés: JPG, PNG, GIF. Taille maximale: {MAX_IMAGE_SIZE_MB} MB.
                    {imageFile && ` (${(imageFile.size / 1024 / 1024).toFixed(1)} MB)`}
                  </p>
                  
                  {imageFile && (
                    <p className="text-sm text-muted-foreground">
                      Nouvelle image sélectionnée: {imageFile.name}
                    </p>
                  )}
                </div>
              </div>
            </form>
          </div>
          
          {successMessage && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
              <p className="font-medium">Succès</p>
              <p>{successMessage}</p>
            </div>
          )}
          
          <div className="flex gap-2 pt-4 mt-4 border-t">
            <Button type="submit" form="edit-form" disabled={isLoading}>
              {isLoading ? "Modification en cours..." : "Modifier le livre"}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Annuler
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};