import type { Metadata } from "next";
import "./globals.css";
const title = "The ₹70K+ PPF Offer Secret | Free Guide for PPF Studio Owners";
const description =
  "Selling ₹70K+ PPF packages but attracting price shoppers? Download this free 5-minute offer guide for premium PPF and detailing studios.";
export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    type: "website",
    locale: "en_IN",
    siteName: "PPF Growth Resources",
  },
  twitter: { card: "summary", title, description },
  robots: { index: true, follow: true },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
