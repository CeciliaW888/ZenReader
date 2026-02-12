import { Chapter } from '../types';

export interface Heading {
  id: string;
  text: string;
  level: number;
}

export const slugify = (text: string): string => {
  return text
    .toString()
    .trim()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\p{L}\p{N}_-]+/gu, '') // Remove non-letter, non-number chars (preserves Unicode letters)
    .replace(/-+/g, '-')            // Replace multiple - with single -
    .replace(/^-+|-+$/g, '');       // Remove leading/trailing dashes
};

export const extractHeadings = (markdown: string): Heading[] => {
  const headingRegex = /^(#{1,3})\s+(.+)$/gm;
  const allHeadings: Heading[] = [];
  let match;

  while ((match = headingRegex.exec(markdown)) !== null) {
    const level = match[1].length;
    let text = match[2].trim();

    // Clean up "Chapter X: " from the display text in TOC
    text = text.replace(/^Chapter\s+\d+[:.]?\s*/i, '');

    allHeadings.push({
      id: slugify(match[2].trim()), // ID uses original text to match anchors
      text, // Display text is cleaned
      level
    });
  }

  // Heuristic: If there is exactly one H1, it's likely the Book Title. 
  // We should hide it from the TOC as the Sidebar header already shows the title.
  // If there are multiple H1s, they are likely "Chapters" (Chapter 1, Chapter 2...), so we keep them.
  const h1Count = allHeadings.filter(h => h.level === 1).length;

  return allHeadings.filter((h, index) => {
    // 1. Filter out Single H1 (Title)
    if (h.level === 1 && h1Count === 1) return false;

    // 2. Filter out "Introduction" if it is the very first item (redundant)
    if (index === 0 && h.text.toLowerCase() === 'introduction') return false;

    return true;
  });
};

export const parseMarkdownToBook = (text: string, fileName: string): { title: string, chapters: Chapter[] } => {
  const lines = text.split('\n');

  // Extract a likely title from the first H1
  const firstH1 = lines.find(l => l.startsWith('# '));
  const bookTitle = firstH1 ? firstH1.replace('# ', '').trim() : fileName.replace('.md', '');

  // Treat the entire file as a single chapter to support "Heading Navigation"
  const chapters: Chapter[] = [{
    id: 'chap-0',
    title: bookTitle, // Use book title
    content: text,
    order: 0
  }];

  return { title: bookTitle, chapters };
};