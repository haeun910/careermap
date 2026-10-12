import type { ResumeData, ResumeEntry } from "@/lib/document-builder";
export default function ResumeSheet({ value: r }: { value: ResumeData }) {
  const entries = (title: string, items: ResumeEntry[]) =>
    items.length > 0 && (
      <section className="resume-sheet-section">
        <h2>{title}</h2>
        {items.map((e) => (
          <div className="resume-sheet-entry" key={e.id}>
            <div>
              <h3>{e.title || "항목 이름 미입력"}</h3>
              {e.period && <span>{e.period}</span>}
            </div>
            {e.detail && <p className="resume-sheet-detail">{e.detail}</p>}
            {e.description && <p className="preserve">{e.description}</p>}
          </div>
        ))}
      </section>
    );
  return (
    <div className="resume-sheet">
      <header>
        <h1>{r.name || "이름 미입력"}</h1>
        {r.headline && <p>{r.headline}</p>}
        {(r.email || r.phone || r.portfolio) && (
          <div className="resume-sheet-contact">
            {[r.email, r.phone, r.portfolio]
              .filter(Boolean)
              .map((value, index) => (
                <span key={index}>{value}</span>
              ))}
          </div>
        )}
      </header>
      {r.summary && (
        <section className="resume-sheet-section">
          <h2>소개</h2>
          <p className="preserve">{r.summary}</p>
        </section>
      )}
      {r.skills && (
        <section className="resume-sheet-section">
          <h2>보유 역량</h2>
          <p className="preserve">{r.skills}</p>
        </section>
      )}
      {entries("학력", r.education)}
      {entries("경력", r.career)}
      {entries("프로젝트 · 활동", r.experiences)}
      {entries("자격 · 수상 · 교육", r.credentials)}
    </div>
  );
}
