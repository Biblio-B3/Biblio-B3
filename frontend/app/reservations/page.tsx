import ReservationsClient from "../components/admin/reservations/ReservationsClient";

export default function ReservationsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Gestion des réservations</h1>
      <ReservationsClient />
    </div>
  );
}
