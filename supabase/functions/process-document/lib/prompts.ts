export const PDF_EXTRACTION_PROMPT = `Extract all text from every page of this PDF document.

<rules>
- Preserve the original structure: headings, paragraphs, lists, tables, and whitespace.
- Do NOT summarize, paraphrase, or omit any text. Extract verbatim.
- If a page is blank or contains only images with no text, output "PAGE N:" followed by "[BLANK]".
- If text spans a page break mid-sentence, include the partial text on each respective page as it appears.
- Do NOT add commentary, explanations, or any text not present in the original document.
</rules>

<format>
PAGE 1:
[verbatim text content of page 1]
---PAGE_BREAK---
PAGE 2:
[verbatim text content of page 2]
---PAGE_BREAK---
</format>

Output every page using this exact format. Begin with PAGE 1:`;

export function buildPageClassificationPrompt(
  pagesData: Array<{
    content: string;
    pageNumber: number;
    totalPages: number;
    characterCount: number;
  }>,
): string {
  let prompt = `Classify each document page into exactly one category.

<categories>
- content: Main educational/learning material — lectures, explanations, examples, detailed information, diagrams with explanations
- cover: Title/cover page or syllabus header — typically has course name, instructor, date, institution, with minimal body text
- toc: Table of contents or index — section/chapter listings with corresponding page numbers
- outline: Course outline, schedule, weekly agenda, or syllabus body with dates and topic listings
- objectives: Learning objectives/outcomes/goals — typically bullet points with action verbs (understand, explain, describe, analyze)
- review: Summary, recap, conclusion, or "what we learned" — references previously covered material
- quiz: Assessment material — numbered questions, answer choices, practice problems, exam content
- blank: Empty or nearly empty pages (minimal meaningful content)
- unknown: Cannot determine with reasonable confidence
</categories>

<rules>
1. Default to "content" when uncertain — it is the most common category.
2. Use page position as a signal, not a rule: covers tend to appear early, reviews tend to appear late, but exceptions exist.
3. A page with a title AND substantial educational material below it is "content", not "cover".
4. Distinguish "outline" (schedule/agenda with dates or week numbers) from "toc" (section listings with page numbers).
5. Objectives pages state what students *will* learn; review pages summarize what *was* learned.
6. Pages with only headers, footers, or page numbers and no meaningful body text are "blank".
7. If a page mixes categories (e.g., objectives followed by content), classify by the dominant purpose.
</rules>

<pages>
`;

  pagesData.forEach((page, index) => {
    const position = getPositionLabel(page.pageNumber, page.totalPages);
    const contentPreview =
      page.content.length > 800
        ? page.content.substring(0, 800) + "..."
        : page.content;

    prompt += `<page index="${index + 1}" page_number="${page.pageNumber}" total_pages="${page.totalPages}" position="${position}" char_count="${page.characterCount}">
${contentPreview}
</page>
`;
  });

  prompt += `</pages>

Respond with a JSON array of exactly ${pagesData.length} objects, one per page in order:
[{"classification": "<category>", "confidence": <0.0-1.0>, "reasoning": "<one sentence>"}]`;

  return prompt;
}

function getPositionLabel(pageNumber: number, totalPages: number): string {
  const ratio = pageNumber / totalPages;
  if (ratio <= 0.1) return "beginning";
  if (ratio <= 0.3) return "early";
  if (ratio <= 0.7) return "middle";
  if (ratio <= 0.9) return "late";
  return "end";
}

export const TOPIC_EXTRACTION_PROMPT = `Extract the main topics and sections from this educational document.

<rules>
- Return topics in the order they appear in the document.
- Use concise, descriptive names (e.g., "Cell Membrane Structure" not "The part about cell membranes").
- Only include topics with substantial content — skip incidental mentions.
- Aim for 3–15 topics depending on document scope.
</rules>

Return ONLY a JSON array of topic strings.

<document>
`;

export const LLM_STRUCTURING_PROMPT = `You are a document formatting assistant. Your task is to restructure raw extracted text into clean, well-formatted plain text.

Rules:
- Do NOT summarize, omit, or add any information. Only restructure what exists.
- Do NOT use markdown syntax (no # headings, no ** bold, no * italic).
- Use clear section headings and subheadings in plain text.
- Use plain list characters (-, 1., 2., etc.) for lists.
- Clearly label key terms and definitions.
- Preserve tabular data in aligned text format.
- Use --- as section separators between major topics.
- Preserve page boundaries with "--- Page N ---" markers.
- Fix obvious OCR artifacts and broken words where possible.
- Maintain the original document's logical flow and hierarchy.`;
