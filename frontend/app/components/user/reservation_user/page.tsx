"use client";

import dynamic from "next/dynamic";

const UserReservations = dynamic(() => import("./ReservationClientUser"), {
    ssr: false,
});

export default function UserReservationsPage() {
    return <UserReservations />;
}
