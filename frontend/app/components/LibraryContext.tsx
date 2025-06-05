"use client";

import { createContext, useContext, useState, useEffect } from "react";

interface OpeningHours {
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
  saturday: string;
  sunday: string;
}

interface LibraryContextType {
  libraryName: string;
  address: string;
  email: string;
  phone: string;
  openingHours: OpeningHours;
  setLibraryName: (name: string) => void;
}

const LibraryContext = createContext<LibraryContextType>({
  libraryName: "Biblio",
  address: "",
  email: "",
  phone: "",
  openingHours: {
    monday: "",
    tuesday: "",
    wednesday: "",
    thursday: "",
    friday: "",
    saturday: "",
    sunday: "",
  },
  setLibraryName: () => { },
});

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [libraryName, setLibraryName] = useState("Biblio");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [openingHours, setOpeningHours] = useState<OpeningHours>({
    monday: "",
    tuesday: "",
    wednesday: "",
    thursday: "",
    friday: "",
    saturday: "",
    sunday: "",
  });

  useEffect(() => {
    const fetchLibrary = async () => {
      try {
        const res = await fetch("/api/library");
        if (res.ok) {
          const data = await res.json();
          setLibraryName(data.name);
          setAddress(data.location);
          setEmail(data.email);
          setPhone(data.phone);
          setOpeningHours(data.openingHours);
        }
      } catch (err) {
        console.error("Erreur fetch library:", err);
      }
    };
    fetchLibrary();
  }, []);

  useEffect(() => {
    document.title = libraryName;
  }, [libraryName]);

  return (
    <LibraryContext.Provider value={{ libraryName, address, email, phone, openingHours, setLibraryName }}>
      {children}
    </LibraryContext.Provider>
  );
}

export function useLibrary() {
  return useContext(LibraryContext);
}
