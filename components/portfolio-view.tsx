import { ArrowUpRight, ArrowDown, MoveUpRight, Compass } from "lucide-react";
import type { PortfolioSnapshot } from "@/lib/portfolio";
import { safeUrl } from "@/lib/types";
export default function PortfolioView({
  data,
  preview = false,
}: {
  data: PortfolioSnapshot;
  preview?: boolean;
}) {
  return (
    <div className={`portfolio-page ${preview ? "portfolio-embedded" : ""}`}>
      <nav>
        <a href="#" className="portfolio-wordmark">
          {data.name}
          <span>Portfolio.</span>
        </a>
        <div>
          <a href="#work">Projects</a>
          <a href="#about">About</a>
          {data.email && (
            <a href={`mailto:${data.email}`}>
              Contact <ArrowUpRight size={13} />
            </a>
          )}
        </div>
      </nav>
      <header className="portfolio-hero">
        <span className="eyebrow">
          <span className="live-dot" />
          {data.role}
        </span>
        <h1>{data.title || `${data.name}의 포트폴리오`}</h1>
        <p>{data.subtitle}</p>
        <a href="#work" className="portfolio-scroll">
          프로젝트 살펴보기 <ArrowDown size={18} />
        </a>
        <div className="portfolio-orbit">
          <div />
          <div />
          <span>
            <Compass size={58} strokeWidth={1} />
          </span>
        </div>
      </header>
      <section id="work">
        <div className="portfolio-section-head">
          <h2>
            Selected work
            <span> / {String(data.projects.length).padStart(2, "0")}</span>
          </h2>
          <p>문제를 발견하고, 경험을 설계하는 과정</p>
        </div>
        <div className="portfolio-work-grid">
          {data.projects.map((p, i) => (
            <article key={`${p.title}-${i}`} className="portfolio-work">
              <div className={`project-art art-${i % 3}`}>
                <span className="art-index">0{i + 1} / PROJECT</span>
                <div className="art-shape" />
                <span className="art-label">{p.category}</span>
                <MoveUpRight className="art-arrow" size={28} />
              </div>
              <div className="portfolio-work-info">
                <span className="eyebrow">{p.period}</span>
                <h3>{p.title}</h3>
                <p>{p.role}</p>
                <div className="tags">
                  {p.tags.map((t) => (
                    <span key={t}>{t}</span>
                  ))}
                </div>
                <details>
                  <summary>
                    문제 해결 과정 보기 <ArrowUpRight size={15} />
                  </summary>
                  <dl>
                    {[
                      ["문제", p.problem],
                      ["내 역할과 실행", p.action],
                      ["결과", p.result],
                      ["배운 점", p.learning],
                    ]
                      .filter((x) => x[1])
                      .map(([k, v]) => (
                        <div key={k}>
                          <dt>{k}</dt>
                          <dd>{v}</dd>
                        </div>
                      ))}
                  </dl>
                </details>
                {safeUrl(p.link) && (
                  <a
                    className="text-link"
                    href={safeUrl(p.link)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    결과물 보기
                    <ArrowUpRight size={15} />
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
      <section id="about" className="portfolio-about">
        <span className="eyebrow">ABOUT ME</span>
        <h2>{data.name}입니다.</h2>
        <p>
          {data.about || "경험을 통해 배우고, 더 나은 결과를 만들어갑니다."}
        </p>
        {data.email && (
          <a href={`mailto:${data.email}`}>
            {data.email}
            <ArrowUpRight size={18} />
          </a>
        )}
      </section>
      <footer>
        <span>
          © {new Date().getFullYear()} {data.name}
        </span>
        <span>
          Made with <strong>careermap</strong>
        </span>
      </footer>
    </div>
  );
}
