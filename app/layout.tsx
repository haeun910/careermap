import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  icons: { icon: "/favicon.svg" },
  title: "Careermap — 나의 다음 커리어",
  description:
    "경험을 정리하고, 기업별 지원을 준비하고, 나만의 포트폴리오를 만드세요.",
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
