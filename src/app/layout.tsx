import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://learn.petersotomango.com"),
  title: {
    default: "StudyGenius - AI-Powered Study Platform",
    template: "%s | StudyGenius",
  },
  description:
    "Supercharge your learning with StudyGenius! Create AI-powered quizzes, analyze study documents, and master any subject with personalized learning assistance.",
  keywords: [
    "study platform",
    "AI learning",
    "learning platform",
    "quiz generator",
    "study assistant",
    "AI study",
    "personalized learning",
    "document analysis",
  ],
  authors: [{ name: "StudyGenius Team" }],
  creator: "StudyGenius",
  publisher: "StudyGenius",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://learn.petersotomango.com",
    siteName: "StudyGenius",
    title: "StudyGenius - AI-Powered Study Platform",
    description:
      "Supercharge your learning with StudyGenius! Create AI-powered quizzes, analyze study documents, and master any subject with personalized learning assistance.",
  },
  twitter: {
    card: "summary_large_image",
    title: "StudyGenius - AI-Powered Study Platform",
    description:
      "Supercharge your learning with StudyGenius! Create AI-powered quizzes, analyze study documents, and master any subject.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "",
    yandex: "",
    yahoo: "",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#3b82f6" />
      </head>
      <body className={inter.className}>
        {children}
        <Toaster richColors closeButton position="top-right" />
      </body>
    </html>
  );
}
