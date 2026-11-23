import { jsPDF } from 'jspdf';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import mammoth from 'mammoth';
import type { QuestionItem, QuestionType } from '../types/domain';

// Configure PDF.js worker using Vite bundled asset URL (no external CDN needed)
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export { pdfjsLib };

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  return uint8ArrayToBase64(new Uint8Array(buffer));
}

/**
 * Generates a real valid multi-page PDF document in-browser using jsPDF
 * for seeded demo submissions so teachers can inspect & annotate immediately.
 */
export function generateSampleAnswerPdfBase64(params: {
  studentName: string;
  rollNumber: string;
  courseCode: string;
  examTitle: string;
  answerParagraphs: string[];
}): string {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 48;
  const maxWidth = pageWidth - margin * 2;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('BZU EXAM — SYNTHETIC DEMO ANSWER SHEET', margin, 56);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Course: ${params.courseCode}  |  Assessment: ${params.examTitle}`, margin, 78);
  doc.text(`Student: ${params.studentName} (${params.rollNumber})`, margin, 94);
  doc.text('Note: Fictional student response generated locally for prototype grading demo.', margin, 110);

  doc.setDrawColor(180);
  doc.line(margin, 122, pageWidth - margin, 122);

  let y = 148;
  doc.setFontSize(11);
  for (const para of params.answerParagraphs) {
    const lines = doc.splitTextToSize(para, maxWidth) as string[];
    for (const line of lines) {
      if (y > 760) {
        doc.addPage();
        y = 56;
      }
      doc.text(line, margin, y);
      y += 16;
    }
    y += 12;
  }

  const arrayBuffer = doc.output('arraybuffer');
  return uint8ArrayToBase64(new Uint8Array(arrayBuffer));
}

/**
 * Assembles one or more handwritten page images (PNG/JPEG) into a single combined PDF.
 */
export async function assembleImagesToPdfBase64(imageFiles: File[]): Promise<{
  base64Data: string;
  sizeBytes: number;
}> {
  if (imageFiles.length === 0) {
    throw new Error('Select at least one image file to assemble into a PDF.');
  }

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const pad = 28;

  for (let idx = 0; idx < imageFiles.length; idx++) {
    const file = imageFiles[idx];
    if (!file.type.startsWith('image/')) {
      throw new Error(`Unsupported file "${file.name}". Only PNG or JPEG images are allowed.`);
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
      reader.readAsDataURL(file);
    });

    const dims = await new Promise<{ w: number; h: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.width || 800, h: img.height || 1000 });
      img.onerror = () => reject(new Error(`Could not decode image ${file.name}`));
      img.src = dataUrl;
    });

    if (idx > 0) doc.addPage();
    const availW = pageW - pad * 2;
    const availH = pageH - pad * 2;
    const scale = Math.min(availW / dims.w, availH / dims.h);
    const drawW = dims.w * scale;
    const drawH = dims.h * scale;
    const x = (pageW - drawW) / 2;
    const y = (pageH - drawH) / 2;
    const imgFormat = file.type.includes('png') ? 'PNG' : 'JPEG';
    doc.addImage(dataUrl, imgFormat, x, y, drawW, drawH);
  }

  const buffer = doc.output('arraybuffer');
  const bytes = new Uint8Array(buffer);
  return {
    base64Data: uint8ArrayToBase64(bytes),
    sizeBytes: bytes.byteLength,
  };
}

/**
 * Extracts text from a client-selected DOCX file using mammoth.
 */
export async function extractTextFromDocxFile(file: File): Promise<{
  text: string;
  warnings: string[];
}> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  const warnings = result.messages.map((m) => m.message);
  if (!result.value.trim()) {
    warnings.push(
      'No extractable text found in this DOCX file. If questions are embedded as images or equations, add them manually.'
    );
  }
  return { text: result.value, warnings };
}

/**
 * Extracts readable text from a PDF file using PDF.js.
 * Flags image-based scanned PDFs transparently.
 */
export async function extractTextFromPdfFile(file: File): Promise<{
  text: string;
  pageCount: number;
  warnings: string[];
}> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf = await loadingTask.promise;
  const pageTexts: string[] = [];
  const warnings: string[] = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const textContent = await page.getTextContent();
    const strings = textContent.items
      .map((item) => ('str' in item ? item.str : ''))
      .filter(Boolean);
    pageTexts.push(strings.join(' '));
  }

  const combined = pageTexts.join('\n\n').trim();
  if (combined.length < 20) {
    warnings.push(
      'Very little or no selectable text was found. This PDF may be a scanned image or contain rasterized math equations. Please inspect and enter/correct questions manually.'
    );
  } else {
    warnings.push(
      'PDF text extraction may flatten complex math notation (integrals, matrices, subscripts). Review every imported question before publishing.'
    );
  }

  return {
    text: combined,
    pageCount: pdf.numPages,
    warnings,
  };
}

/**
 * Parses raw extracted lines or CSV/JSON question text into editable QuestionItem drafts.
 */
export function parseQuestionDraftsFromText(
  rawText: string,
  courseId: string,
  teacherId: string
): QuestionItem[] {
  const trimmed = rawText.trim();
  if (!trimmed) return [];

  // Try JSON array import first (e.g., authorized structured export)
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed.questions) ? parsed.questions : [];
      if (list.length > 0) {
        return list.map((item: Record<string, unknown>, idx: number) => {
          const typeRaw = String(item.type ?? 'mcq').toLowerCase();
          const qType: QuestionType =
            typeRaw === 'short' || typeRaw === 'long' ? typeRaw : 'mcq';
          const options = Array.isArray(item.options)
            ? item.options.map(String)
            : qType === 'mcq'
              ? ['Option A', 'Option B', 'Option C', 'Option D']
              : undefined;
          return {
            id: `draft-q-${Date.now()}-${idx}`,
            courseId,
            sectionTitle: String(item.sectionTitle ?? (qType === 'mcq' ? 'Section A — Objective' : 'Section B — Subjective')),
            type: qType,
            prompt: String(item.prompt ?? item.question ?? `Imported Question ${idx + 1}`),
            points: Number(item.points ?? (qType === 'mcq' ? 2 : 10)),
            order: idx + 1,
            options,
            correctOptionIndex: typeof item.correctOptionIndex === 'number' ? item.correctOptionIndex : 0,
            createdByTeacherId: teacherId,
          };
        });
      }
    } catch {
      // Fall through to line-based parser
    }
  }

  // Split by numbered lines like "1.", "Q1.", "Question 1:" or blank lines
  const blocks = trimmed
    .split(/\n(?=(?:Q?\d+[.):]\s))|\n{2,}/i)
    .map((b) => b.trim())
    .filter((b) => b.length > 3);

  return blocks.slice(0, 40).map((block, idx) => {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    const optionLines = lines.filter((l) => /^[A-D][.)]\s+/i.test(l));
    const isMcq = optionLines.length >= 2;
    const promptLine = lines
      .filter((l) => !/^[A-D][.)]\s+/i.test(l))
      .join(' ')
      .replace(/^(?:Question\s*)?Q?\d+[.):]\s*/i, '')
      .trim();

    return {
      id: `draft-q-${Date.now()}-${idx}`,
      courseId,
      sectionTitle: isMcq ? 'Section A — Objective (Imported Draft)' : 'Section B — Subjective (Imported Draft)',
      type: isMcq ? 'mcq' : promptLine.length > 140 ? 'long' : 'short',
      prompt: promptLine || block,
      points: isMcq ? 2 : 10,
      order: idx + 1,
      options: isMcq
        ? optionLines.map((o) => o.replace(/^[A-D][.)]\s+/i, '').trim())
        : undefined,
      correctOptionIndex: isMcq ? 0 : undefined,
      createdByTeacherId: teacherId,
    };
  });
}
