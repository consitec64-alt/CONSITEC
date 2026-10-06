import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CONSITEC | Gestión comercial",
  description: "Panel de gestión comercial y operativa de Consitec",
  icons: { icon: "/consitec-logo.png", apple: "/consitec-logo.png" }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: "try{document.documentElement.dataset.theme=localStorage.getItem('consitec-theme')==='dark'?'dark':'light'}catch{}" }} /></head>
      <body>{children}</body>
    </html>
  );
}

