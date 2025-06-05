"use client"

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

interface OpeningHours {
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
  saturday: string;
  sunday: string;
}

const frenchDays: Record<keyof OpeningHours, string> = {
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
  const [email, setEmail] = useState<string>("");
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

  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;

  // Fetch existing library data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/library", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { auth_token: token } : {}),
          },
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setName(data.name || "");
        setEmail(data.email || "");
        setLocation(data.location || "");
        setPhone(data.phone || "");
        setOpeningHours(data.openingHours || {
          monday: "",
          tuesday: "",
          wednesday: "",
          thursday: "",
          friday: "",
          saturday: "",
          sunday: "",
        });
      } catch (err) {
        console.error("Error fetching library data:", err);
        toast({ title: "Erreur", description: "Impossible de charger les données existantes.", variant: "destructive" });
      }
    };

    fetchData();
  }, [toast, token]);

  const handleChangeHour = (day: keyof OpeningHours, value: string) => {
    setOpeningHours(prev => ({ ...prev, [day]: value }));
  };

  const handleSubmit = async () => {
    if (!name || !email || !location || !phone) {
      toast({ title: "Erreur", description: "Tous les champs doivent être remplis.", variant: "destructive" });
      return;
    }

    try {
      const body = { name, email, location, phone, openingHours };
      const res = await fetch("/api/library", {
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
      console.error("handleSubmit error", error);
      toast({ title: "Erreur", description: "Impossible de sauvegarder.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4 p-4 max-w-lg mx-auto">
      <div>
        <Label htmlFor="name">Nom de la bibliothèque</Label>
        <Input
          id="name"
          value={name}
          placeholder="Nom de la bibliothèque"
          onChange={e => setName(e.target.value)}
        />
      </div>

      <div>
        <Label htmlFor="email">Email de contact</Label>
        <Input
          id="email"
          type="email"
          value={email}
          placeholder="Adresse email"
          onChange={e => setEmail(e.target.value)}
        />
      </div>

      <div>
        <Label htmlFor="location">Adresse</Label>
        <Input
          id="location"
          value={location}
          placeholder="Adresse complète"
          onChange={e => setLocation(e.target.value)}
        />
      </div>

      <div>
        <Label htmlFor="phone">Téléphone</Label>
        <Input
          id="phone"
          value={phone}
          placeholder="Numéro de téléphone"
          onChange={e => setPhone(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Horaires d'ouverture</Label>
        {Object.entries(openingHours).map(([day, hours]) => (
          <div key={day} className="flex items-center space-x-2">
            <Label className="capitalize w-24" htmlFor={day}>{frenchDays[day as keyof OpeningHours]}</Label>
            <Input
              id={day}
              value={hours}
              placeholder="ex: 09:00-18:00"
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