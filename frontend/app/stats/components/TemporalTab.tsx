"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  LineChart,
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer
} from "recharts"
import { TemporalStats } from "../types"

interface TemporalTabProps {
  temporalStats: TemporalStats[]
}

export function TemporalTab({ temporalStats }: TemporalTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Évolution Temporelle des Réservations</CardTitle>
        </CardHeader>
        <CardContent>
          {temporalStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={temporalStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="reservations_count" stroke="#8884d8" name="Réservations" />
                <Line type="monotone" dataKey="reads_count" stroke="#82ca9d" name="Lectures" />
                <Line type="monotone" dataKey="overdue_count" stroke="#ff7300" name="Retards" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[400px] text-muted-foreground">
              Aucune donnée temporelle disponible
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}