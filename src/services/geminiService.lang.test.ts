import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { summarizeChapter, summarizeBook, answerQuestion, generateBookFromYouTube, generateBookFromText } from './geminiService';

// Mock fetch for the proxy endpoint
const mockFetch = vi.fn() as Mock;
global.fetch = mockFetch;

describe('geminiService language support', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ text: "Mock response", candidates: [] })
        });
    });

    describe('AI Interactions (should auto-detect, NOT force translation)', () => {
        describe('summarizeChapter', () => {
            it('should use auto-detect instruction when language is provided', async () => {
                await summarizeChapter("some English text", "Spanish");

                const fetchCall = mockFetch.mock.calls[0];
                const body = JSON.parse(fetchCall[1].body);

                // Should NOT contain forced translation instruction
                expect(body.contents).not.toContain("You MUST write your entire response, including all headings, in **Spanish**");
                // Should contain natural response instruction
                expect(body.contents).toContain("Respond in the same language");
            });

            it('should auto-detect when no language provided', async () => {
                await summarizeChapter("some text");

                const fetchCall = mockFetch.mock.calls[0];
                const body = JSON.parse(fetchCall[1].body);

                expect(body.contents).toContain("Respond in the same language");
            });
        });

        describe('summarizeBook', () => {
            it('should use auto-detect for all languages', async () => {
                const languages = ['Spanish', 'Chinese', 'French', 'German', 'Japanese', 'English'];

                for (const lang of languages) {
                    vi.clearAllMocks();
                    await summarizeBook("some text", lang);

                    const fetchCall = mockFetch.mock.calls[0];
                    const body = JSON.parse(fetchCall[1].body);

                    // Should NOT force translation
                    expect(body.contents).not.toContain(`in **${lang}**`);
                    expect(body.contents).toContain("Respond in the same language");
                }
            });
        });

        describe('answerQuestion', () => {
            it('should use auto-detect for all languages', async () => {
                const languages = ['Spanish', 'Chinese', 'French', 'German', 'Japanese', 'English'];

                for (const lang of languages) {
                    vi.clearAllMocks();
                    await answerQuestion("context", "question", lang);

                    const fetchCall = mockFetch.mock.calls[0];
                    const body = JSON.parse(fetchCall[1].body);

                    // Should NOT force translation
                    expect(body.contents).not.toContain(`in **${lang}**`);
                    expect(body.contents).toContain("Respond in the same language");
                }
            });
        });
    });

    describe('Book Generation (should respect target language)', () => {
        describe('generateBookFromYouTube', () => {
            it('should use original language by default', async () => {
                await generateBookFromYouTube("https://youtube.com/watch?v=test", true, 'original');

                const fetchCall = mockFetch.mock.calls[0];
                const body = JSON.parse(fetchCall[1].body);

                // Should contain preserve original language instruction
                expect(body.config.systemInstruction).toContain("EXACT SAME LANGUAGE");
            });

            it('should force translation when target language is specified', async () => {
                const languages = ['Spanish', 'Chinese', 'French', 'German', 'Japanese', 'English'];

                for (const lang of languages) {
                    vi.clearAllMocks();
                    await generateBookFromYouTube("https://youtube.com/watch?v=test", true, lang);

                    const fetchCall = mockFetch.mock.calls[0];
                    const body = JSON.parse(fetchCall[1].body);

                    // Should force translation to target language
                    expect(body.config.systemInstruction).toContain(`in **${lang}**`);
                }
            });

            it('should work with Smart Format enabled for all languages', async () => {
                const languages = ['original', 'Spanish', 'Chinese', 'French', 'German', 'Japanese', 'English'];

                for (const lang of languages) {
                    vi.clearAllMocks();
                    await generateBookFromYouTube("https://youtube.com/watch?v=test", true, lang);

                    const fetchCall = mockFetch.mock.calls[0];
                    const body = JSON.parse(fetchCall[1].body);

                    // Should include podcast skill for Smart Format
                    expect(body.config.systemInstruction).toContain("Podcast Episode → Narrative Article");

                    if (lang === 'original') {
                        expect(body.config.systemInstruction).toContain("EXACT SAME LANGUAGE");
                    } else {
                        expect(body.config.systemInstruction).toContain(`in **${lang}**`);
                    }
                }
            });
        });

        describe('generateBookFromText', () => {
            it('should respect target language for all supported languages', async () => {
                const languages = ['original', 'Spanish', 'Chinese', 'French', 'German', 'Japanese', 'English'];

                for (const lang of languages) {
                    vi.clearAllMocks();
                    await generateBookFromText("Test content", "Test Title", lang);

                    const fetchCall = mockFetch.mock.calls[0];
                    const body = JSON.parse(fetchCall[1].body);

                    if (lang === 'original') {
                        expect(body.config.systemInstruction).toContain("EXACT SAME LANGUAGE");
                    } else {
                        expect(body.config.systemInstruction).toContain(`in **${lang}**`);
                    }
                }
            });
        });
    });

    describe('Integration: Language flow', () => {
        it('should handle the complete flow correctly', async () => {
            // 1. Generate book with Spanish target
            await generateBookFromYouTube("https://youtube.com/watch?v=test", true, 'Spanish');
            let fetchCall = mockFetch.mock.calls[0];
            let body = JSON.parse(fetchCall[1].body);
            expect(body.config.systemInstruction).toContain("in **Spanish**");

            // 2. Summarize book (should auto-detect, not force Spanish)
            vi.clearAllMocks();
            await summarizeBook("Book content in English", "Spanish");
            fetchCall = mockFetch.mock.calls[0];
            body = JSON.parse(fetchCall[1].body);
            expect(body.contents).not.toContain("in **Spanish**");
            expect(body.contents).toContain("Respond in the same language");

            // 3. Answer question (should auto-detect, not force Spanish)
            vi.clearAllMocks();
            await answerQuestion("Context", "Question", "Spanish");
            fetchCall = mockFetch.mock.calls[0];
            body = JSON.parse(fetchCall[1].body);
            expect(body.contents).not.toContain("in **Spanish**");
            expect(body.contents).toContain("Respond in the same language");
        });
    });
});
