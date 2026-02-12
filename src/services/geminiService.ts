import { Book } from "../types";
import { getErrorMessage } from "../utils/errorMessages";

// Content length limits (in characters, ~4 chars per token)
const CONTENT_LIMITS = {
  CHAPTER_SUMMARY: 10000,    // ~2,500 tokens
  BOOK_SUMMARY_CHUNK: 20000, // ~5,000 tokens per chunk
  QUESTION_CONTEXT: 15000,   // ~3,750 tokens
  MAX_BOOK_CONTENT: 100000,  // ~25,000 tokens - above this we chunk
};

// Model chains with fallbacks (updated January 2026)
// See: https://ai.google.dev/gemini-api/docs/models

const PRO_MODELS = [
  'gemini-2.5-pro',        // State-of-the-art reasoning model
  'gemini-2.5-flash',      // Fast fallback with good capabilities
];

const FLASH_MODELS = [
  'gemini-2.5-flash',      // Fast, supports text/image/video/audio
  'gemini-2.5-flash-lite', // Lighter/faster variant
];

const YOUTUBE_MODELS = [
  'gemini-2.5-flash',      // Supports video processing
  'gemini-2.5-pro',        // Complex video reasoning fallback
];

// Backend Proxy Client to hide API Key

const getAIClient = () => {
  // Client is now just a dummy or not needed, as we fetch from server
  // const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  return true;
};

// Utility to chunk large text into manageable pieces
const chunkText = (text: string, maxChunkSize: number): string[] => {
  if (text.length <= maxChunkSize) {
    return [text];
  }

  const chunks: string[] = [];
  let currentIndex = 0;

  while (currentIndex < text.length) {
    let endIndex = currentIndex + maxChunkSize;

    // Try to break at paragraph or sentence boundary
    if (endIndex < text.length) {
      // Look for paragraph break
      const paragraphBreak = text.lastIndexOf('\n\n', endIndex);
      if (paragraphBreak > currentIndex + maxChunkSize * 0.5) {
        endIndex = paragraphBreak;
      } else {
        // Look for sentence break
        const sentenceBreak = text.lastIndexOf('. ', endIndex);
        if (sentenceBreak > currentIndex + maxChunkSize * 0.5) {
          endIndex = sentenceBreak + 1;
        }
      }
    }

    chunks.push(text.slice(currentIndex, endIndex).trim());
    currentIndex = endIndex;
  }

  return chunks.filter(chunk => chunk.length > 0);
};

// Types for the generate API
interface GenerateConfig {
  contents: string;
  config?: {
    systemInstruction?: string;
    tools?: Array<{ googleSearch?: Record<string, unknown> }>;
    generationConfig?: Record<string, unknown>;
  };
}

interface GenerateResponse {
  text: string;
  candidates?: Array<{
    groundingMetadata?: {
      groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
    };
  }>;
}

// Helper to try multiple models via Proxy
async function generateContentWithFallback(
  _ai: boolean, // Param kept for signature compatibility but unused
  modelSequence: string[],
  config: GenerateConfig
): Promise<GenerateResponse> {
  let lastError;
  for (const model of modelSequence) {
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          contents: config.contents,
          config: config.config
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || response.statusText);
      }

      const data = await response.json();
      return data;

    } catch (err) {
      console.warn(`Model ${model} failed via Proxy:`, err);
      lastError = err;
      // Continue to next model
    }
  }
  // Throw with user-friendly message
  const appError = getErrorMessage(lastError);
  throw new Error(appError.userMessage);
}

