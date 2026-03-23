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
    const result = await mammoth.extractRawText({ arrayBuffer });
    text = result.value;
  } catch {
    const base64 = await toBase64(file);
    return { name: file.name, type: 'docx', size: file.size, text: '', base64, mimeType: file.type };
  }
  return { name: file.name, type: 'docx', size: file.size, text };
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
