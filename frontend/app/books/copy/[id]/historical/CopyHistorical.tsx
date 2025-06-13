"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { authFetch } from "@/app/utils/authFetch";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { HistoricalEntry } from "../../../components/types";

interface ReservationInfo {
    id: number;
    reservation_date: string;
    final_date: string;
    user_id: number;
    copy_id: number;
    user_first_name: string;
    user_last_name: string;
}

interface CopyHistoricalProps {
    copyId: string;
}

export default function CopyHistorical({ copyId }: CopyHistoricalProps) {
    const [history, setHistory] = useState<HistoricalEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [noHistory, setNoHistory] = useState(false);
    const [reservationInfo, setReservationInfo] = useState<ReservationInfo | null>(null);
    const router = useRouter();

    // Formatte la date en FR (dd-MM-yyyy)
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

    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true);
            setError(null);
            setNoHistory(false);
            try {
                const response = await authFetch(`/api/copy/${copyId}/historical`);
                if (response.status === 404) {
                    // Aucune entrée historique pour cette copie
                    setNoHistory(true);
                    setHistory([]);
                } else if (!response.ok) {
                    let msg = "Erreur lors de la récupération de l'historique";
                    try {
                        const errData = await response.json();
                        msg = errData.message || msg;
                    } catch {
                        const txt = await response.text();
                        msg = txt || msg;
                    }
                    throw new Error(msg);
                } else {
                    const data: HistoricalEntry[] = await response.json();
                    if (Array.isArray(data) && data.length === 0) {
                        setNoHistory(true);
                        setHistory([]);
                    } else {
                        setHistory(data);
                    }
                }
            } catch (err) {
                const msg = err instanceof Error ? err.message : "Erreur inconnue";
                setError(msg);
                toast({
                    variant: "destructive",
                    title: "Erreur",
                    description: msg,
                });
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, [copyId]);

    useEffect(() => {
        const fetchReservation = async () => {
            try {
                const res = await authFetch(`/api/copy/${copyId}/reservation`);
                if (res.status === 404) {
                    // Pas de réservation en cours
                    setReservationInfo(null);
                } else if (!res.ok) {
                    let msg = "Erreur lors de la récupération de la réservation";
                    try {
                        const errData = await res.json();
                        msg = errData.message || msg;
                    } catch {
                        const txt = await res.text();
                        msg = txt || msg;
                    }
                    throw new Error(msg);
                } else {
                    const data: ReservationInfo = await res.json();
                    setReservationInfo(data);
                }
            } catch (err) {
                const msg = err instanceof Error ? err.message : "Erreur inconnue";
                // Ne pas bloquer l'affichage historique, on affiche un toast
                toast({
                    variant: "destructive",
                    title: "Erreur réservation",
                    description: msg,
                });
            }
        };
        fetchReservation();
    }, [copyId]);

    // Chargement
    if (loading) {
        return (
            <div className="container mx-auto py-6">
                <p>Chargement de l'historique...</p>
                <Button
                    variant="ghost"
                    className="mt-4 flex items-center"
                    onClick={() => router.back()}
                >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Retour
                </Button>
            </div>
        );
    }

    // Erreur
    if (error) {
        return (
            <div className="container mx-auto py-6 flex flex-col items-center">
                <div className="bg-red-100 text-red-800 p-4 rounded-md mb-4 w-full max-w-md text-center">
                    {error}
                </div>
                <Button
                    variant="ghost"
                    className="flex items-center"
                    onClick={() => router.back()}
                >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Retour
                </Button>
            </div>
        );
    }

    // Pas d'historique
    if (noHistory) {
        return (
            <div className="container mx-auto py-6 space-y-4">
                <Button
                    variant="ghost"
                    className="flex items-center"
                    onClick={() => router.back()}
                >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Retour
                </Button>
                {reservationInfo && (
                    <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-md">
                        Réservée par <strong>{reservationInfo.user_first_name} {reservationInfo.user_last_name}</strong> jusqu'au <strong>{formatDate(reservationInfo.final_date)}</strong>
                    </div>
                )}
                <div className="space-y-2">
                    <h2 className="text-2xl font-bold">Aucun historique pour cette copie</h2>
                    <p className="text-gray-600">
                        Cette copie n'a pas encore d'enregistrements d'historique.
                    </p>
                </div>
            </div>
        );
    }

    // Affichage principal
    return (
        <div className="container mx-auto py-6 space-y-4">
            <Button
                variant="ghost"
                className="flex items-center"
                onClick={() => router.back()}
            >
                <ArrowLeft className="mr-2 h-4 w-4" /> Retour
            </Button>
            {reservationInfo && (
                <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-md">
                    Actuellement réservée par <strong>{reservationInfo.user_first_name} {reservationInfo.user_last_name}</strong> jusqu'au <strong>{formatDate(reservationInfo.final_date)}</strong>
                </div>
            )}
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date de lecture</TableHead>
                        <TableHead>Utilisateur</TableHead>
                        <TableHead>Titre du livre</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {history.map((entry) => (
                        <TableRow key={entry.id}>
                            <TableCell>
                                {formatDate(entry.date_read)}
                            </TableCell>
                            <TableCell>
                                {entry.user_first_name || ""} {entry.user_last_name || ""}
                            </TableCell>
                            <TableCell>{entry.book_title || ""}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
