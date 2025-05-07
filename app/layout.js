import './globals.css'
import { Inter } from 'next/font/google'
import { Toaster } from "./components/ui/toaster"
import { ThemeProvider } from './context/ThemeContext'
import { GlobalProvider } from './context/GlobalContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'WePay - Secure Payments',
  description: 'A secure payment solution for everyone',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <GlobalProvider>
              {children}
              <Toaster />
            </GlobalProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
