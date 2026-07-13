import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono, Oswald } from "next/font/google";
import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const bigShoulders = Oswald({
  variable: "--font-big-shoulders",
  subsets: ["latin"],
  weight: ["700"],
});

export const metadata: Metadata = {
  title: "Cryogenic Surface Code & Circuit Composer Studio",
  description: "Dynamic, production-grade full-stack web application visualizing Microsecond Cryogenic Latency Bottlenecks.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${ibmPlexSans.variable} ${ibmPlexMono.variable} ${bigShoulders.variable} h-full antialiased`}
    >
      <body className="h-full w-full flex flex-col font-sans select-none overflow-hidden bg-void text-text-main">
        {children}
      </body>
    </html>
  );
}
