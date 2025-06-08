"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import { format } from "date-fns";
import { User } from "./types";
import { Dialog, DialogContent, DialogHeader, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

import { useUserRole } from "@/app/hooks/useUserRole";
import { jwtDecode } from "jwt-decode";
import { authFetch, useAuthFetch } from "@/app/utils/authFetch";
import { isClient, getLocalStorageItem } from "@/app/utils/isClient";
import { DialogTitle } from "@radix-ui/react-dialog";

type ReservationDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  copyId: number;
  onSuccess?: () => void;
};

type JwtPayload = {
  user_id: number;
};

export const ReservationDialog = ({
  isOpen,
  onOpenChange,
  copyId,
  onSuccess,
}: ReservationDialogProps) => {
  const [userId, setUserId] = useState("");
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const role = useUserRole();
  const authFetchHook = useAuthFetch();

  // ✅ Si c’est un user, on extrait directement son ID du token
  useEffect(() => {
    if (!isClient) return;

    if (role === "user") {
      const token = getLocalStorageItem("auth_token");
      if (token) {
        try {
          const decoded = jwtDecode<JwtPayload>(token);
          setUserId(decoded.user_id.toString());
        } catch (err) {
          console.error("Erreur décodage JWT :", err);
        }
      }
    }
  }, [role]);

  // ✅ Si admin : fetch users pour recherche email
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await authFetch("/api/users", {
          method: "GET",
          headers: { auth_token: `${localStorage.getItem("auth_token")}` }
        });
        if (response.ok) {
          const data = await response.json();
          setUsers(data);
        } else {
          console.error("Erreur lors du fetch des utilisateurs :", response.statusText);
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des utilisateurs :", error);
      }
    };

    if (isOpen && role === "admin") {
      fetchUsers();
    }
  }, [isOpen, role]);

  useEffect(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    if (searchQuery.trim() === "") {
      setFilteredUsers([]);
      setShowDropdown(false);
      return;
    }
    debounceTimeout.current = setTimeout(() => {
      const results = users.filter((user) =>
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUsers(results);
      setShowDropdown(results.length > 0);
    }, 500);
  }, [searchQuery, users]);

  const handleReservationSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const payload = {
      copy_id: copyId,
      user_id: Number(userId),
      reservation_date: startDate,
      final_date: endDate,
    };

    try {
      const response = await authFetchHook("/api/reservations", {
        method: "POST",
        headers: { auth_token: `${localStorage.getItem("auth_token")}` },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        console.log("Réservation créée avec succès");
        onOpenChange(false);
        if (onSuccess) {
          onSuccess();
        }
      } else {
        console.error("Erreur lors de la création de la réservation:", response.statusText);
      }
    } catch (error) {
      console.error("Erreur lors de la création de la réservation:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Reservation</DialogTitle>
        <DialogHeader>
          <DialogDescription>
            {role === "admin"
              ? "Sélectionnez l'utilisateur et les dates de réservation."
              : "Sélectionnez uniquement la date de fin de votre réservation."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleReservationSubmit}>
          <div className="grid gap-4 py-4">
            {/* ✅ Si admin : recherche utilisateur */}
            {role === "admin" && (
              <>
                <div className="relative">
                  <Input
                    id="userEmail"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowDropdown(true);
                    }}
                    placeholder="Recherche par e-mail"
                    className="border rounded-md px-3 py-2 bg-black text-white"
                  />
                  {showDropdown && filteredUsers.length > 0 && (
                    <div className="absolute top-full mt-1 w-full bg-black text-white border border-gray-700 rounded-md shadow-md max-h-40 overflow-y-auto z-10">
                      {filteredUsers.map((user) => (
                        <div
                          key={user.id}
                          className="p-2 hover:bg-gray-800 cursor-pointer"
                          onClick={() => {
                            setSearchQuery(user.email);
                            setUserId(user.id.toString());
                            setShowDropdown(false);
                          }}
                        >
                          {user.email}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <Label htmlFor="userId">User ID</Label>
                  <Input
                    id="userId"
                    type="number"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            {/* ✅ Date début et fin (date de début = aujourd’hui, désactivée) */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="startDate">Date de début</Label>
                <Input id="startDate" type="date" value={startDate} disabled />
                <input type="hidden" name="startDate" value={startDate} />
              </div>
              <div>
                <Label htmlFor="endDate">Date de fin</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  max={format(new Date(new Date().setDate(new Date().getDate() + 28)), "yyyy-MM-dd")}
                  required
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit">Confirmer la réservation</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};