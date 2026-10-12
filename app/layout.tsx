import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  icons: { icon: "/favicon.svg" },
  title: "이음(IEUM) — 나의 다음 커리어",
  description:
    "경험과 기회를 잇는 이음. 나를 이해하고, 지원 자료를 준비하고, 나만의 포트폴리오를 만드세요.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
