"use client"

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { getLocalStorageItem } from "@/app/utils/isClient";
import { useApiErrorHandler } from "../../DisconnectAfterRevocation";
import { CheckUserId } from "@/app/login/LoginForm";

interface OpeningHours {
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
  saturday: string;
  sunday: string;
}

const dayLabels: Record<keyof OpeningHours, string> = {
  monday: "Lundi",
  tuesday: "Mardi",
  wednesday: "Mercredi",
  thursday: "Jeudi",
  friday: "Vendredi",
  saturday: "Samedi",
  sunday: "Dimanche",
};

export default function ProfileClient() {
  const [name, setName] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [openingHours, setOpeningHours] = useState<OpeningHours>({
    monday: "",
    tuesday: "",
    wednesday: "",
    thursday: "",
    friday: "",
    saturday: "",
    sunday: "",
  });

  const { toast } = useToast();
  const fetchWithAuth = useApiErrorHandler();

  const token = getLocalStorageItem("auth_token");
  const userId = token ? CheckUserId(token) : null;

  const handleChangeHour = (day: keyof OpeningHours, value: string) => {
    setOpeningHours(prev => ({ ...prev, [day]: value }));
  };

  const handleSubmit = async () => {
    try {
      const body = { name, location, phone, openingHours };
      const res = await fetchWithAuth("/api/library", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { auth_token: token } : {}),
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Succès", description: "Profil mis à jour." });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de sauvegarder.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4 p-4 max-w-lg mx-auto">
      <div>
        <Label htmlFor="name">Nom de la bibliothèque</Label>
        <Input id="name" value={name} onChange={e => setName(e.target.value)} />
      </div>

      <div>
        <Label htmlFor="location">Adresse</Label>
        <Input id="location" value={location} onChange={e => setLocation(e.target.value)} />
      </div>

      <div>
        <Label htmlFor="phone">Téléphone</Label>
        <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label>Horaires d'ouverture</Label>
        {Object.entries(openingHours).map(([day, hours]) => (
          <div key={day} className="flex items-center space-x-2">
            <Label className="w-24" htmlFor={day}>
              {dayLabels[day as keyof OpeningHours]}
            </Label>
            <Input
              id={day}
              placeholder="ex: 09:00-18:00"
              value={hours}
              onChange={e => handleChangeHour(day as keyof OpeningHours, e.target.value)}
            />
          </div>
        ))}
      </div>

      <Button className="w-full" onClick={handleSubmit}>
        Enregistrer les modifications
      </Button>
    </div>
  );
}
