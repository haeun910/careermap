import type { Project } from "./types";
export function strategyProjects(projects: Project[], ids: string[]) {
  return projects
    .filter((p) => ids.includes(p.id))
    .slice(0, 3)
    .map((p) => ({
      id: p.id,
      title: p.title,
      role: p.role,
      problem: p.problem.slice(0, 400),
      action: p.action.slice(0, 800),
      result: p.result.slice(0, 400),
      learning: p.learning.slice(0, 300),
      tags: p.tags.slice(0, 6).map((t) => t.slice(0, 40)),
    }));
}
export function experienceSignature(projects: Project[], ids: string[]) {
  // Change detection only; authorization always uses the current server session.
  const data = JSON.stringify(strategyProjects(projects, ids));
  let a = 2166136261,
    b = 0x9e3779b9;
  for (let i = 0; i < data.length; i++) {
    a = Math.imul(a ^ data.charCodeAt(i), 16777619);
    b = Math.imul(b ^ data.charCodeAt(i), 0x85ebca6b);
  }
  return (a >>> 0).toString(16) + "-" + (b >>> 0).toString(16);
}
