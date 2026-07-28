/**
 * Local RAG engine for ATS resume scoring & keyword extraction.
 * Zero API cost for: keyword extraction, ATS scoring, gap analysis.
 * Gemini is only needed for resume rewrite/boost.
 */
(function (global) {
  'use strict';

  // ─── SKILL / ATS KNOWLEDGE BASE ─────────────────────────────────
  const SKILL_KB = [
    { label: 'Python', terms: ['python', 'django', 'flask', 'fastapi', 'pandas', 'numpy', 'scipy'] },
    { label: 'JavaScript', terms: ['javascript', 'typescript', 'node.js', 'nodejs', 'react', 'vue', 'angular', 'next.js'] },
    { label: 'Java', terms: ['java', 'spring boot', 'spring', 'hibernate', 'maven', 'gradle'] },
    { label: 'C#', terms: ['c#', 'csharp', '.net', 'asp.net', 'entity framework'] },
    { label: 'Go', terms: ['golang', ' go '] },
    { label: 'Rust', terms: ['rust'] },
    { label: 'SQL', terms: ['sql', 'postgresql', 'mysql', 'oracle', 't-sql', 'pl/sql', 'sqlite'] },
    { label: 'NoSQL', terms: ['mongodb', 'dynamodb', 'cassandra', 'redis', 'elasticsearch'] },
    { label: 'AWS', terms: ['aws', 'amazon web services', 'ec2', 's3', 'lambda', 'rds', 'cloudformation'] },
    { label: 'Azure', terms: ['azure', 'microsoft azure', 'azure devops', 'azure functions'] },
    { label: 'GCP', terms: ['gcp', 'google cloud', 'bigquery', 'cloud run', 'gke'] },
    { label: 'Docker', terms: ['docker', 'containerization', 'containers'] },
    { label: 'Kubernetes', terms: ['kubernetes', 'k8s', 'helm', 'eks', 'aks', 'gke'] },
    { label: 'CI/CD', terms: ['ci/cd', 'cicd', 'jenkins', 'github actions', 'gitlab ci', 'circleci', 'continuous integration', 'continuous deployment'] },
    { label: 'Terraform', terms: ['terraform', 'infrastructure as code', 'iac'] },
    { label: 'Machine Learning', terms: ['machine learning', 'ml', 'deep learning', 'neural network', 'scikit-learn', 'tensorflow', 'pytorch'] },
    { label: 'LLM', terms: ['llm', 'llms', 'large language model', 'gpt', 'chatgpt', 'openai', 'claude', 'gemini'] },
    { label: 'RAG', terms: ['rag', 'retrieval augmented generation', 'vector database', 'embeddings', 'semantic search'] },
    { label: 'LangChain', terms: ['langchain', 'langgraph', 'llamaindex'] },
    { label: 'NLP', terms: ['nlp', 'natural language processing', 'spacy', 'hugging face', 'transformers'] },
    { label: 'Data Engineering', terms: ['data engineering', 'etl', 'data pipeline', 'apache spark', 'databricks', 'airflow', 'dbt'] },
    { label: 'REST API', terms: ['rest api', 'restful', 'graphql', 'api design', 'microservices'] },
    { label: 'Agile', terms: ['agile', 'scrum', 'kanban', 'sprint', 'jira'] },
    { label: 'DevOps', terms: ['devops', 'site reliability', 'sre', 'observability', 'prometheus', 'grafana'] },
    { label: 'Testing', terms: ['unit testing', 'integration testing', 'qa', 'test automation', 'pytest', 'jest', 'selenium', 'cypress'] },
    { label: 'Security', terms: ['cybersecurity', 'oauth', 'jwt', 'encryption', 'penetration testing', 'soc 2'] },
    { label: 'Linux', terms: ['linux', 'bash', 'shell scripting', 'unix'] },
    { label: 'Git', terms: ['git', 'github', 'gitlab', 'bitbucket', 'version control'] },
    { label: 'Power BI', terms: ['power bi', 'tableau', 'looker', 'data visualization'] },
    { label: 'Snowflake', terms: ['snowflake', 'data warehouse'] },
    { label: 'Kafka', terms: ['kafka', 'event streaming', 'message queue', 'rabbitmq', 'sqs'] },
    { label: 'SAP', terms: ['sap', 's/4hana', 'abap'] },
    { label: 'Salesforce', terms: ['salesforce', 'apex', 'lightning'] },
    { label: 'Project Management', terms: ['project management', 'pmp', 'stakeholder management', 'cross-functional'] },
    { label: 'AI Engineer', terms: ['ai engineer', 'ml engineer', 'machine learning engineer', 'ai/ml'] },
    { label: 'Software Engineer', terms: ['software engineer', 'software developer', 'full stack', 'backend engineer', 'frontend engineer'] },
    { label: 'Data Scientist', terms: ['data scientist', 'data science', 'statistical modeling'] },
    { label: 'Business Analyst', terms: ['business analyst', 'requirements gathering', 'user stories'] },
    { label: 'Product Manager', terms: ['product manager', 'product owner', 'roadmap'] },
    { label: 'Cloud Architecture', terms: ['cloud architecture', 'solution architect', 'system design'] },
    { label: 'AutoGen', terms: ['autogen', 'multi-agent', 'agentic ai', 'ai agents'] },
    { label: 'MLOps', terms: ['mlops', 'model deployment', 'model serving', 'feature store'] },
    { label: 'HTML/CSS', terms: ['html', 'css', 'responsive design', 'tailwind'] },
    { label: 'Mobile Development', terms: ['ios', 'android', 'swift', 'kotlin', 'react native', 'flutter'] },
    { label: 'ITIL', terms: ['itil', 'service desk', 'incident management'] },
    { label: 'SAP Fiori', terms: ['fiori', 'sap ui5'] },
    { label: 'Dependency Injection', terms: ['dependency injection', 'ioc', 'inversion of control'] },
    { label: 'Code Generation', terms: ['code generation', 'github copilot', 'copilot', 'generative ai'] },
  ];

  const ATS_RULES_KB = [
    { id: 'kw-primary', text: 'Primary keywords must appear in skills section and experience bullets for ATS match score' },
    { id: 'kw-secondary', text: 'Secondary keywords should appear at least once in resume body or skills' },
    { id: 'metrics', text: 'Quantified bullets with numbers percentages dollar amounts improve ATS and recruiter scores' },
    { id: 'summary-title', text: 'Summary first sentence should mirror exact job title from job description' },
    { id: 'format-headers', text: 'Use ALL CAPS section headers SUMMARY SKILLS EXPERIENCE EDUCATION plain text single column' },
    { id: 'format-bullets', text: 'Use hyphen bullets avoid tables columns icons special unicode' },
    { id: 'sections', text: 'Required sections SUMMARY SKILLS EXPERIENCE EDUCATION must all be present' },
  ];

  const KEYWORD_EXPANSIONS = {
    'retrieval augmented generation': ['RAG'],
    'large language model': ['LLM', 'LLMs'],
    'llms': ['LLM', 'Large Language Model'],
    'llm': ['LLMs', 'Large Language Model'],
    'natural language processing': ['NLP'],
    'ci/cd': ['CI/CD', 'CICD', 'continuous integration'],
    'rest apis': ['REST API', 'RESTful'],
    'rest api': ['REST APIs', 'RESTful'],
    'qa automation': ['test automation', 'automated testing', 'QA'],
    'ai engineer': ['AI Engineer', 'ML Engineer', 'machine learning engineer'],
    'langchain': ['LangChain', 'LangGraph'],
    'langgraph': ['LangGraph'],
    'openai': ['OpenAI', 'GPT', 'ChatGPT'],
    'databricks': ['Databricks', 'Apache Spark'],
    'embeddings': ['embedding', 'vector embedding'],
    'software engineering': ['software development', 'software engineer'],
    'code generation': ['generative AI', 'GitHub Copilot'],
  };

  const STOP_TERMS = new Set([
    'the', 'and', 'for', 'with', 'you', 'our', 'will', 'have', 'this', 'that', 'your',
    'are', 'from', 'able', 'work', 'team', 'role', 'job', 'years', 'year', 'experience',
    'required', 'preferred', 'including', 'using', 'within', 'across', 'ability', 'strong',
    'excellent', 'good', 'must', 'should', 'would', 'about', 'company', 'position',
    'hybrid', 'remote', 'onsite', 'full', 'time', 'benefits', 'salary', 'equal',
    'opportunity', 'employer', 'applicants', 'candidate', 'candidates', 'skills',
    'responsibilities', 'requirements', 'qualifications', 'description', 'summary',
  ]);

  // ─── BM25 ───────────────────────────────────────────────────────
  function tokenize(text) {
    return (text.toLowerCase().match(/[a-z0-9+#./]+/g) || []).filter(t => t.length > 1 && !STOP_TERMS.has(t));
  }

  class BM25Index {
    constructor(docs) {
      this.docs = docs;
      this.k1 = 1.5;
      this.b = 0.75;
      this.docFreq = {};
      this.docLens = [];
      this.avgLen = 0;
      this._build();
    }

    _build() {
      const tfMaps = [];
      for (const doc of this.docs) {
        const tokens = tokenize(doc.text);
        this.docLens.push(tokens.length);
        const tf = {};
        for (const t of tokens) {
          tf[t] = (tf[t] || 0) + 1;
          this.docFreq[t] = (this.docFreq[t] || 0) + 1;
        }
        tfMaps.push(tf);
      }
      this.tfMaps = tfMaps;
      this.avgLen = this.docLens.reduce((a, b) => a + b, 0) / Math.max(this.docLens.length, 1);
      this.N = this.docs.length;
    }

    search(query, topK = 10) {
      const qTokens = tokenize(query);
      const scores = this.docs.map((doc, i) => {
        let score = 0;
        const dl = this.docLens[i];
        const tf = this.tfMaps[i];
        for (const term of qTokens) {
          const f = tf[term] || 0;
          if (!f) continue;
          const df = this.docFreq[term] || 0;
          const idf = Math.log(1 + (this.N - df + 0.5) / (df + 0.5));
          score += idf * (f * (this.k1 + 1)) / (f + this.k1 * (1 - this.b + this.b * dl / this.avgLen));
        }
        return { id: doc.id, score, doc };
      });
      return scores.filter(s => s.score > 0).sort((a, b) => b.score - a.score).slice(0, topK);
    }
  }

  // ─── JD PARSING ─────────────────────────────────────────────────
  function jdHash(str) {
    let h = 5381;
    for (let i = 0; i < Math.min(str.length, 2000); i++)
      h = ((h << 5) + h) ^ str.charCodeAt(i);
    return (h >>> 0).toString(36);
  }

  function chunkJD(jd) {
    const lines = jd.split('\n').map(l => l.trim()).filter(Boolean);
    const chunks = [];
    let buf = [];
    for (const line of lines) {
      if (/^(requirements?|qualifications?|responsibilities|skills|about|what you|must have|nice to have)/i.test(line) && buf.length) {
        chunks.push(buf.join(' '));
        buf = [line];
      } else {
        buf.push(line);
      }
      if (buf.join(' ').length > 400) {
        chunks.push(buf.join(' '));
        buf = [];
      }
    }
    if (buf.length) chunks.push(buf.join(' '));
    return chunks.length ? chunks : [jd];
  }

  function extractJdTitle(jd) {
    const titleLabelMatch = jd.match(/(?:job title|position title|role title)\s*[:\-]\s*([^\n]{3,60})/i);
    if (titleLabelMatch) return titleLabelMatch[1].trim();
    const m = jd.match(/(?:seeking|hiring|looking for)\s+an?\s+([A-Z][A-Za-z\s\/\-]{3,50}?)(?:\s+to\b|\s+who\b|\s+with\b|[,\n])/);
    if (m) return m[1].trim();
    const skipRe = /^(about|job summary|overview|description|we are|responsibilities|requirements)/i;
    for (const line of jd.split('\n').map(l => l.trim()).filter(Boolean).slice(0, 15)) {
      if (line.length < 4 || line.length > 55 || skipRe.test(line)) continue;
      const w = line.split(/\s+/);
      if (w.length >= 2 && w.length <= 6 && /^[A-Z]/.test(line)) return line;
    }
    return '';
  }

  function extractDirectTerms(jd) {
    const found = new Map();
    const add = (term, weight) => {
      const t = term.trim();
      if (t.length < 2 || t.length > 50) return;
      if (STOP_TERMS.has(t.toLowerCase())) return;
      const key = t.toLowerCase();
      found.set(key, { term: t, weight: (found.get(key)?.weight || 0) + weight });
    };

    // Comma / bullet lists in requirements sections
    const listLines = jd.split('\n').filter(l =>
      /^[\-•*▸]/.test(l.trim()) || /,/.test(l)
    );
    for (const line of listLines) {
      line.replace(/^[\-•*▸]\s*/, '').split(/[,;|]/).forEach(p => add(p.trim(), 3));
    }

    // Capitalized tech tokens (C#, Node.js, AWS)
    const techMatches = jd.match(/\b(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}|[A-Z]{2,}(?:\/[A-Z]+)?|C#|\.NET)\b/g) || [];
    techMatches.forEach(t => add(t, 2));

    // Quoted terms
    const quoted = jd.match(/"([^"]{2,40})"|'([^']{2,40})'/g) || [];
    quoted.forEach(q => add(q.replace(/['"]/g, ''), 4));

    // Years experience patterns nearby skills
    const yrCtx = jd.match(/(\d+)\+?\s*years?\s+(?:of\s+)?([a-z][a-z\s/+#.]{2,30})/gi) || [];
    yrCtx.forEach(m => {
      const skill = m.replace(/^\d+\+?\s*years?\s+(?:of\s+)?/i, '').trim();
      add(skill, 5);
    });

    return [...found.values()].sort((a, b) => b.weight - a.weight);
  }

  function extractKeywordsRAG(jd) {
    const chunks = chunkJD(jd);
    const kbDocs = SKILL_KB.map((s, i) => ({
      id: 'skill-' + i,
      text: [s.label, ...s.terms].join(' '),
      label: s.label,
      terms: s.terms,
    }));
    const bm25 = new BM25Index(kbDocs);

    const scored = new Map();
    const boostSection = (text) => {
      if (/required|must have|minimum|essential|mandatory/i.test(text)) return 2.5;
      if (/preferred|nice to have|bonus|plus/i.test(text)) return 1.5;
      return 1;
    };

    for (const chunk of chunks) {
      const mult = boostSection(chunk);
      const hits = bm25.search(chunk, 15);
      for (const hit of hits) {
        const label = hit.doc.label;
        const prev = scored.get(label) || 0;
        scored.set(label, prev + hit.score * mult);
      }
    }

    // Full-JD BM25 pass
    bm25.search(jd, 20).forEach(hit => {
      const label = hit.doc.label;
      scored.set(label, (scored.get(label) || 0) + hit.score * 0.5);
    });

    // Direct JD term extraction
    for (const { term, weight } of extractDirectTerms(jd)) {
      const key = term.replace(/\b\w/g, c => c); // preserve casing for display
      const display = term.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      const existing = [...scored.keys()].find(k => k.toLowerCase() === term.toLowerCase());
      if (existing) {
        scored.set(existing, scored.get(existing) + weight);
      } else {
        scored.set(display, weight);
      }
    }

    // Job title as high-priority keyword
    const title = extractJdTitle(jd);
    if (title) scored.set(title, (scored.get(title) || 0) + 20);

    const ranked = [...scored.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([label]) => label);

    // Dedupe similar
    const unique = [];
    for (const kw of ranked) {
      const kl = kw.toLowerCase();
      if (unique.some(u => u.toLowerCase() === kl || u.toLowerCase().includes(kl) || kl.includes(u.toLowerCase()))) continue;
      unique.push(kw);
    }

    const primary = unique.slice(0, 10);
    const secondary = unique.slice(10, 20);

    // Pad from direct terms if short
    if (primary.length < 8) {
      for (const { term } of extractDirectTerms(jd)) {
        if (primary.length >= 10) break;
        if (!primary.some(p => p.toLowerCase() === term.toLowerCase())) primary.push(term);
      }
    }

    const aliasMap = Object.fromEntries([...primary, ...secondary].map(k => [k, [k]]));

    return {
      primary,
      secondary,
      aliasMap,
      title,
      chunks,
      confidence: primary.length >= 6 ? 'high' : primary.length >= 3 ? 'medium' : 'low',
      source: 'rag',
    };
  }

  // ─── KEYWORD MATCHING (shared with ATS score) ───────────────────
  function kwInText(kw, text) {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp('(?<![a-zA-Z0-9])' + escaped + '(?![a-zA-Z0-9])', 'i').test(text);
  }

  function expandKeyword(kw) {
    const forms = [kw];
    const k = kw.trim();
    const trailingWords = /\s+(pipelines?|models?|tools?|frameworks?|systems?|apis?|services?|techniques?|methods?|practices?|processes?|solutions?|platforms?|technologies?|stacks?)$/i;
    const stripped = k.replace(trailingWords, '').trim();
    if (stripped !== k && stripped.length > 1) {
      forms.push(stripped);
      const sl = stripped.toLowerCase();
      if (KEYWORD_EXPANSIONS[sl]) forms.push(...KEYWORD_EXPANSIONS[sl]);
    }
    if (/s$/i.test(k) && k.length > 3) forms.push(k.slice(0, -1));
    const lower = k.toLowerCase();
    if (KEYWORD_EXPANSIONS[lower]) forms.push(...KEYWORD_EXPANSIONS[lower]);
    return forms;
  }

  function kwOrAliasInText(canonical, text, aliasMap) {
    const aliases = aliasMap[canonical] || [canonical];
    const allForms = [];
    aliases.forEach(a => allForms.push(...expandKeyword(a)));
    return allForms.some(form => kwInText(form, text));
  }

  // ─── ATS SCORING ────────────────────────────────────────────────
  function computeAtsScore(jd, resume, primary, secondary, aliasMap) {
    const resumeLines = resume.split('\n').map(l =>
      l.replace(/^[\s\u00A0\u200B\u200C\u200D\uFEFF\u202F\u2060\u3000]+/, '')
       .replace(/[\s\u00A0\u200B\u200C\u200D\uFEFF\u202F\u2060\u3000]+$/, '')
    );
    const resumeText = resumeLines.join('\n');

    const primaryFound = primary.filter(k => kwOrAliasInText(k, resumeText, aliasMap));
    const primaryMissing = primary.filter(k => !kwOrAliasInText(k, resumeText, aliasMap));
    const kwPts = Math.round((primaryFound.length / Math.max(primary.length, 1)) * 40);

    const secFound = secondary.filter(k => kwOrAliasInText(k, resumeText, aliasMap));
    const secMissing = secondary.filter(k => !kwOrAliasInText(k, resumeText, aliasMap));
    const secPts = Math.round((secFound.length / Math.max(secondary.length, 1)) * 10);

    const bulletLines = resumeLines.filter(l => {
      if (!l || l.length < 10) return false;
      if (/^[\u2022\u2023\u25E6\u2043\u2219\u25AA\u25AB\u25CF\u25C6\u2012\u2013\u2014\u00B7\u00BB\u2192\u2794\u27A4●•·‣▸▶►○◦\*]/.test(l)) return true;
      if (/^-\s+\S/.test(l)) return true;
      if (/^\d{1,2}[.)]\s+\S/.test(l)) return true;
      return false;
    });
    const bulletsWithNum = bulletLines.filter(l => /\d/.test(l));
    const metricPts = bulletLines.length > 0
      ? Math.round((bulletsWithNum.length / bulletLines.length) * 20) : 0;

    let jdTitle = extractJdTitle(jd).toLowerCase().replace(/[^\w\s]/g, '').trim();
    const summaryArea = resumeLines.filter(Boolean).slice(0, 10).join(' ').toLowerCase();
    const titleWords = jdTitle.split(/\s+/).filter(w => w.length > 3);
    const titleHits = titleWords.filter(w => summaryArea.includes(w)).length;
    const summaryPts = titleWords.length === 0 ? 10
      : titleHits >= titleWords.length ? 15
      : titleHits >= Math.ceil(titleWords.length * 0.6) ? 10 : 5;

    const upperHeaders = resumeLines.filter(l => /^[A-Z][A-Z\s\/&\-]{2,44}$/.test(l) && l.trim().length > 2);
    const hasBullets = bulletLines.length > 0;
    const hasTable = resumeLines.some(l => {
      const parts = l.split('|');
      if (parts.length < 4) return false;
      return !/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{4}|present)/i.test(l);
    });
    const hasColumns = (resume.match(/\t{2,}/g) || []).length > 5;
    const fmtIssues = [];
    if (upperHeaders.length === 0) fmtIssues.push('No ALL-CAPS section headers detected');
    if (!hasBullets) fmtIssues.push('No bullet points found — ATS prefers hyphen bullets');
    if (hasTable) fmtIssues.push('Table formatting detected — may confuse ATS parsers');
    if (hasColumns) fmtIssues.push('Multi-column layout detected — use single column');
    const fmtCheck = fmtIssues.length === 0 ? 'PASS' : 'WARNING';
    const fmtPts = fmtCheck === 'PASS' ? 10 : Math.max(0, 10 - fmtIssues.length * 3);

    const REQUIRED_SECTIONS = ['SUMMARY', 'EXPERIENCE', 'SKILLS', 'EDUCATION'];
    const resumeUpper = resume.toUpperCase();
    const missingSections = REQUIRED_SECTIONS.filter(s => !resumeUpper.includes(s));
    const sectionPts = missingSections.length === 0 ? 5 : Math.max(0, 5 - missingSections.length * 2);

    const atsScore = Math.min(100, kwPts + secPts + metricPts + summaryPts + fmtPts + sectionPts);
    const confidence = atsScore >= 85 ? 'High' : atsScore >= 70 ? 'Medium' : 'Low';

    const gaps = [
      ...primaryMissing.map(k => `Keyword "${k}" from JD not found in resume — add to Skills or weave into a bullet.`),
      ...secMissing.map(k => `Secondary keyword "${k}" from JD not found in resume — consider adding.`),
      ...fmtIssues.map(i => `Format: ${i}`),
      ...missingSections.map(s => `Missing section: ${s}`),
      ...(bulletLines.length > 0 && bulletsWithNum.length < bulletLines.length
        ? [`${bulletLines.length - bulletsWithNum.length} bullet(s) have no measurable metric — add counts, %, time saved, or dollar impact.`]
        : []),
    ];

    const improvementSuggestions = [];
    if (primaryMissing.length) improvementSuggestions.push(`Add missing primary keywords to SKILLS: ${primaryMissing.slice(0, 3).join(', ')}`);
    if (bulletsWithNum.length < bulletLines.length) improvementSuggestions.push('Add metrics to bullets without numbers');
    if (summaryPts < 13 && jdTitle) improvementSuggestions.push(`Open summary with job title: ${extractJdTitle(jd)}`);
    if (missingSections.length) improvementSuggestions.push(`Add missing sections: ${missingSections.join(', ')}`);

    return {
      atsScore,
      atsColour: atsScore >= 80 ? '#4ade80' : atsScore >= 60 ? '#fbbf24' : '#f87171',
      kwPts, secPts, metricPts, summaryPts, fmtPts, sectionPts,
      primaryFound, primaryMissing, secFound, secMissing,
      bulletLines, bulletsWithNum, fmtCheck, fmtIssues, missingSections,
      gaps, improvementSuggestions, confidence,
      scorecard: {
        keywordMatch: primaryFound.length,
        keywordsFound: primaryFound,
        keywordsMissing: primaryMissing,
        secondaryFound: secFound,
        secondaryMissing: secMissing,
        bulletsWithMetrics: bulletsWithNum.length,
        bulletsTotal: bulletLines.length,
        summaryScore: summaryPts,
        formatCheck: fmtCheck,
        formatIssues: fmtIssues,
        sectionCheck: missingSections.length === 0 ? 'PASS' : 'FAIL',
        missingSections,
        confidenceLevel: confidence,
        confidenceReason: primaryMissing.length === 0
          ? 'All major JD keywords addressed'
          : `${primaryMissing.length} primary keyword(s) still missing`,
        gaps,
        improvementSuggestions,
      },
    };
  }

  // ─── RAG CONTEXT FOR REWRITE (smaller prompts = cheaper) ────────
  function buildCompactRewriteContext(jd, resume, keywords) {
    const chunks = chunkJD(jd);
    const rulesIdx = new BM25Index(ATS_RULES_KB.map(r => ({ id: r.id, text: r.text })));
    const relevantRules = rulesIdx.search(keywords.primary.join(' '), 5).map(h => h.doc.text);

    const kwSet = new Set([...keywords.primary, ...keywords.secondary].map(k => k.toLowerCase()));
    const scoredChunks = chunks.map(c => {
      let score = 0;
      const cl = c.toLowerCase();
      for (const kw of kwSet) if (cl.includes(kw)) score += 2;
      if (/required|must|qualifications|responsibilities|skills/i.test(c)) score += 3;
      return { text: c, score };
    }).sort((a, b) => b.score - a.score);

    const topChunks = scoredChunks.slice(0, 4).map(c => c.text);
    const title = extractJdTitle(jd);

    const resumePreview = resume.split('\n').filter(Boolean).slice(0, 8).join('\n');

    return [
      '=== RAG-RETRIEVED JD CONTEXT (most relevant sections) ===',
      title ? `ROLE TITLE: ${title}` : '',
      ...topChunks.map((c, i) => `[JD Chunk ${i + 1}]\n${c}`),
      '',
      '=== ATS RULES (from knowledge base) ===',
      ...relevantRules.map(r => `• ${r}`),
      '',
      '=== KEYWORDS TO EMBED ===',
      `PRIMARY (must appear 2x each): ${keywords.primary.join(', ')}`,
      `SECONDARY (appear 1x): ${keywords.secondary.join(', ')}`,
      '',
      '=== RESUME HEADER PREVIEW ===',
      resumePreview,
    ].filter(Boolean).join('\n');
  }

  // ─── INDEXEDDB CACHE ────────────────────────────────────────────
  const DB_NAME = 'ats-rag-cache';
  const STORE = 'keywords';

  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function cacheGet(key) {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly');
        const req = tx.objectStore(STORE).get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } catch { return null; }
  }

  async function cacheSet(key, value) {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch { /* storage unavailable */ }
  }

  async function getKeywords(jd, sessionKeywords) {
    if (sessionKeywords?.primary?.length) {
      return { ...sessionKeywords, source: 'session' };
    }

    const key = 'ats_kw_' + jdHash(jd);
    const cached = await cacheGet(key);
    if (cached?.primary?.length) {
      return { ...cached, source: 'cache' };
    }

    // localStorage fallback (legacy)
    try {
      const ls = JSON.parse(localStorage.getItem(key) || 'null');
      if (ls?.primary?.length) return { ...ls, source: 'cache' };
    } catch { /* ignore */ }

    const extracted = extractKeywordsRAG(jd);
    const payload = {
      primary: extracted.primary,
      secondary: extracted.secondary,
      aliasMap: extracted.aliasMap,
      title: extracted.title,
      confidence: extracted.confidence,
    };
    await cacheSet(key, payload);
    try { localStorage.setItem(key, JSON.stringify(payload)); } catch { /* full */ }
    return { ...payload, source: 'rag' };
  }

  // ─── PUBLIC API ─────────────────────────────────────────────────
  const RAGEngine = {
    extractKeywordsRAG,
    computeAtsScore,
    buildCompactRewriteContext,
    getKeywords,
    jdHash,
    cacheGet,
    cacheSet,
    SKILL_KB,
  };

  global.RAGEngine = RAGEngine;
})(typeof window !== 'undefined' ? window : globalThis);
