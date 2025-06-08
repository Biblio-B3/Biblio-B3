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
import { jwtDecode } from "jwt-decode";
import { authFetch } from "@/app/utils/authFetch";

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
    const [loading, setLoading] = useState(true);

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
        let isMounted = true;

        const fetchUserReservations = async () => {
            const userId = getUserIdFromToken();
            if (!userId) {
                if (isMounted) {
                    setError("Utilisateur non authentifié.");
                    setLoading(false);
                }
                return;
            }

            try {
                // On appelle la route telle qu'elle existe sur le backend :
                const response = await authFetch(`/api/reservations/${userId}`, {
                    headers: {
                        auth_token: localStorage.getItem("auth_token") || "",
                    },
                });

                // Si le backend renvoie 404, on considère qu’il n’y a aucune réservation
                if (!response.ok) {
                    if (response.status === 404) {
                        if (isMounted) {
                            setReservations([]);
                            setError(null);
                        }
                        return;
                    }
                    // sinon on lève une erreur générique
                    throw new Error(`HTTP ${response.status}`);
                }

                // Si on est ici, response.ok === true
                const data: Reservation[] = await response.json();
                if (!isMounted) return;
                setReservations(data);
                setError(null);
            } catch (err: any) {
                if (!isMounted) return;

                console.log("Erreur attrapée:", err);

                // Si l’erreur contient “Resource with ID … not found” => on traite comme “aucune réservation”
                const isNoReservations =
                    typeof err.message === "string" &&
                    err.message.toLowerCase().includes("resource with id") &&
                    err.message.toLowerCase().includes("not found");

                if (isNoReservations) {
                    setReservations([]);
                    setError(null);
                } else {
                    setError("Erreur lors de la récupération des réservations");
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchUserReservations();
        return () => {
            isMounted = false;
        };
    }, []);

    const handleDelete = async (id: number) => {
        try {
            const response = await authFetch(`/api/reservations/${id}`, {
                method: "DELETE",
                headers: {
                    auth_token: localStorage.getItem("auth_token") || "",
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            setReservations((prev) => prev.filter((r) => r.id !== id));
        } catch (err: any) {
            setError(err instanceof Error ? err.message : "Erreur lors de la suppression");
        }
    };

    const formatDate = (dateString: string) => {
        return format(new Date(dateString), "dd-MM-yyyy", { locale: fr });
    };

    if (loading) {
        return <div className="text-center py-4">Chargement des réservations...</div>;
    }

    if (error) {
        return <p className="text-red-500">{error}</p>;
    }

    return (
        <>
            <h1 className="text-2xl font-bold mb-4">Mes réservations</h1>

            {reservations.length > 0 ? (
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
            ) : (
                <p className="mt-6 text-muted-foreground text-center">
                    Vous n'avez aucune réservation en cours.
                </p>
            )}
        </>
    );
}
