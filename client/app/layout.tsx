import { ThemeProvider } from "@/components/providers/theme.provider";
import "./globals.css";

import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import QueryProvider from "@/components/providers/query.provider";
// import { Toaster } from '@/components/ui/toaster'
// Update the import path below if the file exists elsewhere, for example:
import { Toaster } from "@/components/ui/toaster";
// Or create the missing file at 'components/ui/toaster.tsx' if it does not exist.
import SessionProvider from "@/components/providers/session.provider";

const spaceGrotesk = Space_Grotesk({
  weight: ["400", "500", "600", "700", "300"],
  subsets: ["latin"],
  variable: "--font-spaceGrotesk",
});

export const metadata: Metadata = {
  title: "Gap web",
  description: "Gap web application  created by Beggi.ac",
  icons: { icon: "/gap_mod.png" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SessionProvider>
      <QueryProvider>
        <html lang="en" suppressHydrationWarning>
          <body
            className={`${spaceGrotesk.variable} antialiased sidebar-custom-scrollbar`}
            suppressHydrationWarning
          >
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <main>{children}</main>

              <Toaster />
            </ThemeProvider>
          </body>
        </html>
      </QueryProvider>
    </SessionProvider>
  );
}
