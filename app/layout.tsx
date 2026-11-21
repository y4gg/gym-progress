import type { Metadata, Viewport } from "next";
import { Barlow_Semi_Condensed } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import Hydration from "@/components/hydration";
import { AppNavbar } from "@/components/app-navbar";
import { SyncProvider } from "@/components/sync-provider";
import { AppNavigation } from "@/components/app-navigation";
import { AppScreen } from "@/components/offline-app";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import { PageTransition } from "@/components/page-transition";
import { PwaOnboardingProvider } from "@/components/pwa-onboarding-provider";

const barlowSemiCondensed = Barlow_Semi_Condensed({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-barlow-semi-condensed",
  fallback: ["sans-serif"],
});

export const metadata: Metadata = {
  title: "Gym Ladder",
  applicationName: "Gym Ladder",
  description: "Track your gym progress",
  appleWebApp: {
    capable: true,
    title: "Gym Ladder",
    statusBarStyle: "default",
  },
  icons: { icon: "/icons/icon.svg", apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#171917",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      suppressHydrationWarning
      lang="en"
      className={`h-full antialiased ${barlowSemiCondensed.variable}`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <AppNavigation>
            <Hydration />
            <SyncProvider />
            <ServiceWorkerRegistration />
            <Suspense fallback={null}>
              <PwaOnboardingProvider>
                <div className="min-w-0 flex-1 lg:pl-72">
                  <PageTransition>
                    <AppScreen>{children}</AppScreen>
                  </PageTransition>
                </div>
                <AppNavbar />
              </PwaOnboardingProvider>
            </Suspense>
          </AppNavigation>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
