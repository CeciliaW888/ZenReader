import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Handle potential ESM/CJS interop issues with pdfjs-dist
// @ts-expect-error - pdfjs-dist has inconsistent module exports between environments
const pdfjs = pdfjsLib.default || pdfjsLib;

// Ensure worker is set up safely
if (typeof window !== 'undefined' && pdfjs.GlobalWorkerOptions) {
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
  }
}

export const extractTextFromFile = async (file: File): Promise<string> => {
  const extension = file.name.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'pdf':
      return await extractTextFromPDF(file);
    case 'docx':
      return await extractTextFromDOCX(file);
    case 'md':
    case 'txt':
    case 'markdown':
    case 'srt':
    case 'vtt':
      return await extractTextFromPlain(file);
    default:
      throw new Error(`Unsupported file type: .${extension}`);
  }
};

const extractTextFromPlain = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
};

const extractTextFromDOCX = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        // mammoth usually requires the arrayBuffer directly
        const result = await mammoth.extractRawText({ arrayBuffer });
        resolve(result.value);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (e) => reject(e);
    reader.readAsArrayBuffer(file);
  });
};

const extractTextFromPDF = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();

  // Use the resolved pdfjs instance
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

  let fullText = '';

  // Iterate through all pages
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: { str?: string }) => item.str || '')
      .join(' ');
    fullText += pageText + '\n\n';
  }

  return fullText;
};