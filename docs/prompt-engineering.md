# Prompt Engineering & AI Skills

ZenReader is not just a wrapper around an API; it is a **Persona-Driven Application**.

## The Challenge
Standard LLM summaries of podcasts/videos are usually bullet points:
*   Speaker A said X.
*   Speaker B said Y.
*   Conclusion.

This is boring and hard to read.

## The Solution: The "Podcast-to-Book" Skill

We have defined a specific "Skill" (located conceptually in `.gemini/skills/podcast-to-book/SKILL.md` and embedded in `services/geminiService.ts`) that fundamentally alters the model's output.

### Key Components of the Prompt

#### 1. Role Definition
> "You are a skilled ghostwriter... Match the tone of classic narrative nonfiction (e.g., Shoe Dog, The Big Short)."

This shifts the model from "Assistant" mode (helpful, terse) to "Author" mode (narrative, flowery, detailed).

#### 2. Structural Mandates
We explicitly forbid bullet points for the main content.
> "No section headers, bullet points, or artificial breaks... Weave it together."

#### 3. Metadata Extraction
We enforce a strict data extraction for the Introduction chapter:
*   **Source & Context:** Who is speaking? When?
*   **Bio:** Who is the guest? (Crucial for context).

#### 4. High-Impact Titling
We explicitly train the model on "Bad vs Good" titles in the prompt to avoid generic outputs.
*   *Bad:* "Summary of the talk"
*   *Good:* "The Alien in the Cage"

## Implementation Details

### System Instructions vs. User Prompt
We place the Skill definition in the `systemInstruction` field of the Gemini config.
*   **System:** "You are the Ghostwriter..." (The Skill)
*   **User:** "Here is a URL. Transform it." (The Task)

This separation ensures the persona is maintained even if the video content is messy or contradictory.

### Grounding
We utilize the `googleSearch` tool. This is critical because the model might not have watched the video *frame-by-frame*. By allowing it to search, it finds:
1.  Transcripts.
2.  Reviews/Articles discussing the video.
3.  Biographical info about the guest.

It synthesizes this "Grounding Data" through the "Ghostwriter Lens" to produce the final book.
