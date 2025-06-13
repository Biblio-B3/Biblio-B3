"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { authFetch } from "@/app/utils/authFetch";
import { toast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

type Reservation = {
  id: number;
  user_id: number;
  copy_id: number;
  book_title: string;
  is_claimed: boolean;
  user_first_name: string;
  user_last_name: string;
  user_email: string;
  reservation_date: string;
  final_date: string;
};

export default function ReservationsClient() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentReservationId, setCurrentReservationId] = useState<number | null>(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const fetchReservations = async () => {
      try {
        const response = await authFetch("/api/reservations");
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Erreur lors de la récupération des réservations");
        }

        const data: Reservation[] = await response.json();
        setReservations(data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Erreur inconnue";
        setError(errorMessage);
        toast({
          variant: "destructive",
          title: "Erreur",
          description: errorMessage,
        });
      }
    };

    fetchReservations();
  }, []);

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd-MM-yyyy", { locale: fr });
  };

  const handleClaimStatusChange = async (copyId: number) => {
    const route = `/api/copy/${copyId}/claimed`;

    try {
      const response = await authFetch(route, {
        method: "PUT",
        headers: {
          auth_token: `${localStorage.getItem("auth_token")}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) throw new Error("Échec de la mise à jour du statut");

      setReservations((prevReservations) =>
        prevReservations.map((reservation) =>
          reservation.copy_id === copyId
            ? { ...reservation, is_claimed: true }
            : reservation
        )
      );

      // Rafraîchir la page après un unclaim
      if (!isClaimed) {
        window.location.reload();
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Erreur inconnue");
    }
  };

  const handleDeleteReservation = async (id: number) => {
    try {
      const response = await authFetch(`/api/reservations/${id}`, {
        method: "DELETE",
        headers: {
          auth_token: `${localStorage.getItem("auth_token")}`,
        },
      });

      if (!response.ok)
        throw new Error("Erreur lors de la suppression de la réservation");

      setReservations((prevReservations) =>
        prevReservations.filter((reservation) => reservation.id !== id)
      );
    } catch (error) {
      setError(error instanceof Error ? error.message : "Erreur inconnue");
    }
  };

  const filteredReservations = reservations.filter((reservation) => {
    const today = new Date();
    const finalDate = new Date(reservation.final_date);

    switch (filter) {
      case "claimed":
        return reservation.is_claimed;
      case "claimedExpired":
        return reservation.is_claimed && finalDate < today;
      default:
        return true;
    }
  });

  if (filteredReservations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-gray-500">Aucune réservation trouvée</p>
      </div>
    );
  }

  return (
    <>
      {/* Sélecteur de filtre */}
      <div className="mb-4">
        <Select value={filter} onValueChange={(value) => setFilter(value)}>
          <SelectTrigger>
            <SelectValue placeholder="Filtrer les réservations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les réservations</SelectItem>
            <SelectItem value="claimed">Réclamées</SelectItem>
            <SelectItem value="claimedExpired">
              Réclamées et expirées
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom Utilisateur</TableHead>
            <TableHead>Titre du Livre</TableHead>
            <TableHead>Date de début</TableHead>
            <TableHead>Date de fin</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredReservations.map((reservation) => {
            const today = new Date();
            const finalDate = new Date(reservation.final_date);
            const isExpiredClaimed =
              reservation.is_claimed && finalDate < today;
            return (
              <TableRow
                key={reservation.id}
                className={isExpiredClaimed ? "text-red-500" : ""}
              >
                <TableCell>
                  <div>
                    {reservation.user_first_name} {reservation.user_last_name}
                  </div>
                  <div className="text-sm text-gray-500">{reservation.user_email}</div>
                </TableCell>
                <TableCell>{reservation.book_title}</TableCell>
                <TableCell>{formatDate(reservation.reservation_date)}</TableCell>
                <TableCell>{formatDate(reservation.final_date)}</TableCell>
                <TableCell>
                  {reservation.is_claimed ? (
                    <span className="text-green-600 font-medium">Réclamée</span>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleClaimStatusChange(reservation.copy_id)}
                    >
                      Réclamer
                    </Button>
                  )}
                </TableCell>
                <TableCell>
                  <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setCurrentReservationId(reservation.id);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Confirmer la suppression</DialogTitle>
                        <DialogDescription>
                          Êtes-vous sûr de vouloir supprimer définitivement cette réservation ?
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
                          onClick={() => {
                            if (currentReservationId) {
                              handleDeleteReservation(currentReservationId);
                              setDeleteDialogOpen(false);
                            }
                          }}
                        >
                          Supprimer définitivement
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </>
  );
}
