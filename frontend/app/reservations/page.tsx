import { Metadata } from 'next'
import ReservationsClient from "./ReservationsClient"

export const metadata: Metadata = {
  title: 'Gestion des réservations',
  description: 'Gérez vos réservations de livres',
  openGraph: {
    title: 'Gestion des réservations',
    description: 'Gérez vos réservations de livres',
    url: '/reservations',
    type: 'website'
  }
}

export default function ReservationsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Gestion des réservations</h1>
      <ReservationsClient />
    </div>
  )
}

