import { processDocument } from "../process-document-service";

interface LLMStructuringOptions {
  documentId?: string;
  userId?: string;
}

const CHUNK_SIZE = 8000;

const STRUCTURING_PROMPT = `You are a document formatting assistant. Your task is to restructure raw extracted text into clean, well-formatted plain text.

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

/**
 * LLM-based text structuring pass.
 * Controlled by LLM_STRUCTURING_ENABLED env var (default: false).
 */
export async function structureWithLLM(
  pages: Array<{ pageNumber: number; content: string }>,
  options?: LLMStructuringOptions
): Promise<string> {
  if (process.env.LLM_STRUCTURING_ENABLED !== "true") {
    // Return locally-cleaned text as fallback
    return pages
      .map((p) => `--- Page ${p.pageNumber} ---\n\n${p.content}`)
      .join("\n\n");
  }

  // Chunk pages to ~CHUNK_SIZE chars
  const chunks = chunkPages(pages, CHUNK_SIZE);
  const structuredChunks: string[] = [];

  for (const chunk of chunks) {
    const text = chunk
      .map((p) => `--- Page ${p.pageNumber} ---\n${p.content}`)
      .join("\n\n");

    const response = await processDocument(
      {
        task: "pdf_extract",
        contents: [
          {
            text: `${STRUCTURING_PROMPT}\n\n<raw_text>\n${text}\n</raw_text>\n\nRestructure the above text into clean, well-formatted plain text:`,
          },
        ],
        documentId: options?.documentId,
        userId: options?.userId,
      },
      { effort: "low" }
    );

    structuredChunks.push(response.text);
  }

  return structuredChunks.join("\n\n");
}

function chunkPages(
  pages: Array<{ pageNumber: number; content: string }>,
  maxChars: number
): Array<Array<{ pageNumber: number; content: string }>> {
  const chunks: Array<Array<{ pageNumber: number; content: string }>> = [];
  let currentChunk: Array<{ pageNumber: number; content: string }> = [];
  let currentSize = 0;

  for (const page of pages) {
    if (currentSize + page.content.length > maxChars && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = [];
      currentSize = 0;
    }
    currentChunk.push(page);
    currentSize += page.content.length;
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}
