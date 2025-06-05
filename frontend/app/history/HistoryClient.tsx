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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useApiErrorHandler } from "@/app/components/DisconnectAfterRevocation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { jwtDecode } from "jwt-decode";

// ----- Types -----
interface UserHistory {
    id: number;
    date_read: string;
    book_title: string;
    book_id: number;        // désormais obligatoire
    copy_id: number;        // idem
    user_first_name?: string;
    user_last_name?: string;
}

interface JwtPayload {
    user_id: number;
}

// ----- Composant principal -----
export default function UserHistoryClient() {
    const [history, setHistory] = useState<UserHistory[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedBook, setSelectedBook] = useState<UserHistory | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // États pour le formulaire de review
    const [description, setDescription] = useState("");
    const [note, setNote] = useState(0);
    const [condition, setCondition] = useState(0);

    const fetchWithAuth = useApiErrorHandler();

    const getUserIdFromToken = (): number | null => {
        const token = localStorage.getItem("auth_token");
        if (!token) return null;
        try {
            const decoded = jwtDecode<JwtPayload>(token);
            return decoded.user_id ?? null;
        } catch {
            return null;
        }
    };

    // Récupération de l'historique utilisateur
    useEffect(() => {
        const fetchUserHistory = async () => {
            const userId = getUserIdFromToken();
            if (!userId) {
                setError("Utilisateur non authentifié.");
                setLoading(false);
                return;
            }

            try {
                const res = await fetchWithAuth(`/api/users/${userId}/historical`, {
                    method: "GET",
                    headers: {
                        auth_token: `${localStorage.getItem("auth_token")}`,
                    },
                });
                if (!res.ok) throw new Error("Erreur lors de la récupération de l'historique");
                const data: UserHistory[] = await res.json();
                setHistory(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Erreur inconnue");
            } finally {
                setLoading(false);
            }
        };

        fetchUserHistory();
    }, []);

    // Formatte la date en FR (dd-MM-yyyy)
    const formatDate = (dateString: string) => {
        if (!dateString) return "Date manquante";
        // Normalisation si la chaîne contient un espace
        const normalized = dateString.includes(" ") ? dateString.replace(" ", "T") : dateString;
        const date = new Date(normalized);
        return isNaN(date.getTime())
            ? "Date invalide"
            : format(date, "dd-MM-yyyy", { locale: fr });
    };

    // Ouvre le dialogue pour ajouter une review
    const openReviewDialog = (item: UserHistory) => {
        // On sait déjà que book_id et copy_id sont présents
        setError(null);
        setSelectedBook(item);
        setDescription("");
        setNote(0);
        setCondition(0);
        setDialogOpen(true);
    };

    // Soumission de la review
    const handleReviewSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedBook) {
            setError("Aucun livre sélectionné");
            return;
        }

        if (!description.trim()) {
            setError("La description est requise");
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const token = localStorage.getItem("auth_token");
            if (!token) {
                throw new Error("Token d'authentification manquant");
            }

            const res = await fetchWithAuth(`/api/reviews`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    auth_token: `${localStorage.getItem("auth_token")}`,
                },
                body: JSON.stringify({
                    book_id: selectedBook.book_id,
                    copy_id: selectedBook.copy_id,
                    description: description.trim(),
                    note,
                    condition,
                }),
            });

            if (res.ok) {
                setDialogOpen(false);
                setSelectedBook(null);
                // **Optionnel** : on pourrait rafraîchir l'historique si on souhaite afficher automatiquement la nouvelle review
                // await fetchUserHistory();
            } else {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || `Erreur ${res.status}: ${res.statusText}`);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erreur inconnue lors de la soumission");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <p>Chargement de l'historique...</p>;
    if (error && !dialogOpen) return <p className="text-red-500">{error}</p>;

    return (
        <div className="space-y-4">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Titre du Livre</TableHead>
                        <TableHead>Date de lecture</TableHead>
                        <TableHead>Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {history.map((item) => (
                        <TableRow key={item.id}>
                            <TableCell>{item.book_title}</TableCell>
                            <TableCell>{formatDate(item.date_read)}</TableCell>
                            <TableCell>
                                <Button size="sm" onClick={() => openReviewDialog(item)}>
                                    Ajouter une review
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogDescription>
                            Créez votre review pour :{" "}
                            <strong>{selectedBook?.book_title ?? "Livre sélectionné"}</strong>
                        </DialogDescription>
                    </DialogHeader>
                    {error && (
                        <div className="text-red-500 text-sm mb-4">
                            {error}
                        </div>
                    )}
                    <form onSubmit={handleReviewSubmit} className="space-y-4">
                        <div>
                            <Label htmlFor="description">Description *</Label>
                            <Textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Votre avis sur ce livre..."
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="note">Note (0-5) *</Label>
                                <Input
                                    id="note"
                                    type="number"
                                    min={0}
                                    max={5}
                                    step={1}
                                    value={note}
                                    onChange={(e) => setNote(Number(e.target.value))}
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="condition">Condition (0-5) *</Label>
                                <Input
                                    id="condition"
                                    type="number"
                                    min={0}
                                    max={5}
                                    step={1}
                                    value={condition}
                                    onChange={(e) => setCondition(Number(e.target.value))}
                                    required
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setDialogOpen(false);
                                    setSelectedBook(null);
                                }}
                                disabled={submitting}
                            >
                                Annuler
                            </Button>
                            <Button type="submit" disabled={submitting || !description.trim()}>
                                {submitting ? "Envoi..." : "Envoyer"}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
