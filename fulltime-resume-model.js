/**
 * Full-time US resume tailoring model.
 * Source: recruiter playbook for full-time applications (master resume → JD-targeted version).
 * Used by rewrite/boost prompts. Integrity still wins over ATS keyword stuffing.
 */
(function (global) {
  'use strict';

  const FulltimeResumeModel = {
    id: 'jobilly-fulltime-v1',
    name: 'Full-time US resume model',
    target: 'Full-time corporate applications (ATS + recruiter scan)',

    sectionOrder: [
      'NAME / CONTACT',
      'PROFESSIONAL SUMMARY',
      'TECHNICAL SKILLS',
      'PROFESSIONAL EXPERIENCE',
      'PROJECTS (only if in master)',
      'EDUCATION',
      'CERTIFICATIONS (only if in master, last)',
    ],

    tenSecondTest: [
      'What role is this person?',
      'How many years of experience?',
      'What are the strongest technologies?',
      'What cloud / platforms (if relevant)?',
      'What problems have they solved?',
      'Are there measurable, defensible results?',
      'Does this version match THIS job description?',
    ],

    bulletPattern: 'Action → Technology → Problem → Result',
    storyShape: 'Business problem → Data/ops problem → Approach → Technologies used → Contribution → Result',

    /**
     * Prompt block injected into tailor/boost. Keep compact; integrity rules stay in the host prompt.
     */
    promptBlock(opts) {
      const threshold = (opts && opts.threshold) || 95;
      const primary = (opts && opts.primary) || [];
      const secondary = (opts && opts.secondary) || [];
      return `FULL-TIME RESUME MODEL (${this.id}) — follow this as the quality model for the rewrite.

PURPOSE
Treat the resume as a marketing document for THIS job, not a complete history dump.
Start from the MASTER resume (locked facts). Produce a targeted version for the JD.

LENGTH
- 0–5 years: aim for 1 page
- 5+ years: 2 pages is OK
- Never 3+ pages. Prefer shortening bullets over dropping real roles.

10-SECOND TEST (top third must answer all 7)
1. Role  2. Years  3. Strongest tech  4. Cloud/platforms  5. Problems solved  6. Measurable results  7. Match to this JD

STRUCTURE (exact order)
NAME/CONTACT → PROFESSIONAL SUMMARY → TECHNICAL SKILLS → PROFESSIONAL EXPERIENCE → PROJECTS (if in master) → EDUCATION → CERTIFICATIONS (if in master, last)
Experience is the largest section. Education is concise (no coursework unless early-career). No photos, icons, skill bars, tables, or graphics.

SUMMARY
- Short professional summary — not a generic objective.
- Descriptive/general language: who they are, years, domains, environments, kinds of work.
- Do NOT dump a tool list in Summary. Exact tools belong in Skills + Experience.
- No "Seeking a challenging position…" copy.

SKILLS
- Organize around THIS JD (Languages / Cloud / Tools / Platforms / Methodologies as the master already uses).
- Do NOT list every technology the candidate has ever seen.
- Add a JD keyword to Skills ONLY if it is already on the master resume OR is a close family of a skill already there (e.g. Spark present → Apache Spark OK).
- NEVER add Kafka / Kubernetes / Terraform / etc. solely because the JD lists them if the master has no related experience. Credibility > stuffing.
- Use the JD's wording when accurate (JD says "Apache Airflow" → write Apache Airflow, not "workflow management").

EXPERIENCE BULLETS
Pattern: ${this.bulletPattern}
Story: ${this.storyShape}
- Each bullet answers "So what?" — accomplishment, not "responsible for".
- Front-load the strongest verb or fact.
- 1–2 lines typical; 3 only if the result needs it. No giant paragraphs.
- Quantify ONLY with numbers the candidate can defend in an interview. If the master has no number, write a strong truthful outcome without inventing TB/%, hours, or $.
- Show JD technologies inside real work: "Built PySpark ETL on AWS EMR, orchestrated in Airflow" — not "Worked on data pipelines using various technologies."
- Show progression: early roles = execution; recent = ownership / design / mentoring if that is true. Do not inflate "contributed" into "architected".
- Vary verbs. Ban: responsible for, worked on, utilized, leveraged, results-driven, passionate, team player.

KEYWORDS (ATS without stuffing)
Primary JD skills to demonstrate (only if truthful): ${primary.join(', ') || '(none)'}
Secondary (only if truthful): ${secondary.join(', ') || '(none)'}
- Exact skill names: TECHNICAL SKILLS + EXPERIENCE bullets.
- Summary: expanded descriptive phrases for JD themes, not token spam.
- Do not repeat one keyword 10+ times.

INTEGRITY (overrides ATS)
- Never invent companies, titles, dates, education, certifications, locations, or LinkedIn.
- Never add a technology the candidate cannot explain.
- Keep every real role. Shorten bullets; do not drop jobs.
- Target readiness ${threshold}+ by covering real JD overlap well — not by fabricating keywords or metrics.

BEFORE OUTPUT — silent 10-second check: a recruiter scanning 10 seconds would answer yes to all 7 test questions.`;
    },
  };

  global.FulltimeResumeModel = FulltimeResumeModel;
})(typeof window !== 'undefined' ? window : globalThis);
