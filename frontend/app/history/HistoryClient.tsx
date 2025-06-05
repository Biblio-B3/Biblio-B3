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
// Historique du user (le back doit renvoyer un tableau de ceci)
interface UserHistory {
    id: number;
    date_read: string;
    book_title: string;
    book_id: number;
    copy_id: number;
    user_first_name?: string;
    user_last_name?: string;
}

// Représentation d’une review existante
interface UserReview {
    id: number;
    book_id: number;
    copy_id: number;
    description: string;
    note: number;
    condition: number;
}

// Payload du JWT (pour extraire user_id côté front)
interface JwtPayload {
    user_id: number;
}

// ----- Composant principal -----
export default function UserHistoryClient() {
    const [history, setHistory] = useState<UserHistory[]>([]);
    const [userReviews, setUserReviews] = useState<Record<number, UserReview>>({});
    //              ^------ dictionnaire indexé par book_id → UserReview
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Pour le dialogue de création / mise à jour
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedBook, setSelectedBook] = useState<UserHistory | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editingReviewId, setEditingReviewId] = useState<number | null>(null);

    // Champs du formulaire
    const [description, setDescription] = useState("");
    const [note, setNote] = useState(0);
    const [condition, setCondition] = useState(0);

    const [submitting, setSubmitting] = useState(false);
    const fetchWithAuth = useApiErrorHandler();

    // Extrait user_id depuis le token
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

    // Au montage, on récupère à la fois :
    //  1) l'historique (history)
    //  2) toutes les reviews de ce user (userReviews)
    useEffect(() => {
        const fetchEverything = async () => {
            const userId = getUserIdFromToken();
            if (!userId) {
                setError("Utilisateur non authentifié.");
                setLoading(false);
                return;
            }

            try {
                // 1) Récupérer l'historique de lecture
                const resHist = await fetchWithAuth(`/api/users/${userId}/historical`, {
                    method: "GET",
                    headers: {
                        auth_token: `${localStorage.getItem("auth_token")}`,
                    },
                });
                if (!resHist.ok)
                    throw new Error("Erreur lors de la récupération de l'historique");
                const dataHist: UserHistory[] = await resHist.json();
                setHistory(dataHist);

                // 2) Récupérer *toutes* les reviews du user (GET /api/reviews?user_id=<userId>)
                const resRev = await fetchWithAuth(`/api/reviews?user_id=${userId}`, {
                    method: "GET",
                    headers: {
                        auth_token: `${localStorage.getItem("auth_token")}`,
                    },
                });
                if (!resRev.ok)
                    throw new Error("Erreur lors de la récupération des reviews");
                const dataRev: UserReview[] = await resRev.json();

                // On transforme en dictionnaire { [book_id]: UserReview }
                const revDict: Record<number, UserReview> = {};
                dataRev.forEach((rev) => {
                    revDict[rev.book_id] = rev;
                });
                setUserReviews(revDict);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Erreur inconnue");
            } finally {
                setLoading(false);
            }
        };

        fetchEverything();
    }, []);

    // Formatte la date en FR (dd-MM-yyyy)
    const formatDate = (dateString: string) => {
        if (!dateString) return "Date manquante";
        // Normalisation si la chaîne contient un espace
        const normalized = dateString.includes(" ")
            ? dateString.replace(" ", "T")
            : dateString;
        const date = new Date(normalized);
        return isNaN(date.getTime())
            ? "Date invalide"
            : format(date, "dd-MM-yyyy", { locale: fr });
    };

    // ************************
    // ** OUVRIR LE DIALOGUE **
    // ************************
    const openReviewDialog = async (item: UserHistory) => {
        setError(null);
        setSelectedBook(item);

        // Si l'utilisateur a déjà une review pour ce book_id, on passe en mode édition
        const existingReview = userReviews[item.book_id];
        if (existingReview) {
            setIsEditing(true);
            setEditingReviewId(existingReview.id);
            setDescription(existingReview.description);
            setNote(existingReview.note);
            setCondition(existingReview.condition);
        } else {
            // nouveau review
            setIsEditing(false);
            setEditingReviewId(null);
            setDescription("");
            setNote(0);
            setCondition(0);
        }

        setDialogOpen(true);
    };

    // **********************
    // ** SOUMISSION FORM **
    // **********************
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

            // Construction du payload commun
            const payload = {
                book_id: selectedBook.book_id,
                copy_id: selectedBook.copy_id,
                description: description.trim(),
                note,
                condition,
            };

            let res;
            if (isEditing && editingReviewId) {
                // Mise à jour (PUT)
                res = await fetchWithAuth(`/api/reviews/${editingReviewId}`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        auth_token: `${token}`,
                    },
                    body: JSON.stringify(payload),
                });
            } else {
                // Création (POST)
                res = await fetchWithAuth(`/api/reviews`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        auth_token: `${token}`,
                    },
                    body: JSON.stringify(payload),
                });
            }

            if (res.ok) {
                // On ferme le dialogue et on met à jour le state front
                const jsonData = await res.json();

                // Si c'était une création, on récupère l'ID de la nouvelle review dans la réponse
                if (!isEditing) {
                    // Supposons que le POST répond { id: <nouvel id>, book_id, copy_id, description, note, condition }
                    const created: UserReview = jsonData;
                    setUserReviews((old) => ({
                        ...old,
                        [created.book_id]: created,
                    }));
                } else {
                    // En mise à jour, on re-synchronise le dictionnaire
                    const updatedArray: UserReview[] = jsonData.updatedReview;
                    // Par exemple, le backend renvoie { updatedReview: [ { id, book_id, ... } ] }
                    if (Array.isArray(updatedArray) && updatedArray.length > 0) {
                        const upd = updatedArray[0];
                        setUserReviews((old) => ({
                            ...old,
                            [upd.book_id]: { ...upd },
                        }));
                    }
                }

                setDialogOpen(false);
                setSelectedBook(null);
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
            {/* ============================
           TABLEAU DE L’HISTORIQUE
           ============================ */}
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Titre du Livre</TableHead>
                        <TableHead>Date de lecture</TableHead>
                        <TableHead>Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {history.map((item) => {
                        // Si l’utilisateur a déjà posté une review pour ce book_id
                        const alreadyReviewed = Boolean(userReviews[item.book_id]);
                        return (
                            <TableRow key={item.id}>
                                <TableCell>{item.book_title}</TableCell>
                                <TableCell>{formatDate(item.date_read)}</TableCell>
                                <TableCell>
                                    <Button
                                        size="sm"
                                        onClick={() => openReviewDialog(item)}
                                    >
                                        {alreadyReviewed ? "Modifier mon avis" : "Ajouter un avis"}
                                    </Button>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>

            {/* ============================
           DIALOGUE CREATE / UPDATE
           ============================ */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogDescription>
                            {isEditing
                                ? "Modifiez votre review pour : "
                                : "Créez votre review pour : "}
                            <strong>
                                {selectedBook?.book_title ?? "Livre sélectionné"}
                            </strong>
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
                            <Button
                                type="submit"
                                disabled={submitting || !description.trim()}
                            >
                                {submitting
                                    ? isEditing
                                        ? "Mise à jour..."
                                        : "Envoi..."
                                    : isEditing
                                        ? "Modifier mon avis"
                                        : "Ajouter un avis"}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
