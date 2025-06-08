"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { UserStats } from "../types"

interface UsersTabProps {
  userStats: UserStats[]
}

export function UsersTab({ userStats }: UsersTabProps) {
  const router = useRouter()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Utilisateurs les Plus Actifs</CardTitle>
        </CardHeader>
        <CardContent>
          {userStats.length > 0 ? (
            <div className="space-y-4">
              {userStats.map((user, index) => (
                <div 
                  key={user.user_id} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => router.push(`/users/${user.user_id}`)}
                >
                  <div className="flex-1">
                    <h3 className="font-semibold hover:text-primary">{user.first_name} {user.last_name}</h3>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <Badge variant="secondary">{user.total_reads} lectures</Badge>
                    <Badge variant="outline">{user.total_reservations} réservations</Badge>
                    <Badge variant="outline">{user.active_reservations} actives</Badge>
                    {user.overdue_reservations > 0 && (
                      <Badge variant="destructive">{user.overdue_reservations} en retard</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              Aucune donnée d'utilisateurs disponible
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}