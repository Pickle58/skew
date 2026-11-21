import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/next";
import { PostHogUserIdentification } from "@/components/auth/sign-up-tracker";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Skew",
  description: "Balanced news coverage, powered by AI.",
};

const clerkAppearance = {
  variables: {
    colorPrimary: "#00000f",
    colorForeground: "#00000f",
    colorMutedForeground: "#68728d",
    colorBackground: "#ffffff",
    colorInput: "#ffffff",
    colorBorder: "#e5e7eb",
    fontFamily: "var(--font-poppins), sans-serif",
    borderRadius: "8px",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${poppins.variable} h-full antialiased`}>
      <body className="min-h-full bg-surface font-sans text-ink">
        <ClerkProvider appearance={clerkAppearance}>
          <PostHogUserIdentification />
          {children}
        </ClerkProvider>
        <Analytics />
      </body>
    </html>
  );
}
