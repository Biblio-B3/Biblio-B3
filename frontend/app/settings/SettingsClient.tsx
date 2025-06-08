"use client"

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { authFetch } from "@/app/utils/authFetch";

interface DayHours {
  open: string;
  close: string;
  closed: boolean;
}

interface OpeningHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
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
    monday: { open: "", close: "", closed: false },
    tuesday: { open: "", close: "", closed: false },
    wednesday: { open: "", close: "", closed: false },
    thursday: { open: "", close: "", closed: false },
    friday: { open: "", close: "", closed: false },
    saturday: { open: "", close: "", closed: false },
    sunday: { open: "", close: "", closed: false },
  });

  const { toast } = useToast();

  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;

  // Fetch existing library data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await authFetch("/api/library");
        if (!res.ok) throw new Error();
        const data = await res.json();
        setName(data.name || "");
        setEmail(data.email || "");
        setLocation(data.location || "");
        setPhone(data.phone || "");
        // Convertir l'ancien format vers le nouveau si nécessaire
        const hours = data.openingHours || {};
        const convertedHours: OpeningHours = {} as OpeningHours;
        
        Object.keys(frenchDays).forEach(day => {
          const dayKey = day as keyof OpeningHours;
          const oldValue = hours[dayKey];
          
          if (typeof oldValue === 'string') {
            // Vérifier si le jour est fermé
            if (oldValue === 'Fermé' || oldValue.toLowerCase() === 'fermé') {
              convertedHours[dayKey] = { open: "", close: "", closed: true };
            } else if (oldValue.includes('-')) {
              // Conversion de l'ancien format "09:00-18:00" vers le nouveau
              const [open, close] = oldValue.split('-');
              convertedHours[dayKey] = { open: open.trim(), close: close.trim(), closed: false };
            } else if (oldValue) {
              convertedHours[dayKey] = { open: oldValue.trim(), close: "", closed: false };
            } else {
              convertedHours[dayKey] = { open: "", close: "", closed: false };
            }
          } else {
            // Nouveau format déjà en place
            convertedHours[dayKey] = oldValue || { open: "", close: "", closed: false };
          }
        });
        
        setOpeningHours(convertedHours);
      } catch (err) {
        console.error("Error fetching library data:", err);
        toast({ title: "Erreur", description: "Impossible de charger les données existantes.", variant: "destructive" });
      }
    };

    fetchData();
  }, [toast, token]);

  const handleChangeHour = (day: keyof OpeningHours, field: 'open' | 'close' | 'closed', value: string | boolean) => {
    setOpeningHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };

  // Convertir les horaires pour l'envoi au serveur
  const convertHoursForSubmit = (hours: OpeningHours) => {
    const converted: Record<string, string> = {};
    Object.entries(hours).forEach(([day, dayHours]) => {
      if (dayHours.closed) {
        converted[day] = "Fermé";
      } else if (dayHours.open && dayHours.close) {
        converted[day] = `${dayHours.open}-${dayHours.close}`;
      } else if (dayHours.open) {
        converted[day] = dayHours.open;
      } else {
        converted[day] = "";
      }
    });
    return converted;
  };

  const handleSubmit = async () => {
    if (!name || !email || !location || !phone) {
      toast({ title: "Erreur", description: "Tous les champs doivent être remplis.", variant: "destructive" });
      return;
    }

    try {
      const body = { name, email, location, phone, openingHours: convertHoursForSubmit(openingHours) };
      const res = await authFetch("/api/library", {
        method: "PUT",
        body: JSON.stringify(body),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Erreur inconnue" }));
        throw new Error(errorData.message || `Erreur ${res.status}: ${res.statusText}`);
      }
      
      toast({ title: "Succès", description: "Profil mis à jour." });
      
      // Recharger la page immédiatement après la sauvegarde réussie
      window.location.reload();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Impossible de sauvegarder.";
      toast({ title: "Erreur", description: errorMessage, variant: "destructive" });
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

      <div className="space-y-3">
        <Label>Horaires d'ouverture</Label>
        {Object.entries(openingHours).map(([day, dayHours]) => (
          <div key={day} className="space-y-2 p-3 border rounded-lg">
            <div className="flex items-center justify-between">
              <Label className="font-medium">{frenchDays[day as keyof OpeningHours]}</Label>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id={`${day}-closed`}
                  checked={dayHours.closed}
                  onChange={(e) => handleChangeHour(day as keyof OpeningHours, 'closed', e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor={`${day}-closed`} className="text-sm">Fermé</Label>
              </div>
            </div>
            
            {!dayHours.closed && (
              <div className="flex items-center space-x-2">
                <div className="flex-1">
                  <Label htmlFor={`${day}-open`} className="text-sm text-gray-600">Ouverture</Label>
                  <Input
                    id={`${day}-open`}
                    type="time"
                    value={dayHours.open}
                    onChange={(e) => handleChangeHour(day as keyof OpeningHours, 'open', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor={`${day}-close`} className="text-sm text-gray-600">Fermeture</Label>
                  <Input
                    id={`${day}-close`}
                    type="time"
                    value={dayHours.close}
                    onChange={(e) => handleChangeHour(day as keyof OpeningHours, 'close', e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <Button className="w-full" onClick={handleSubmit}>
        Enregistrer les modifications
      </Button>
    </div>
  );
}