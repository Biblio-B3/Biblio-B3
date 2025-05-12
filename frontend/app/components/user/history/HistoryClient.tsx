"use client";

import { useEffect, useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useApiErrorHandler } from "@/app/components/DisconnectAfterRevocation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { jwtDecode } from "jwt-decode";

type UserHistory = {
    id: number;
    date_read: string;
    book_title: string;
    user_first_name: string;
    user_last_name: string;
};

type JwtPayload = {
    user_id: number;
};

export default function UserHistoryClient() {
    const [history, setHistory] = useState<UserHistory[]>([]);
    const [loading, setLoading] = useState(true);
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
        const fetchUserHistory = async () => {
            const userId = getUserIdFromToken();
            if (!userId) {
                setError("Utilisateur non authentifié.");
                setLoading(false);
                return;
            }

            try {
                const response = await fetchWithAuth(`/api/users/${userId}/historical`, {
                    method: "GET",
                    headers: {
                        auth_token: `${localStorage.getItem("auth_token")}`,
                    },
                });

                if (!response.ok)
                    throw new Error("Erreur lors de la récupération de l'historique");

                const data: UserHistory[] = await response.json();
                setHistory(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Erreur inconnue");
            } finally {
                setLoading(false);
            }
        };

        fetchUserHistory();
    }, [fetchWithAuth]);

    const formatDate = (dateString: string) => {
        if (!dateString) return "Date manquante";

        const normalized = dateString.includes(" ")
            ? dateString.replace(" ", "T")
            : dateString;

        const date = new Date(normalized);

        return isNaN(date.getTime())
            ? "Date invalide"
            : format(date, "dd-MM-yyyy", { locale: fr });
    };

    if (loading) return <p>Chargement de l'historique...</p>;
    if (error) return <p className="text-red-500">{error}</p>;

    return (
        <div className="space-y-4">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Titre du Livre</TableHead>
                        <TableHead>Date de lecture</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {history.map((item) => (
                        <TableRow key={item.id}>
                            <TableCell>{item.book_title}</TableCell>
                            <TableCell>
                                {item.date_read ? formatDate(item.date_read) : "—"}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            {history.length === 0 && (
                <p className="text-muted-foreground text-center mt-6">
                    Aucun historique trouvé.
                </p>
            )}
        </div>
    );
}
