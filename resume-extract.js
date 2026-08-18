/**
 * Resume file extraction — PDF / DOCX / DOC / TXT / RTF
 * Every format is passed through canonicalizeResumeText so ATS scoring
 * sees the same words regardless of how the file was uploaded.
 */
(function (global) {
  'use strict';

  const PDFJS_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
  const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const MAMMOTH_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';

  let pdfjsLibPromise = null;
  let mammothPromise = null;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Could not load parser from CDN. Check your internet connection.'));
      document.head.appendChild(s);
    });
  }

  function loadPdfJs() {
    if (global.pdfjsLib) return Promise.resolve(global.pdfjsLib);
    if (pdfjsLibPromise) return pdfjsLibPromise;
    pdfjsLibPromise = loadScript(PDFJS_SRC).then(() => {
      if (!global.pdfjsLib) throw new Error('PDF.js failed to initialize');
      global.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
      return global.pdfjsLib;
    });
    return pdfjsLibPromise;
  }

  function loadMammoth() {
    if (global.mammoth) return Promise.resolve(global.mammoth);
    if (mammothPromise) return mammothPromise;
    mammothPromise = loadScript(MAMMOTH_SRC).then(() => {
      if (!global.mammoth) throw new Error('Word extractor failed to initialize');
      return global.mammoth;
    });
    return mammothPromise;
  }

  function bytesOf(buf) {
    return buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  }

  function magicOf(u8) {
    const n = Math.min(u8.length, 16);
    let s = '';
    for (let i = 0; i < n; i++) s += String.fromCharCode(u8[i]);
    return s;
  }

  function detectKind(fileName, u8) {
    const name = String(fileName || '').toLowerCase();
    const mag = magicOf(u8);
    if (mag.startsWith('%PDF')) return 'pdf';
    if (u8[0] === 0x50 && u8[1] === 0x4B) return 'docx';
    if (u8[0] === 0xD0 && u8[1] === 0xCF && u8[2] === 0x11 && u8[3] === 0xE0) return 'doc';
    if (mag.startsWith('{\\rtf')) return 'rtf';
    const head = mag.slice(0, 12).toLowerCase();
    if (head.includes('<html') || head.includes('<!doct') || head.includes('<xml')) return 'html';
    if (name.endsWith('.pdf')) return 'pdf';
    if (name.endsWith('.docx')) return 'docx';
    if (name.endsWith('.doc')) return 'doc';
    if (name.endsWith('.rtf')) return 'rtf';
    if (name.endsWith('.html') || name.endsWith('.htm')) return 'html';
    return 'txt';
  }

  function decodeUtf8(u8) {
    if (u8.length >= 3 && u8[0] === 0xEF && u8[1] === 0xBB && u8[2] === 0xBF) {
      return new TextDecoder('utf-8').decode(u8.subarray(3));
    }
    if (u8.length >= 2 && u8[0] === 0xFF && u8[1] === 0xFE) {
      return new TextDecoder('utf-16le').decode(u8.subarray(2));
    }
    if (u8.length >= 2 && u8[0] === 0xFE && u8[1] === 0xFF) {
      return new TextDecoder('utf-16be').decode(u8.subarray(2));
    }
    return new TextDecoder('utf-8').decode(u8);
  }

  function decodeCp1252(u8) {
    try {
      return new TextDecoder('windows-1252').decode(u8);
    } catch (_) {
      let out = '';
      for (let i = 0; i < u8.length; i++) out += String.fromCharCode(u8[i]);
      return out;
    }
  }

  function htmlToResumeText(html) {
    const doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
    const blocks = new Set(['P', 'DIV', 'TR', 'TABLE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BR', 'SECTION', 'ARTICLE']);
    const parts = [];

    function walk(node) {
      if (!node) return;
      if (node.nodeType === 3) {
        parts.push(node.nodeValue || '');
        return;
      }
      if (node.nodeType !== 1) return;
      const tag = node.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE') return;
      if (tag === 'BR') {
        parts.push('\n');
        return;
      }
      if (tag === 'A') {
        const t = (node.textContent || '').replace(/\s+/g, ' ').trim();
        const href = (node.getAttribute('href') || '').trim();
        const mail = href.replace(/^mailto:/i, '');
        if (t && href && /linkedin\.com|github\.com|^mailto:/i.test(href) && t.indexOf(mail) === -1) {
          parts.push(t + ' ' + mail);
        } else {
          parts.push(t || mail);
        }
        return;
      }
      if (tag === 'LI') parts.push('\n- ');
      else if (blocks.has(tag)) parts.push('\n');
      for (const child of node.childNodes) walk(child);
      if (tag === 'P' || tag === 'DIV' || tag === 'TR' || /^H[1-6]$/.test(tag)) parts.push('\n');
    }

    walk(doc.body || doc.documentElement);
    return parts.join('');
  }

  function extractRtf(raw) {
    return String(raw || '')
      .replace(/\\'[0-9a-fA-F]{2}/g, (m) => String.fromCharCode(parseInt(m.slice(2), 16)))
      .replace(/\\u(-?\d+)\??/g, (_, n) => String.fromCharCode(parseInt(n, 10) & 0xFFFF))
      .replace(/\\par[d]?/gi, '\n')
      .replace(/\\line\b/gi, '\n')
      .replace(/\\tab\b/gi, ' ')
      .replace(/\\[a-z]+\-?\d* ?/gi, '')
      .replace(/[{}]/g, '')
      .replace(/\r/g, '');
  }

  function parseCfb(arrayBuffer) {
    const u8 = bytesOf(arrayBuffer);
    const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    if (u8.length < 512) throw new Error('File is too small to be a Word document');
    const sectorShift = dv.getUint16(0x1E, true);
    const sectorSize = 1 << sectorShift;
    const miniShift = dv.getUint16(0x20, true);
    const miniSize = 1 << miniShift;
    const dirStart = dv.getInt32(0x30, true);
    const miniCutoff = dv.getUint32(0x38, true);
    const miniFatStart = dv.getInt32(0x3C, true);

    function sectorOffset(id) {
      return (id + 1) * sectorSize;
    }

    const fat = [];
    for (let i = 0; i < 109; i++) {
      const sid = dv.getInt32(0x4C + i * 4, true);
      if (sid < 0) continue;
      const off = sectorOffset(sid);
      for (let j = 0; j < sectorSize; j += 4) {
        if (off + j + 4 > u8.length) break;
        fat.push(dv.getInt32(off + j, true));
      }
    }

    function chain(start) {
      const out = [];
      const seen = new Set();
      let s = start;
      while (s >= 0 && !seen.has(s)) {
        seen.add(s);
        out.push(s);
        if (s >= fat.length) break;
        s = fat[s];
      }
      return out;
    }

    function readFatStream(start, size) {
      const secs = chain(start);
      const buf = new Uint8Array(Math.max(size, secs.length * sectorSize));
      let p = 0;
      for (const id of secs) {
        const off = sectorOffset(id);
        const n = Math.min(sectorSize, u8.length - off);
        if (n > 0) {
          buf.set(u8.subarray(off, off + n), p);
          p += n;
        }
      }
      return buf.subarray(0, size);
    }

    const dirSecs = chain(dirStart);
    const dirBuf = new Uint8Array(dirSecs.length * sectorSize);
    for (let i = 0; i < dirSecs.length; i++) {
      const off = sectorOffset(dirSecs[i]);
      dirBuf.set(u8.subarray(off, off + Math.min(sectorSize, u8.length - off)), i * sectorSize);
    }
    const dirView = new DataView(dirBuf.buffer, dirBuf.byteOffset, dirBuf.byteLength);

    const entries = [];
    for (let i = 0; i + 128 <= dirBuf.length; i += 128) {
      const nameLen = dirView.getUint16(i + 64, true);
      if (!nameLen) continue;
      let name = '';
      const chars = Math.max(0, (nameLen / 2) - 1);
      for (let c = 0; c < chars; c++) name += String.fromCharCode(dirView.getUint16(i + c * 2, true));
      entries.push({
        name,
        type: dirBuf[i + 66],
        start: dirView.getInt32(i + 116, true),
        size: dirView.getUint32(i + 120, true),
      });
    }

    const root = entries.find((e) => e.type === 5) || entries[0];
    const miniFat = [];
    if (miniFatStart >= 0) {
      const miniFatBytes = readFatStream(miniFatStart, chain(miniFatStart).length * sectorSize);
      const mv = new DataView(miniFatBytes.buffer, miniFatBytes.byteOffset, miniFatBytes.byteLength);
      for (let i = 0; i + 4 <= miniFatBytes.length; i += 4) miniFat.push(mv.getInt32(i, true));
    }

    let miniStore = new Uint8Array(0);
    if (root && root.size > 0 && root.start >= 0) {
      miniStore = readFatStream(root.start, root.size);
    }

    function readMini(start, size) {
      const out = new Uint8Array(size);
      const seen = new Set();
      let s = start;
      let p = 0;
      while (s >= 0 && !seen.has(s) && p < size) {
        seen.add(s);
        const off = s * miniSize;
        const n = Math.min(miniSize, size - p, miniStore.length - off);
        if (n > 0) out.set(miniStore.subarray(off, off + n), p);
        p += Math.max(n, 0);
        s = miniFat[s];
      }
      return out;
    }

    const streams = {};
    for (const e of entries) {
      if (e.type !== 2 || !e.name || e.size <= 0) continue;
      try {
        streams[e.name] = e.size < miniCutoff
          ? readMini(e.start, e.size)
          : readFatStream(e.start, e.size);
      } catch (_) { /* skip broken stream */ }
    }
    return streams;
  }

  function harvestUtf16(u8) {
    const chunks = [];
    let run = '';
    for (let i = 0; i + 1 < u8.length; i += 2) {
      const c = u8[i] | (u8[i + 1] << 8);
      const ok = c === 9 || c === 10 || c === 13 || (c >= 32 && c !== 127 && c < 0xFFFE);
      if (ok && u8[i + 1] === 0 && c < 256) {
        run += c === 13 ? '\n' : (c === 7 || c === 11 || c === 12 ? '\n' : String.fromCharCode(c));
      } else {
        if (run.replace(/\s/g, '').length >= 8) chunks.push(run.trim());
        run = '';
      }
    }
    if (run.replace(/\s/g, '').length >= 8) chunks.push(run.trim());
    return chunks.join('\n');
  }

  function harvestAscii(u8) {
    const chunks = [];
    let run = '';
    for (let i = 0; i < u8.length; i++) {
      const c = u8[i];
      if (c === 9 || c === 10 || c === 13 || (c >= 32 && c < 127)) {
        run += c === 13 ? '\n' : String.fromCharCode(c);
      } else {
        if (run.replace(/\s/g, '').length >= 12) chunks.push(run.trim());
        run = '';
      }
    }
    if (run.replace(/\s/g, '').length >= 12) chunks.push(run.trim());
    return chunks.join('\n');
  }

  function decodeWordDocumentStream(word) {
    if (!word || word.length < 0x20) return '';
    const dv = new DataView(word.buffer, word.byteOffset, word.byteLength);
    const ident = dv.getUint16(0, true);
    if (ident !== 0xA5EC && ident !== 0xA5DC) {
      return harvestUtf16(word) || harvestAscii(word);
    }
    const flags = dv.getUint16(0x0A, true);
    if (flags & (1 << 8)) throw new Error('This Word file is encrypted / password-protected');
    const complex = !!(flags & (1 << 2));
    const unicode = !!(flags & (1 << 12));
    const fcMin = dv.getUint32(0x18, true);
    const fcMac = dv.getUint32(0x1C, true);
    if (!complex && fcMac > fcMin && fcMac <= word.length) {
      const slice = word.subarray(fcMin, fcMac);
      const text = unicode ? new TextDecoder('utf-16le').decode(slice) : decodeCp1252(slice);
      const cleaned = text
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/[\u0000-\u0006\u0008\u000e-\u001f]/g, '')
        .replace(/[\u0007\u000b\u000c]/g, '\n');
      if (cleaned.replace(/\s/g, '').length > 80) return cleaned;
    }
    const harvested = harvestUtf16(word);
    if (harvested.replace(/\s/g, '').length > 80) return harvested;
    return harvestAscii(word);
  }

  function extractDocBinary(arrayBuffer) {
    const streams = parseCfb(arrayBuffer);
    const word = streams.WordDocument || streams.worddocument;
    if (!word) {
      throw new Error('Could not read this .doc file. Save it as .docx or PDF and try again.');
    }
    return decodeWordDocumentStream(word);
  }

  function extractPdfPage(textContent) {
    const items = [];
    for (const item of textContent.items || []) {
      const str = item.str;
      if (!str) continue;
      const t = item.transform || [1, 0, 0, 1, 0, 0];
      items.push({
        str,
        x: t[4],
        y: t[5],
        w: item.width || 0,
      });
    }
    if (!items.length) return '';

    items.sort((a, b) => (b.y - a.y) || (a.x - b.x));
    const lines = [];
    const yTol = 2.8;
    for (const it of items) {
      const last = lines[lines.length - 1];
      if (last && Math.abs(last.y - it.y) <= yTol) last.items.push(it);
      else lines.push({ y: it.y, items: [it] });
    }

    const out = [];
    let prevY = null;
    for (const line of lines) {
      line.items.sort((a, b) => a.x - b.x);
      if (prevY != null && prevY - line.y > 14) out.push('');
      prevY = line.y;
      let text = '';
      let prevEnd = null;
      for (const it of line.items) {
        const avg = it.str.length ? (it.w / it.str.length) : 6;
        if (prevEnd != null) {
          const gap = it.x - prevEnd;
          if (gap > Math.max(1.2, avg * 0.28) && !/ $/.test(text) && !/^ /.test(it.str)) text += ' ';
        }
        text += it.str;
        prevEnd = it.x + (it.w || avg * it.str.length);
      }
      out.push(text.replace(/[ \t]+/g, ' ').trim());
    }
    return out.join('\n');
  }

  async function extractPdf(arrayBuffer) {
    const pdfjs = await loadPdfJs();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    const pages = [];
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      const tc = await page.getTextContent({ disableCombineTextItems: false, disableNormalization: false });
      pages.push(extractPdfPage(tc));
    }
    return pages.join('\n\n');
  }

  async function extractDocx(arrayBuffer) {
    const mam = await loadMammoth();
    const result = await mam.convertToHtml({ arrayBuffer });
    return htmlToResumeText(result.value || '');
  }

  function looksLikeResume(text) {
    const words = String(text || '').trim().split(/\s+/).filter(Boolean).length;
    return words >= 40;
  }

  function canonicalizeResumeText(raw) {
    let t = String(raw || '').normalize('NFC');

    t = t.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\u000c/g, '\n');
    t = t.replace(/[\u00A0\u202F\u2007\u2009\u200A\u200B\u200C\u200D\uFEFF]/g, ' ');
    t = t.replace(/[\u2018\u2019\u201A\u201B]/g, "'");
    t = t.replace(/[\u201C\u201D\u201E\u2033]/g, '"');
    t = t.replace(/[\u2013\u2014\u2212]/g, '-');
    t = t.replace(/[\u00AD]/g, '');
    t = t.replace(/[\uFB00]/g, 'ff').replace(/[\uFB01]/g, 'fi').replace(/[\uFB02]/g, 'fl');
    t = t.replace(/[\uFB03]/g, 'ffi').replace(/[\uFB04]/g, 'ffl');
    t = t.replace(/\*\*([^*]+)\*\*/g, '$1');
    t = t.replace(/^[ \t]*[\u2022\u2023\u25E6\u2043\u2219\u25AA\u25CF\u25C6\u25B8●•‣▸▶►○◦▪▫·][ \t]*/gm, '- ');
    t = t.replace(/^[ \t]*[–—][ \t]+/gm, '- ');
    t = t.replace(/([A-Za-z]{2,})-\n([a-z]{2,})/g, '$1$2');
    t = t.replace(/^\s*page\s+\d+(\s+of\s+\d+)?\s*$/gim, '');
    t = t.replace(/^\s*\d+\s*\/\s*\d+\s*$/gm, '');
    t = t.replace(/^\s*\d{1,3}\s*$/gm, '');
    t = t.replace(/[ \t]+\n/g, '\n');
    t = t.replace(/[ \t]{2,}/g, ' ');

    const lines = t.split('\n');
    const joined = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) {
        if (joined.length && joined[joined.length - 1] !== '') joined.push('');
        continue;
      }
      const prev = joined[joined.length - 1];
      const prevLooksOpen = prev &&
        !/^\s*- /.test(prev) &&
        !/[:|]$/.test(prev) &&
        !/^[A-Z][A-Z \t/&-]{3,}$/.test(prev) &&
        !/[.!?)]$/.test(prev);
      const curContinues = !/^\s*- /.test(line) &&
        !/^[A-Z][A-Z \t/&-]{3,}$/.test(line) &&
        /^[a-z(]/.test(line);
      if (prevLooksOpen && curContinues) {
        joined[joined.length - 1] = prev + ' ' + line;
      } else {
        joined.push(line);
      }
    }

    return joined.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  function normalizeResumeGlyphs(raw) {
    return String(raw || '')
      .normalize('NFC')
      .replace(/[\u00A0\u202F\u2007\u200B\uFEFF]/g, ' ')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2013\u2014\u2212]/g, '-')
      .replace(/[\u2022\u25CF●•]/g, '-');
  }

  async function extractResumeFile(file) {
    if (!file) throw new Error('No file selected');
    const arrayBuffer = await file.arrayBuffer();
    const u8 = bytesOf(arrayBuffer);
    if (!u8.length) throw new Error('That file is empty');

    const kind = detectKind(file.name, u8);
    let raw = '';
    let engine = kind;

    if (kind === 'pdf') {
      raw = await extractPdf(arrayBuffer);
      engine = 'pdf.js';
    } else if (kind === 'docx') {
      raw = await extractDocx(arrayBuffer);
      engine = 'docx';
    } else if (kind === 'doc') {
      try {
        raw = extractDocBinary(arrayBuffer);
        engine = 'doc';
      } catch (err) {
        const asText = decodeUtf8(u8);
        if (asText.slice(0, 80).toLowerCase().includes('<html') || asText.includes('<w:')) {
          raw = htmlToResumeText(asText);
          engine = 'doc-html';
        } else if (asText.startsWith('{\\rtf')) {
          raw = extractRtf(asText);
          engine = 'doc-rtf';
        } else {
          throw err;
        }
      }
    } else if (kind === 'rtf') {
      raw = extractRtf(decodeUtf8(u8));
      engine = 'rtf';
    } else if (kind === 'html') {
      raw = htmlToResumeText(decodeUtf8(u8));
      engine = 'html';
    } else {
      raw = decodeUtf8(u8);
      engine = 'txt';
    }

    const text = canonicalizeResumeText(raw);
    if (!looksLikeResume(text)) {
      throw new Error('Could not read enough resume text from this file. Try a .docx or a text-based PDF (not a scanned image).');
    }
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const lines = text.split('\n').filter((l) => l.trim()).length;
    return { text, words, lines, engine, fileName: file.name, kind };
  }

  global.ResumeExtract = {
    extractResumeFile,
    canonicalizeResumeText,
    normalizeResumeGlyphs,
  };
})(typeof window !== 'undefined' ? window : globalThis);