// Skill definition moved to generic string to avoid unused var if not used in config directly or use it
const PODCAST_TO_BOOK_SKILL = `
---
name: podcast-to-book-chapter
description: Transform long-form podcast episodes into compelling, print-ready book chapters.
---

# Podcast Episode → Narrative Article

## Core Capability
Transform long-form podcast episodes into compelling, print-ready narrative nonfiction articles.

## Role Definition
You are a skilled ghostwriter who:
- Listens to/reads full podcast episodes
- Extracts the narrative spine and dramatic arc
- Crafts prose suitable for physical book publication
- Preserves authentic voices through strategic quotation
- Makes complex concepts accessible without oversimplification

## Style Framework

### Voice Targets
Match the tone of classic narrative nonfiction (e.g. *Shoe Dog*, *The Signal and the Noise*).

### Key Principles
- Rich narrative with dramatic tension.
- **NO Bullet points** in the main narrative. Use prose.
- **Heading Structure**: Use Markdown headers (##) to denote turning points or scene changes.

---

## Structure Requirements

### 1. Front Matter (Mandatory Start)
Start the content immediately with a blockquote (>) containing the metadata:
> **Source:** [Podcast Name] | **Guest:** [Name] | **Topic:** [Topic]

**CRITICAL:** Do NOT output the Book Title or Subtitle as a Markdown Header at the top. The application handles the title display. Start directly with the metadata blockquote.

### 2. The Hook & Bio
Immediately follow the blockquote with the narrative hook. 
Do NOT create a header called "Introduction". Just start writing.
Include a section titled **"## About the Guest"** early in the text to establish authority.

### 3. Narrative Flow
Write as a single cohesive article. 
**FORBIDDEN:** Do not use the word "Chapter" in any headings. Do not say "Chapter 1", "Chapter 2". 
Use descriptive **## Headings** only (e.g., "## The Problem with AI", "## A New Hope").

### 4. High-Impact Headings
Use dramatic headings.
*   *Bad:* "Summary of AI Risk"
*   *Good:* "## The Alien in the Cage"

---

## Quality Checklist
1. **Readability**: Does this read like a New Yorker article?
2. **Structure**: Did I use ## Headers effectively for navigation?
3. **No Chapters**: Did I ensure no headings contain "Chapter X"?
4. **No Title Header**: Did I start with the metadata blockquote?
5. **Bio Included**: Is the "About the Guest" section included?
`;

// Helper to get language instruction for BOOK GENERATION ONLY
// For AI interactions (summaries, Q&A), we want natural language matching the user's context
const getLanguageInstructionForGeneration = (language?: string) => {
  if (language && language !== 'original') {
    return `**LANGUAGE REQUIREMENT**: You MUST write your entire response, including all headings, in **${language}**. Do NOT use the source text's language.`;
  }
  return "**LANGUAGE REQUIREMENT**: You MUST write your entire response, including all headings, in the **EXACT SAME LANGUAGE** as the source text/video. **STRICTLY PROHIBITED**: Do NOT translate the content into any other language (e.g., if input is English, output MUST be English). Ensure all generated titles and structural elements are in that same original language.";
};

// Helper for AI interactions - respond naturally without forcing translation
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getLanguageInstructionForInteraction = (language?: string) => {
  // For AI interactions, we ignore the book's target language and respond naturally
  // This prevents unwanted translations when the user asks questions
  return "Respond in the same language as the user's question or the content being discussed. Do NOT translate unless explicitly asked.";
};

export const summarizeChapter = async (text: string, language?: string): Promise<string> => {
  const ai = getAIClient();
  if (!ai) return "Error: API Key missing.";

  const langInstruction = getLanguageInstructionForInteraction(language);
  const truncatedText = text.substring(0, CONTENT_LIMITS.CHAPTER_SUMMARY);

  try {
    const response = await generateContentWithFallback(ai, FLASH_MODELS, {
      contents: `Please provide a concise and engaging summary of the following text, capturing the main plot points or key ideas. Keep it under 200 words. ${langInstruction}\n\nText:\n${truncatedText}`,
    });
    return response.text || "Could not generate summary.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Failed to generate summary. Please try again.";
  }
};

export const summarizeBook = async (bookContent: string, language?: string): Promise<string> => {
  const ai = getAIClient();
  if (!ai) return "Error: API Key missing.";

  const langInstruction = getLanguageInstructionForInteraction(language);

  try {
    // For large books, chunk and summarize in stages
    if (bookContent.length > CONTENT_LIMITS.MAX_BOOK_CONTENT) {
      console.log(`[AI] Large book detected (${bookContent.length} chars), using chunked summarization`);

      // Stage 1: Chunk the content and get summaries for each chunk
      const chunks = chunkText(bookContent, CONTENT_LIMITS.BOOK_SUMMARY_CHUNK);
      const chunkSummaries: string[] = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunkResponse = await generateContentWithFallback(ai, FLASH_MODELS, {
          contents: `Summarize this section (part ${i + 1} of ${chunks.length}) in 2-3 paragraphs, focusing on key points and themes. ${langInstruction}\n\nContent:\n${chunks[i]}`,
        });
        if (chunkResponse.text) {
          chunkSummaries.push(`Part ${i + 1}:\n${chunkResponse.text}`);
        }
      }

      // Stage 2: Combine chunk summaries into final overview
      const combinedSummaries = chunkSummaries.join('\n\n');
      const finalResponse = await generateContentWithFallback(ai, FLASH_MODELS, {
        contents: `You are an expert literary editor. Based on these section summaries, write a compelling "Back Cover" style summary for this book. Focus on the overarching themes, main arguments, or narrative arc. Keep it to 3-4 paragraphs. ${langInstruction}\n\nSection Summaries:\n${combinedSummaries}`,
      });

      return finalResponse.text || "Could not generate book overview.";
    }

    // For smaller books, use direct summarization
    const response = await generateContentWithFallback(ai, FLASH_MODELS, {
      contents: `You are an expert literary editor. Write a compelling "Back Cover" style summary for this entire book/document. Focus on the overarching themes, main arguments, or narrative arc. ${langInstruction}\n\nBook Content:\n${bookContent.substring(0, CONTENT_LIMITS.MAX_BOOK_CONTENT)}`,
    });
    return response.text || "Could not generate book overview.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Failed to generate overview. The book may be too large to process.";
  }
};

