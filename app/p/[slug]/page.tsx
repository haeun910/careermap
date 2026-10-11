import { notFound } from "next/navigation";
import { getPublished } from "@/lib/store";
import PortfolioView from "@/components/portfolio-view";
import type { PortfolioSnapshot } from "@/lib/portfolio";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = (await getPublished(slug)) as PortfolioSnapshot | undefined;
  return {
    title: p ? `${p.title} — Portfolio` : "포트폴리오",
    robots: { index: false, follow: false },
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = (await getPublished(slug)) as PortfolioSnapshot | undefined;
  if (!p) notFound();
  return <PortfolioView data={p} />;
}
