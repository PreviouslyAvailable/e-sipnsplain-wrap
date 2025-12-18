import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const saans = localFont({
  src: [
    {
      path: "../../public/fonts/SaansMedium.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/SaansSemiBold.woff2",
      weight: "600",
      style: "normal",
    },
  ],
  variable: "--font-saans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sip'n'Sleigh - Shared Reflection Ritual",
  description: "A shared, playful, live experience where a room of people can collectively reflect on the year—visually, emotionally, and humorously",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${saans.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
