"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { OccupationStats, OverdueStats } from "../types"

interface OccupationTabProps {
  occupationStats: OccupationStats | null
  overdueStats: OverdueStats | null
}

export function OccupationTab({ occupationStats, overdueStats }: OccupationTabProps) {
  const router = useRouter()

  return (
    <div className="space-y-6">
      {occupationStats && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Taux d'Occupation Global</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">{occupationStats.global_occupation.total_copies}</div>
                  <div className="text-sm text-muted-foreground">Total Copies</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{occupationStats.global_occupation.total_reserved}</div>
                  <div className="text-sm text-muted-foreground">Réservées</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{occupationStats.global_occupation.global_occupation_rate}%</div>
                  <div className="text-sm text-muted-foreground">Taux d'Occupation</div>
                </div>
              </div>
              <Progress value={occupationStats.global_occupation.global_occupation_rate} className="h-4" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Taux d'Occupation par Livre</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {occupationStats.occupation_by_book
                  .sort((a, b) => b.occupation_rate - a.occupation_rate)
                  .slice(0, 10)
                  .map((book) => (
                    <div 
                      key={book.book_id} 
                      className="space-y-2 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/books?bookId=${book.book_id}`)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium hover:text-primary">{book.title}</h4>
                          <p className="text-sm text-muted-foreground">par {book.author}</p>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{book.occupation_rate}%</div>
                          <div className="text-sm text-muted-foreground">
                            {book.reserved_copies}/{book.total_copies} réservées
                          </div>
                        </div>
                      </div>
                      <Progress value={book.occupation_rate} className="h-2" />
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {overdueStats && (
        <Card>
          <CardHeader>
            <CardTitle>Statistiques de Retard</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{overdueStats.global_stats.total_overdue_reservations}</div>
                <div className="text-sm text-muted-foreground">Réservations en Retard</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{overdueStats.global_stats.average_days_overdue}</div>
                <div className="text-sm text-muted-foreground">Jours de Retard Moyen</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{overdueStats.global_stats.overdue_rate}%</div>
                <div className="text-sm text-muted-foreground">Taux de Retard</div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold">Utilisateurs avec le Plus de Retards</h4>
              {overdueStats.users_with_most_overdue.slice(0, 5).map((user) => (
                <div 
                  key={user.user_id} 
                  className="flex justify-between items-center p-3 border rounded hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => router.push(`/users/${user.user_id}`)}
                >
                  <div>
                    <div className="font-medium hover:text-primary">{user.user_name}</div>
                  </div>
                  <div className="text-right">
                    <Badge variant="destructive">{user.total_overdue} retards</Badge>
                    <div className="text-sm text-muted-foreground mt-1">
                      Moyenne: {user.average_days_overdue} jours
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}