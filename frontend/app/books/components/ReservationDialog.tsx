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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasShownError, setHasShownError] = useState(false);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const role = useUserRole();
  const authFetchHook = useAuthFetch();

  useEffect(() => {
    if (!isOpen && hasShownError) {
      window.location.reload();
      setHasShownError(false);
    }
  }, [isOpen, hasShownError]);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setHasShownError(false);
    }
  }, [isOpen]);

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
    
    // Ne pas déclencher la recherche si un utilisateur a été sélectionné
    const selectedUser = users.find(user => user.email === searchQuery);
    if (selectedUser && userId === selectedUser.id.toString()) {
      return;
    }
    
    debounceTimeout.current = setTimeout(() => {
      const results = users.filter((user) =>
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUsers(results);
      setShowDropdown(results.length > 0);
    }, 500);
  }, [searchQuery, users, userId]);

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
        window.location.reload();
      } else {
        try {
          const errorData = await response.json();
          if (response.status === 409 && errorData.message === "This copy is already reserved.") {
            setErrorMessage("Cette copie est déjà réservée par un autre utilisateur.");
            setHasShownError(true);
          } else {
            console.error("Erreur lors de la création de la réservation:", errorData.message || response.statusText);
            setErrorMessage(errorData.message || response.statusText);
            setHasShownError(true);
          }
        } catch (parseError) {
          console.error("Erreur lors de la création de la réservation:", response.statusText);
          setErrorMessage(response.statusText);
          setHasShownError(true);
        }
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
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              <p className="font-medium">Erreur</p>
              <p>{errorMessage}</p>
            </div>
          )}
        </DialogHeader>

        <form onSubmit={handleReservationSubmit}>
          <div className="grid gap-4 py-4">
            {role === "admin" && (
              <>
                <div className="relative">
                  <Input
                    id="userEmail"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      if (e.target.value.trim() !== "") {
                        setShowDropdown(true);
                      }
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
                            setFilteredUsers([]);
                          }}
                        >
                          {user.email}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

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