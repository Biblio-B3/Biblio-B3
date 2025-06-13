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
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { jwtDecode } from "jwt-decode";
import { authFetch } from "@/app/utils/authFetch";
import { DeleteReviewButton } from "@/app/reviews/components/DeleteReviewButton";

interface UserHistory {
    id: number;
    date_read: string;
    book_title: string;
    book_id: number;
    copy_id: number;
    user_first_name?: string;
    user_last_name?: string;
}

interface UserReview {
    id: number;
    book_id: number;
    copy_id: number;
    description: string;
    note: number;
    condition: number;
    user_id: number;
}

interface JwtPayload {
    user_id: number;
}

export default function UserHistoryClient() {
    const [history, setHistory] = useState<UserHistory[]>([]);
    const [userReviews, setUserReviews] = useState<Record<number, UserReview>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [noHistory, setNoHistory] = useState(false);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedBook, setSelectedBook] = useState<UserHistory | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editingReviewId, setEditingReviewId] = useState<number | null>(null);

    const [description, setDescription] = useState("");
    const [note, setNote] = useState(0);
    const [condition, setCondition] = useState(0);

    const [submitting, setSubmitting] = useState(false);

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

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        
        const userId = getUserIdFromToken();
        if (!userId) {
            setError("Utilisateur non authentifié.");
            setLoading(false);
            return;
        }

        try {
            const resHist = await authFetch(`/api/users/${userId}/historical`, {
                method: "GET",
            });

            if (resHist.status === 404) {
                setNoHistory(true);
                return;
            }

            if (!resHist.ok) {
                throw new Error("Erreur lors de la récupération de l'historique");
            }

            const dataHist: UserHistory[] = await resHist.json();
            setHistory(dataHist);

            const resRev = await authFetch(`/api/users/${userId}/reviews`);

            if (resRev.status === 404) {
                setUserReviews({});
            } else if (!resRev.ok) {
                throw new Error(`Erreur ${resRev.status} lors de la récupération des reviews`);
            } else {
                const dataRev: UserReview[] = await resRev.json();
                const revDict: Record<number, UserReview> = {};
                dataRev.forEach((rev) => {
                    revDict[rev.book_id] = rev;
                });
                setUserReviews(revDict);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erreur inconnue");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

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

    const openReviewDialog = async (item: UserHistory) => {
        setError(null);
        setSelectedBook(item);

        const existingReview = userReviews[item.book_id];
        if (existingReview) {
            setIsEditing(true);
            setEditingReviewId(existingReview.id);
            setDescription(existingReview.description);
            setNote(existingReview.note);
            setCondition(existingReview.condition);
        } else {
            setIsEditing(false);
            setEditingReviewId(null);
            setDescription("");
            setNote(0);
            setCondition(0);
        }

        setDialogOpen(true);
    };

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

            const payload = {
                book_id: selectedBook.book_id,
                copy_id: selectedBook.copy_id,
                description: description.trim(),
                note,
                condition,
            };

            let res;
            if (isEditing && editingReviewId) {
                res = await authFetch(`/api/reviews/${editingReviewId}`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        auth_token: `${token}`,
                    },
                    body: JSON.stringify(payload),
                });
            } else {
                res = await authFetch(`/api/reviews`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        auth_token: `${token}`,
                    },
                    body: JSON.stringify(payload),
                });
            }

            if (res.ok) {
                const jsonData = await res.json();

                if (!isEditing) {
                    const created: UserReview = jsonData;
                    setUserReviews((old) => ({
                        ...old,
                        [created.book_id]: created,
                    }));
                } else {
                    const updatedArray: UserReview[] = jsonData.updatedReview;
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
                fetchData();
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

    if (noHistory) {
        return (
            <div className="space-y-4">
                <h2 className="text-2xl font-bold">Vous n'avez pas encore d'historique</h2>
                <p>Une fois que vous aurez lu un livre, votre historique apparaîtra ici.</p>
            </div>
        );
    }

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
                    {history.map((item) => {
                        const alreadyReviewed = Boolean(userReviews[item.book_id]);
                        return (
                            <TableRow key={item.id}>
                                <TableCell>{item.book_title}</TableCell>
                                <TableCell>{formatDate(item.date_read)}</TableCell>
                                <TableCell className="flex gap-2">
                                    <Button size="sm" onClick={() => openReviewDialog(item)}>
                                        {alreadyReviewed ? "Modifier mon avis" : "Ajouter un avis"}
                                    </Button>
                                    {alreadyReviewed && (
                                        <DeleteReviewButton
                                            reviewId={userReviews[item.book_id].id}
                                            userId={userReviews[item.book_id].user_id}
                                            onDeleted={fetchData}
                                        />
                                    )}
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {isEditing ? "Modifier votre avis" : "Ajouter un avis"}
                        </DialogTitle>
                        <DialogDescription>
                            {isEditing
                                ? "Modifiez votre review pour : "
                                : "Créez votre review pour : "}
                            <strong>{selectedBook?.book_title ?? "Livre sélectionné"}</strong>
                        </DialogDescription>
                    </DialogHeader>

                    {error && <div className="text-red-500 text-sm mb-4">{error}</div>}

                    <form onSubmit={handleReviewSubmit} className="space-y-4">
                        <div>
                            <Label htmlFor="description">Description *</Label>
                            <Textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Votre avis sur ce livre…"
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
                                {submitting
                                    ? isEditing
                                        ? "Mise à jour…"
                                        : "Envoi…"
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
