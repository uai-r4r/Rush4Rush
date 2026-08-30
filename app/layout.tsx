import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import Navbar, { Footer } from "@/components/navbar";
import { Reveal } from "@/components/reveal";
import { getCurrentUser } from "@/lib/auth-server";

export const metadata: Metadata = {
  title: "Rush4Rush // The Ultimate College Festival",
  description:
    "21 clubs. 20 events. 1 unforgettable weekend. Rush4Rush is the most kinetic campus event of the year.",
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#04050d",
  width: "device-width",
  initialScale: 1,
};

/**
 * Now async: resolves the real session server-side and hands it to the
 * provider. This is why the navbar renders the right links on first paint
 * instead of flashing "Login" and then correcting itself.
 */
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();

  return (
    <html lang="en" className="bg-background dark" data-scroll-behavior="smooth">
      <body className="antialiased">
        <AuthProvider initialUser={user}>
          <Navbar />
          {children}
          <Footer />
        </AuthProvider>
        <Reveal />
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  );
}