export const answerQuestion = async (context: string, question: string, language?: string): Promise<string> => {
  const ai = getAIClient();
  if (!ai) return "Error: API Key missing.";

  const langInstruction = getLanguageInstructionForInteraction(language);
  const truncatedContext = context.substring(0, CONTENT_LIMITS.QUESTION_CONTEXT);

  try {
    const response = await generateContentWithFallback(ai, FLASH_MODELS, {
      contents: `You are a helpful reading assistant. Answer the user's question based on the provided text context. ${langInstruction}\n\nContext:\n${truncatedContext}\n\nQuestion: ${question}`,
    });
    return response.text || "I couldn't find an answer to that.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Failed to process request.";
  }
};

export const generateBookFromYouTube = async (url: string, smartFormat: boolean = true, targetLanguage: string = 'original'): Promise<Book> => {
  const ai = getAIClient();
  if (!ai) throw new Error("API Key missing");

  // We do NOT use JSON schema here because combining JSON schema with Google Search tool
  // often leads to stability issues or conflicts in the model output format.
  // Instead, we request a specific plain text/markdown format.

  // Use pro models for complex reasoning like researching and structuring a book
  try {
    const langInstruction = getLanguageInstructionForGeneration(targetLanguage);

    // Config based on Smart Format
    let systemInstruction = smartFormat
      ? PODCAST_TO_BOOK_SKILL
      : `You are a helpful assistant. Get the transcript or a detailed textual representation of this video content.
         1. **Format**: Return a single Markdown document.
         2. **Title**: Start with "TITLE: <Video Title>".
         3. **Content**: Provide the content directly.
         ${langInstruction}`;

    if (smartFormat) {
      systemInstruction += `\n\n${langInstruction}`;
    }

    const response = await generateContentWithFallback(ai, YOUTUBE_MODELS, {
      contents: `I have a YouTube video URL: ${url}. 
        I need you to perform a Google Search to find the transcript, summary, or detailed content of this SPECIFIC video.
        
        STEP 1: Search for the video URL to identify the exact Title and Channel.
        STEP 2: Search for the transcript or a detailed summary of THIS specific video.
        STEP 3: If you cannot find the exact transcript, perform a broad search on the main topic of the video (using the Title found in Step 1) to synthesize a comprehensive, high-quality book chapter about that subject. 
        **Drafting Strategy if Transcript Missing:**
        - Identify the core topic from the Title.
        - Research this topic using Google Search tools.
        - Write a chapter that explains this topic in depth, similar to how the video likely covered it.
        - **Disclaimer:** If you are synthesizing based on topic research rather than a direct transcript, add a small disclaimer in the "Source" blockquote (e.g., "Source: Subject Research based on [Video Title]").

        STEP 4: ${smartFormat
          ? 'Transform the gathered information into a structured narrative article by strictly following the "Podcast Episode → Narrative Article" skill provided below.'
          : 'Simply output the gathered content as is.'}
        
        CRITICAL OUTPUT REQUIREMENTS:
        1.  **Format**: Start with the title on the very first line prefixed with "TITLE: ".
        2.  **Content**: Follow the title immediately with the book content in Markdown.
        
        Example Output:
        TITLE: The Future of AI
        > **Source:** ...
        
        ## The Beginning
        [Content here...]
        `,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: systemInstruction,
      }
    });

    let text = response.text || "";

    if (!text || text.includes("ERROR: Content not found")) {
      throw new Error("Could not find content for this video. Please check the URL or try a video with a transcript.");
    }

    // Extract Sources from Grounding Metadata
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    let sourcesMarkdown = "";
    if (groundingChunks) {
      const sources = groundingChunks
        .map((chunk: { web?: { uri?: string; title?: string } }) => chunk.web?.uri ? `[${chunk.web.title || 'Source'}](${chunk.web.uri})` : null)
        .filter(Boolean);

      // Deduplicate sources
      const uniqueSources = [...new Set(sources)];

      if (uniqueSources.length > 0) {
        sourcesMarkdown = "\n\n---\n\n## Sources & References\n" + uniqueSources.map((s: string) => `- ${s}`).join('\n');
      }
    }

    // Parse Title from the first line
    let title = "YouTube Summary";
    // Regex to match "TITLE: ..." at start of string, handling potential whitespace
    const titleMatch = text.match(/^\s*TITLE:\s*(.+)$/m);

    if (titleMatch) {
      title = titleMatch[1].trim();
      // Remove the title line from the text
      text = text.replace(/^\s*TITLE:\s*.+$/m, '').trim();
    } else {
      // Fallback: Check for H1
      const h1Match = text.match(/^#\s+(.+)$/m);
      if (h1Match) {
        title = h1Match[1].trim();
      }
    }

    const fullContent = text + sourcesMarkdown;

    return {
      id: crypto.randomUUID(),
      title: title,
      fileName: url,
      dateAdded: Date.now(),
      source: 'youtube',
      language: targetLanguage === 'original' ? undefined : targetLanguage,
      chapters: [{
        id: 'chap-0',
        title: title, // Use book title for the single chapter
        content: fullContent,
        order: 0
      }]
    };
  } catch (err: unknown) {
    console.error("YouTube Generation Failed", err);
    throw err;
  }
};

