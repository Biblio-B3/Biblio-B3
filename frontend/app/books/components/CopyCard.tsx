"use client";

import { useState, useEffect } from "react";
import { Copy } from "./types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ReservationDialog } from "./ReservationDialog";
import { useUserRole } from "@/app/hooks/useUserRole";
import { LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { isClient, getLocalStorageItem } from "@/app/utils/isClient";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

type CopyCardProps = {
  copy: Copy & { copy_id: number; /* ou le champ que vous utilisez pour l’ID */ };
  onDelete?: (copyId: number) => Promise<void>;
  onUpdateCopy?: (copyId: number, newState: string) => Promise<void>;
};

export const CopyCard = ({ copy, onDelete, onUpdateCopy }: CopyCardProps) => {
  const [reservationDialogOpen, setReservationDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const role = useUserRole();
  const router = useRouter();

  useEffect(() => {
    if (!isClient) return;
    const token = getLocalStorageItem("auth_token");
    setIsAuthenticated(!!token);
  }, []);

  const getStateColor = (state: string) => {
    switch (state.toLowerCase()) {
      case "excellent":
        return "bg-green-100 text-green-800";
      case "bon":
      case "good":
        return "bg-blue-100 text-blue-800";
      case "moyen":
      case "average":
        return "bg-yellow-100 text-yellow-800";
      case "mauvais":
      case "poor":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleHistorique = () => {
    router.push(`/books/copy/${copy.copy_id}/historical`);
  };


  return (
    <>
      <Card className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            {role === "admin" ? (
              <select
                value={copy.state}
                onChange={(e) => onUpdateCopy?.(copy.copy_id, e.target.value)}
                className="rounded-md border px-2 py-1 text-xs"
              >
                <option value="excellent">Excellent</option>
                <option value="bon">Bon</option>
                <option value="moyen">Moyen</option>
                <option value="mauvais">Mauvais</option>
              </select>
            ) : (
              <Badge className="w-fit text-xs capitalize">
                {copy.state}
              </Badge>
            )}
          </div>

          <div className="flex gap-2">
            {copy.is_reserved && (
              <Badge
                variant="outline"
                className="bg-yellow-100 text-yellow-800 border-yellow-300"
              >
                Réservé
              </Badge>
            )}
            {copy.is_claimed && role === 'admin' && (
              <Badge
                variant="outline"
                className="bg-blue-100 text-blue-800 border-blue-300"
              >
                Réclamé
              </Badge>
            )}
          </div>
        </div>

        {role === "admin" && (
          <p className="text-sm mb-2">ID exemplaire: #{copy.copy_id}</p>
        )}

        {copy.is_reserved && copy.final_date && (
          <p className="text-sm mb-2 text-muted-foreground">
            Réservé jusqu’au :{" "}
            {new Date(copy.final_date).toLocaleDateString("fr-FR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </p>
        )}

        {copy.review_condition && copy.review_condition.length > 0 && (
          <div className="mt-3">
            <h4 className="text-sm font-medium mb-1">
              Évaluations de l'état :
            </h4>
            <div className="flex flex-wrap gap-1">
              {copy.review_condition.map(
                (condition, index) =>
                  condition &&
                  condition !== "null" && (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {condition}
                    </Badge>
                  )
              )}
            </div>
          </div>
        )}

        {role === "admin" && onDelete && !copy.is_reserved && !copy.is_claimed && (
          <>
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" className="mt-2 w-full">
                  Supprimer cette copie
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirmer la suppression</DialogTitle>
                  <DialogDescription>
                    Êtes-vous sûr de vouloir supprimer définitivement cet exemplaire ?
                    Cette action est irréversible.
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
                    onClick={() => onDelete(copy.copy_id)}
                  >
                    Supprimer définitivement
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}

        {!copy.is_reserved && (
          isAuthenticated ? (
            <Button
              className="mt-4 w-full"
              onClick={() => setReservationDialogOpen(true)}
            >
              Réserver cette copie
            </Button>
          ) : (
            <Button
              className="mt-4 w-full"
              variant="outline"
              onClick={() => router.push("/login")}
            >
              <LogIn className="mr-2 h-4 w-4" /> Se connecter pour réserver
            </Button>
          )
        )}

        {/* NOUVEAU BOUTON HISTORIQUE */}
        <Button
          className="mt-2 w-full"
          variant="secondary"
          onClick={handleHistorique}
        >
          Historique
        </Button>
      </Card>

      <ReservationDialog
        isOpen={reservationDialogOpen}
        onOpenChange={setReservationDialogOpen}
        copyId={copy.copy_id}
        onSuccess={() => { }}
      />
    </>
  );
};
