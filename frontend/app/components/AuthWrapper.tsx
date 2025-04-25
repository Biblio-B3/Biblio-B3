"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Sidebar from "./Sidebar"
import type React from "react"

type AuthWrapperProps = {
  children: React.ReactNode
}

const adminBasePaths = ["/reservations", "/books", "/users", "/reviews", "/stats", "/settings"]
const adminDynamicPaths = ["/user-history"]
const userRoutes = ["/", "/history"]
const publicRoutes = ["/login", "/register", "/reset-password"]

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const router = useRouter()
  const pathname = usePathname()

  const isAdminRoute = (path: string) => {
    return adminBasePaths.includes(path) ||
      adminDynamicPaths.some(dynamicPath => path.startsWith(dynamicPath))
  }

  const isUserRoute = (path: string) => {
    return userRoutes.includes(path)
  }

  const isPublicRoute = (path: string) => {
    return publicRoutes.includes(path)
  }

  useEffect(() => {
    const storedUserRole = localStorage.getItem("userRole")
    setUserRole(storedUserRole)

    if (!storedUserRole && !isPublicRoute(pathname)) {
      router.push("/login")
    } else if (storedUserRole) {
      setIsAuthenticated(true)

      if (storedUserRole === "admin" && !isAdminRoute(pathname)) {
        router.push("/reservations")
      } else if (storedUserRole === "user" && !isUserRoute(pathname)) {
        router.push("/")
      }
    }
  }, [pathname, router])

  if (isPublicRoute(pathname)) {
    return <>{children}</>
  }

  if (!isAuthenticated && !isPublicRoute(pathname)) {
    return null
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  )
}

