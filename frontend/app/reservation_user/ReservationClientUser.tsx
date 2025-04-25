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
import { useApiErrorHandler } from "@/app/components/DisconnectAfterRevocation";
import { jwtDecode } from "jwt-decode";

type Reservation = {
    id: number;
    copy_id: number;
    book_title: string;
    reservation_date: string;
    final_date: string;
    is_claimed: boolean;
};

type JwtPayload = {
    user_id: number;
};

export default function UserReservations() {
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [error, setError] = useState<string | null>(null);
    const fetchWithAuth = useApiErrorHandler();

    const getUserIdFromToken = (): number | null => {
        const token = localStorage.getItem("auth_token");
        if (!token) return null;
        try {
            const decoded = jwtDecode<JwtPayload>(token);
            return decoded.user_id || null;
        } catch {
            return null;
        }
    };

    useEffect(() => {
        const fetchUserReservations = async () => {
            const userId = getUserIdFromToken();
            if (!userId) {
                setError("Utilisateur non authentifié.");
                return;
            }

            try {
                const response = await fetchWithAuth(`/api/reservations/${userId}`, {
                    headers: {
                        auth_token: `${localStorage.getItem("auth_token")}`,
                    },
                });

                if (!response.ok)
                    throw new Error("Erreur lors de la récupération des réservations");

                const data: Reservation[] = await response.json();
                console.log("📦 Réservations utilisateur :", data); // ✅ LOG ajouté ici
                setReservations(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Erreur inconnue");
            }
        };

        fetchUserReservations();
    }, []);

    const handleDelete = async (id: number) => {
        try {
            const response = await fetchWithAuth(`/api/reservations/${id}`, {
                method: "DELETE",
                headers: {
                    auth_token: `${localStorage.getItem("auth_token")}`,
                },
            });

            if (!response.ok)
                throw new Error("Erreur lors de la suppression de la réservation");

            setReservations((prev) => prev.filter((r) => r.id !== id));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erreur inconnue");
        }
    };

    const formatDate = (dateString: string) => {
        return format(new Date(dateString), "dd-MM-yyyy", { locale: fr });
    };

    if (error) {
        return <p className="text-red-500">{error}</p>;
    }

    return (
        <>
            <h1 className="text-2xl font-bold mb-4">Mes réservations</h1>

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Titre du livre</TableHead>
                        <TableHead>Date de début</TableHead>
                        <TableHead>Date de fin</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {reservations.map((reservation) => (
                        <TableRow key={reservation.id}>
                            <TableCell>{reservation.book_title}</TableCell>
                            <TableCell>{formatDate(reservation.reservation_date)}</TableCell>
                            <TableCell>{formatDate(reservation.final_date)}</TableCell>
                            <TableCell>
                                {reservation.is_claimed ? "Réclamée" : "Non réclamée"}
                            </TableCell>
                            <TableCell>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDelete(reservation.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            {reservations.length === 0 && (
                <p className="mt-6 text-muted-foreground text-center">
                    Vous n’avez aucune réservation en cours.
                </p>
            )}
        </>
    );
}
