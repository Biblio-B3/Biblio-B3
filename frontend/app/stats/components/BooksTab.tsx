"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BookStats } from "../types"

interface BooksTabProps {
  bookStats: BookStats[]
}

export function BooksTab({ bookStats }: BooksTabProps) {
  const router = useRouter()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Statistiques Détaillées des Livres</CardTitle>
        </CardHeader>
        <CardContent>
          {bookStats.length > 0 ? (
            <div className="space-y-4">
              {bookStats.map((book, index) => (
                <div 
                  key={book.book_id} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => router.push(`/books?bookId=${book.book_id}`)}
                >
                  <div className="flex-1">
                    <h3 className="font-semibold hover:text-primary">{book.title}</h3>
                    <p className="text-sm text-muted-foreground">par {book.author}</p>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <Badge variant="secondary">{book.total_reservations} réservations</Badge>
                    <Badge variant="outline">{book.total_reads} lectures</Badge>
                    <Badge variant="outline">{book.available_copies}/{book.total_copies} disponibles</Badge>
                    {book.average_rating && (
                      <Badge variant="outline">★ {book.average_rating.toFixed(1)}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              Aucune donnée de livres disponible
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}