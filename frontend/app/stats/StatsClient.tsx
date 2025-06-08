"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useStatsData } from "./hooks/useStatsData"
import {
  OverviewTab,
  BooksTab,
  UsersTab,
  TemporalTab,
  OccupationTab
} from "./components"

export default function StatsClient() {
  const {
    bookStats,
    userStats,
    temporalStats,
    occupationStats,
    overdueStats,
    loading,
    error
  } = useStatsData()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Chargement des statistiques...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-500">{error}</div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="books">Livres</TabsTrigger>
          <TabsTrigger value="users">Utilisateurs</TabsTrigger>
          <TabsTrigger value="temporal">Évolution</TabsTrigger>
          <TabsTrigger value="occupation">Occupation</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab
            bookStats={bookStats}
            userStats={userStats}
            occupationStats={occupationStats}
            overdueStats={overdueStats}
          />
        </TabsContent>

        <TabsContent value="books">
          <BooksTab bookStats={bookStats} />
        </TabsContent>

        <TabsContent value="users">
          <UsersTab userStats={userStats} />
        </TabsContent>

        <TabsContent value="temporal">
          <TemporalTab temporalStats={temporalStats} />
        </TabsContent>

        <TabsContent value="occupation">
          <OccupationTab
            occupationStats={occupationStats}
            overdueStats={overdueStats}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
