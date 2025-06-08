import { Inter } from "next/font/google"
import "./globals.css"
import ThemeProvider from "./components/ThemeProvider"
import AuthWrapper from "./components/AuthWrapper"
import { LibraryProvider } from "./components/LibraryContext"
import { TokenChecker } from "./components/TokenChecker"
import type React from "react"

const inter = Inter({ subsets: ["latin"] })

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="fr" suppressHydrationWarning>
            <body className={inter.className} suppressHydrationWarning>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="light"
                    enableSystem={false}
                    storageKey="librario-theme"
                >
                    <TokenChecker>
                        <LibraryProvider>
                            <AuthWrapper>{children}</AuthWrapper>
                        </LibraryProvider>
                    </TokenChecker>
                </ThemeProvider>
            </body>
        </html>
    )
}
