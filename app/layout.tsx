import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tether | Pull ideas forward",
  description: "A living collection of thoughts worth carrying.",
  icons: {
    icon: "/tether.jpg",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
