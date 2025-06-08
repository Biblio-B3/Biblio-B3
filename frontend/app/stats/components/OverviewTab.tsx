"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from "recharts"
import { BookStats, UserStats, OccupationStats, OverdueStats } from "../types"

interface OverviewTabProps {
  bookStats: BookStats[]
  userStats: UserStats[]
  occupationStats: OccupationStats | null
  overdueStats: OverdueStats | null
}

export function OverviewTab({ bookStats, userStats, occupationStats, overdueStats }: OverviewTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {occupationStats && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Copies</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{occupationStats.global_occupation.total_copies}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Copies Réservées</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{occupationStats.global_occupation.total_reserved}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Taux d'Occupation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{occupationStats.global_occupation.global_occupation_rate}%</div>
                <Progress value={occupationStats.global_occupation.global_occupation_rate} className="mt-2" />
              </CardContent>
            </Card>
          </>
        )}
        {overdueStats && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Retards</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overdueStats.global_stats.total_overdue_reservations}</div>
              <p className="text-xs text-muted-foreground">
                {overdueStats.global_stats.overdue_rate}% du total
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Livres les Plus Réservés</CardTitle>
          </CardHeader>
          <CardContent>
            {bookStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={bookStats.slice(0, 5)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="title" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="total_reservations" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Aucune donnée de livres disponible
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top 5 Utilisateurs les Plus Actifs</CardTitle>
          </CardHeader>
          <CardContent>
            {userStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={userStats.slice(0, 5).map(user => ({
                  ...user,
                  name: `${user.first_name} ${user.last_name}`
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="total_reads" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Aucune donnée d'utilisateurs disponible
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}