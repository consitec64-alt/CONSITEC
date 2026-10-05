import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CONSITEC | Gestión comercial",
  description: "Panel de gestión comercial y operativa de Consitec"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

