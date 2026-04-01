import type { ParsedFile } from './types';

/**
 * Parse file in browser. No server needed.
 */
export async function parseFile(file: File): Promise<ParsedFile> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) {
    return parseImage(file);
  }
  if (ext === 'pdf') {
    return parsePDF(file);
  }
  if (['docx', 'doc'].includes(ext)) {
    return parseDOCX(file);
  }
  return parseText(file);
}

async function parseImage(file: File): Promise<ParsedFile> {
  const base64 = await toBase64(file);
  return { name: file.name, type: 'image', size: file.size, text: '', base64, mimeType: file.type };
}

async function parsePDF(file: File): Promise<ParsedFile> {
  const base64 = await toBase64(file);
  let text = '';
  let pageCount = 0;

  try {
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    pageCount = pdf.numPages;

    const pages: string[] = [];
    for (let i = 1; i <= Math.min(pdf.numPages, 20); i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      pages.push(content.items.map((item: unknown) => (item as { str: string }).str || '').join(' '));
    }
    text = pages.join('\n\n');
  } catch {
    text = '';
  }

  return { name: file.name, type: 'pdf', size: file.size, text, base64, mimeType: 'application/pdf', pageCount };
}

async function parseDOCX(file: File): Promise<ParsedFile> {
  let text = '';
  try {
    const mammoth = await import('mammoth');
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    text = htmlToStructuredText(result.value);
    // If conversion produced nothing, fall back to raw text
    if (!text.trim()) {
      const raw = await mammoth.extractRawText({ arrayBuffer });
      text = raw.value;
    }
  } catch {
    const base64 = await toBase64(file);
    return { name: file.name, type: 'docx', size: file.size, text: '', base64, mimeType: file.type };
  }
  return { name: file.name, type: 'docx', size: file.size, text };
}

/**
 * Convert mammoth HTML output to structured plain text using DOMParser.
 * Preserves headings, tables (as pipe-separated rows), and list items.
 * No regex — uses DOM traversal which is reliable for any HTML structure.
 */
function htmlToStructuredText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const lines: string[] = [];

  function walk(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const t = node.textContent?.trim();
      if (t) lines.push(t);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as Element;
    const tag = el.tagName.toLowerCase();

    if (tag === 'table') {
      el.querySelectorAll('tr').forEach(tr => {
        const cells = [...tr.querySelectorAll('td, th')].map(td => td.textContent?.trim() ?? '');
        if (cells.some(c => c)) lines.push('| ' + cells.join(' | ') + ' |');
      });
      lines.push('');
      return;
    }

    if (['h1','h2','h3','h4','h5','h6'].includes(tag)) {
      const level = '#'.repeat(Number(tag[1]));
      lines.push(`\n${level} ${el.textContent?.trim()}\n`);
      return;
    }

    if (tag === 'li') {
      lines.push(`- ${el.textContent?.trim()}`);
      return;
    }

    if (tag === 'p') {
      const t = el.textContent?.trim();
      if (t) lines.push(t);
      lines.push('');
      return;
    }

    if (tag === 'br') {
      lines.push('');
      return;
    }

    el.childNodes.forEach(walk);
  }

  doc.body.childNodes.forEach(walk);
  // Collapse runs of more than 2 consecutive blank lines
  const collapsed = lines.join('\n').split('\n').reduce<string[]>((acc, line) => {
    const isBlank = line.trim() === '';
    const prevBlank = acc.length > 0 && acc[acc.length - 1].trim() === '';
    const prevPrevBlank = acc.length > 1 && acc[acc.length - 2].trim() === '';
    if (isBlank && prevBlank && prevPrevBlank) return acc;
    acc.push(line);
    return acc;
  }, []);
  return collapsed.join('\n').trim();
}

async function parseText(file: File): Promise<ParsedFile> {
  const text = await file.text();
  return { name: file.name, type: 'text', size: file.size, text };
}

async function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
