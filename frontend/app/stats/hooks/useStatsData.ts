"use client"

import { useState, useEffect } from "react"
import { authFetch } from "@/app/utils/authFetch"
import { BookStats, UserStats, TemporalStats, OccupationStats, OverdueStats } from "../types"

export function useStatsData() {
  const [bookStats, setBookStats] = useState<BookStats[]>([])
  const [userStats, setUserStats] = useState<UserStats[]>([])
  const [temporalStats, setTemporalStats] = useState<TemporalStats[]>([])
  const [occupationStats, setOccupationStats] = useState<OccupationStats | null>(null)
  const [overdueStats, setOverdueStats] = useState<OverdueStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAllStats = async () => {
      try {
        setLoading(true)
        setError(null)

        // Récupérer toutes les statistiques en parallèle
        const [
          booksResponse,
          usersResponse,
          temporalResponse,
          occupationResponse,
          overdueResponse
        ] = await Promise.all([
          authFetch('/api/stats/books-most-reserved?limit=10'),
          authFetch('/api/stats/users-most-active?limit=10'),
          authFetch('/api/stats/temporal-evolution?period=month&months=12'),
          authFetch('/api/stats/occupation-rate'),
          authFetch('/api/stats/overdue-statistics')
        ])

        // Vérifier les erreurs 404
        const responses = [
          { response: booksResponse, name: 'livres les plus réservés' },
          { response: usersResponse, name: 'utilisateurs les plus actifs' },
          { response: temporalResponse, name: 'évolution temporelle' },
          { response: occupationResponse, name: 'taux d\'occupation' },
          { response: overdueResponse, name: 'statistiques de retard' }
        ]

        const errors = responses
          .filter(({ response }) => response.status === 404)
          .map(({ name }) => name)

        if (errors.length > 0) {
          setError(`Erreur 404 : Les statistiques suivantes ne sont pas disponibles : ${errors.join(', ')}`)
          return
        }

        // Vérifier les autres erreurs
        const otherErrors = responses
          .filter(({ response }) => !response.ok && response.status !== 404)
          .map(({ name, response }) => `${name} (${response.status})`)

        if (otherErrors.length > 0) {
          setError(`Erreur lors du chargement des statistiques : ${otherErrors.join(', ')}`)
          return
        }

        // Traiter les réponses réussies et vérifier les données
        let hasData = false
        
        if (booksResponse.ok) {
          const booksData = await booksResponse.json()
          if (!booksData || booksData.length === 0) {
            console.warn('Aucune donnée de livres disponible')
          } else {
            hasData = true
          }
          setBookStats(booksData || [])
        }

        if (usersResponse.ok) {
          const usersData = await usersResponse.json()
          if (!usersData || usersData.length === 0) {
            console.warn('Aucune donnée d\'utilisateurs disponible')
          } else {
            hasData = true
          }
          setUserStats(usersData || [])
        }

        if (temporalResponse.ok) {
          const temporalData = await temporalResponse.json()
          if (!temporalData || temporalData.length === 0) {
            console.warn('Aucune donnée temporelle disponible')
          } else {
            hasData = true
          }
          setTemporalStats(temporalData || [])
        }

        if (occupationResponse.ok) {
          const occupationData = await occupationResponse.json()
          if (!occupationData) {
            console.warn('Aucune donnée d\'occupation disponible')
          } else {
            hasData = true
          }
          setOccupationStats(occupationData || null)
        }

        if (overdueResponse.ok) {
          const overdueData = await overdueResponse.json()
          if (!overdueData) {
            console.warn('Aucune donnée de retard disponible')
          } else {
            hasData = true
          }
          setOverdueStats(overdueData || null)
        }

        if (!hasData) {
          setError('Aucune donnée statistique n\'est disponible pour le moment')
        }

      } catch (err) {
        console.error('Erreur lors du chargement des statistiques:', err)
        setError('Erreur de connexion lors du chargement des statistiques')
      } finally {
        setLoading(false)
      }
    }

    fetchAllStats()
  }, [])

  return {
    bookStats,
    userStats,
    temporalStats,
    occupationStats,
    overdueStats,
    loading,
    error
  }
}