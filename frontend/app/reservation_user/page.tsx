"use client";

import dynamic from "next/dynamic";

const UserReservations = dynamic(() => import("@/app/reservation_user/ReservationClientUser"), {
    ssr: false,
});

export default function UserReservationsPage() {
    return <UserReservations />;
}