export const generateBookFromText = async (text: string, title: string = "Pasted Content", targetLanguage: string = 'original'): Promise<Book> => {
  const ai = getAIClient();

  if (!ai) {
    return new Promise((resolve) => {
      const id = crypto.randomUUID();
      resolve({
        id,
        title,
        fileName: 'pasted.txt',
        dateAdded: Date.now(),
        source: 'text',
        language: targetLanguage === 'original' ? undefined : targetLanguage,
        chapters: [{
          id: 'chap-0',
          title: 'Content',
          content: text,
          order: 0
        }]
      });
    });
  }

  try {
    const langInstruction = getLanguageInstructionForGeneration(targetLanguage);

    // Use PRO models for better instruction following (e.g., structuring Chinese text with English instructions)
    const response = await generateContentWithFallback(ai, PRO_MODELS, {
      contents: `Please process the following text:
        
        ${text.substring(0, 30000)}`,
      config: {
        systemInstruction: `You are an expert ghostwriter and editor. Your goal is to convert raw spoken transcripts or loose text into a high-quality, professional book chapter.

CRITICAL OUTPUT REQUIREMENTS:
1. **Format**: Return a single cohesive Markdown document.
2. **Title**: Start with the book title on the very first line, prefixed with "TITLE: ".
3. **Headings**: You MUST use ## Headings to break the content into logical sections.
4. **Structure**: The input text might be unstructured or dense. You MUST analyze the content and insert ## Headings to break it into logical sections. **ALWAYS start the main content with a ## Heading appropriate for the content (e.g., 'Introduction' or 'Overview' translated into the target language).**
5. **Style & Tone (Crucial)**:
   - **No Verbatim**: Do NOT just copy the input text. REWRITE it.
   - **Polished Narrative**: Convert spoken language (e.g., "Can you hear me?", "Type 1 in chat", "Um, ah") into polished written prose. Remove all audience interactions, filler words, and stammering.
   - **Book Quality**: Ensure the flow is smooth, professional, and typically found in published non-fiction books or articles.
6. **No "Chapter"**: Do NOT use the word "Chapter" in headings.
7. **No "Introduction"**: Do NOT use an "Introduction" header.

${langInstruction}
**Ensure all generated headings, titles, and structural elements are in the target language.**

8. **Example Output**:
   TITLE: My Book Title
   
   ## First Section
   Content...
`,
      }
    });

    let generatedText = response.text || "";

    // Parse Title
    let bookTitle = title;
    const titleMatch = generatedText.match(/^\s*TITLE:\s*(.+)$/m);

    if (titleMatch) {
      bookTitle = titleMatch[1].trim();
      // Remove the title line from the text
      generatedText = generatedText.replace(/^\s*TITLE:\s*.+$/m, '').trim();
    }

    if (!generatedText) throw new Error("No content created");

    return {
      id: crypto.randomUUID(),
      title: bookTitle,
      fileName: 'pasted.txt',
      dateAdded: Date.now(),
      source: 'text',
      language: targetLanguage === 'original' ? undefined : targetLanguage,
      chapters: [{
        id: 'chap-0',
        title: bookTitle,
        content: generatedText,
        order: 0
      }]
    };

  } catch (err) {
    console.error("AI Text structure failed", err);
    // Fallback to original text if AI fails
    return {
      id: crypto.randomUUID(),
      title,
      fileName: 'pasted.txt',
      dateAdded: Date.now(),
      source: 'text',
      chapters: [{
        id: 'chap-0',
        title: title,
        content: text,
        order: 0
      }]
    };
  }
};