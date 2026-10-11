import type { Workspace } from "./types";
export function portfolioSnapshot(state: Workspace) {
  const p = state.portfolio;
  return {
    title: p.title,
    subtitle: p.subtitle,
    about: p.about,
    name: state.profile.name,
    role: state.profile.role,
    email: p.showEmail ? p.email : "",
    projects: p.projectIds
      .map((id) => state.projects.find((x) => x.id === id))
      .filter((x) => Boolean(x))
      .map((x) => ({
        title: p.projectOverrides[x!.id]?.title || x!.title,
        category: x!.category,
        period: x!.period,
        role: x!.role,
        problem: x!.problem,
        action: x!.action,
        result: p.projectOverrides[x!.id]?.result ?? x!.result,
        learning: x!.learning,
        tags: x!.tags,
        link: x!.link,
      })),
  };
}
export type PortfolioSnapshot = ReturnType<typeof portfolioSnapshot>;
