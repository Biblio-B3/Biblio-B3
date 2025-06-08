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
            <head>
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
                            (function() {
                                try {
                                    // Désactive les transitions pendant le chargement
                                    document.documentElement.classList.add('no-transition');
                                    
                                    var theme = localStorage.getItem('librario-theme') || 'light';
                                    if (theme === 'dark') {
                                        document.documentElement.classList.add('dark');
                                    } else {
                                        document.documentElement.classList.remove('dark');
                                    }
                                    
                                    // Réactive les transitions après un court délai
                                    setTimeout(function() {
                                        document.documentElement.classList.remove('no-transition');
                                    }, 100);
                                } catch (e) {}
                            })();
                        `,
                    }}
                />
            </head>
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
