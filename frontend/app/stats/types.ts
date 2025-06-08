// Types pour les statistiques
export type BookStats = {
  book_id: number
  title: string
  author: string
  total_reservations: number
  active_reservations: number
  total_reads: number
  average_rating: number | null
  total_copies: number
  available_copies: number
}

export type UserStats = {
  user_id: number
  first_name: string
  last_name: string
  total_reservations: number
  total_reads: number
  active_reservations: number
  overdue_reservations: number
}

export type TemporalStats = {
  period: string
  reservations_count: number
  reads_count: number
  new_users_count: number
  overdue_count: number
}

export type OccupationStats = {
  global_occupation: {
    total_copies: number
    total_reserved: number
    total_available: number
    global_occupation_rate: number
  }
  occupation_by_book: Array<{
    book_id: number
    title: string
    author: string
    total_copies: number
    reserved_copies: number
    available_copies: number
    occupation_rate: number
  }>
}

export type OverdueStats = {
  global_stats: {
    total_overdue_reservations: number
    average_days_overdue: number
    longest_overdue_days: number
    overdue_rate: number
  }
  overdue_reservations: Array<{
    reservation_id: number
    user_id: number
    user_name: string
    book_title: string
    book_author: string
    reservation_date: string
    final_date: string
    days_overdue: number
  }>
  users_with_most_overdue: Array<{
    user_id: number
    user_name: string
    total_overdue: number
    average_days_overdue: number
    longest_overdue: number
  }>
  books_with_most_overdue: Array<{
    book_id: number
    book_title: string
    book_author: string
    total_overdue: number
    average_days_overdue: number
  }>
}