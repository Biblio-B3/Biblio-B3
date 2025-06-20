import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Mon Profil',
  description: 'Gérez votre profil utilisateur',
  openGraph: {
    title: 'Mon Profil',
    description: 'Gérez votre profil utilisateur',
    url: '/profile',
    type: 'website'
  }
}

import ProfileClient from "./ProfileClient"

export default function ProfilePage() {
    return (
        <div className="space-y-4">
            <h1 className="text-3xl font-bold">Gestion du Profil</h1>
            <ProfileClient />
        </div>
    )
}
