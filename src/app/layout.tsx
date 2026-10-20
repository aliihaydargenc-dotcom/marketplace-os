import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Marketplace OS | Operasyon Merkezi",
  description: "Ozon Global operasyon, stok ve finans yönetimi. İzole demo.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
