import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { GoogleGenAI } from "npm:@google/genai";
import { getFallbackModels, resolveModel, buildThinkingConfig } from "./lib/model-config.ts";
import { PDF_EXTRACTION_PROMPT, buildPageClassificationPrompt, TOPIC_EXTRACTION_PROMPT, LLM_STRUCTURING_PROMPT } from "./lib/prompts.ts";
import { classifyPageHeuristic, type ExtractedPage, type PageClassification } from "./lib/heuristic-classifier.ts";
import { cleanDocument } from "./lib/page-cleanup.ts";

interface RequestPayload {
  documentId: string;
  userId: string;
  filePath: string;
  batchId?: string;
}

interface PageMetadata {
  pageNumber: number;
  classification: PageClassification;
  filtered: boolean;
  confidence: number;
  detectionMethod: "heuristic" | "ai";
  characterCount: number;
  keywords?: string[];
}

const PRICING: Record<string, { inputPer1M: number; outputPer1M: number }> = {
  "gemini-2.5-flash": { inputPer1M: 0.3, outputPer1M: 2.5 },
  "gemini-3-flash-preview": { inputPer1M: 0.5, outputPer1M: 3.0 },
};

const FILTERED_TYPES: PageClassification[] = [
  "cover", "toc", "outline", "objectives", "review", "quiz", "blank",
];

function estimateCost(modelId: string, inputTokens: number, outputTokens: number): number | null {
  const p = PRICING[modelId];
  if (!p) return null;
  return (inputTokens / 1_000_000) * p.inputPer1M + (outputTokens / 1_000_000) * p.outputPer1M;
}

function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes("429") ||
    msg.includes("rate limit") ||
    msg.includes("resource exhausted") ||
    msg.includes("500") ||
    msg.includes("503") ||
    msg.includes("overloaded")
  );
}

async function updateDocumentStatus(
  supabase: ReturnType<typeof createClient>,
  documentId: string,
  updates: Record<string, unknown>,
) {
  await supabase.from("documents").update(updates).eq("id", documentId);
}

async function logTelemetry(
  supabase: ReturnType<typeof createClient>,
  data: Record<string, unknown>,
) {
  supabase.from("llm_telemetry").insert(data).then(() => {});
}

// --- Gemini call with fallback chain ---

async function callGemini(
  genAI: InstanceType<typeof GoogleGenAI>,
  supabase: ReturnType<typeof createClient>,
  task: string,
  contents: unknown[],
  opts: {
    documentId: string;
    userId: string;
    responseMimeType?: string;
    effort?: "low" | "medium" | "high";
  },
): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  const effort = opts.effort ?? "medium";
  const models = getFallbackModels(task);

  for (let attempt = 0; attempt < models.length; attempt++) {
    const modelId = models[attempt];
    const startTime = Date.now();
    const { temperature } = resolveModel(task);
    const thinkingConfig = buildThinkingConfig(modelId, effort);

    const config: Record<string, unknown> = { temperature };
    if (opts.responseMimeType) config.responseMimeType = opts.responseMimeType;
    if (thinkingConfig) Object.assign(config, thinkingConfig);

    try {
      const response = await genAI.models.generateContent({
        model: modelId,
        contents: contents as any,
        config: config as any,
      });

      const latencyMs = Date.now() - startTime;
      const usage = response.usageMetadata;
      const inputTokens = usage?.promptTokenCount ?? 0;
      const outputTokens = usage?.candidatesTokenCount ?? 0;
      const thinkingTokens = (usage as any)?.thoughtsTokenCount ?? 0;

      logTelemetry(supabase, {
        task_type: task,
        model_id: modelId,
        effort,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        thinking_tokens: thinkingTokens,
        estimated_cost_usd: estimateCost(modelId, inputTokens, outputTokens),
        latency_ms: latencyMs,
        status: "success",
        pricing_version: "v1",
        document_id: opts.documentId,
        user_id: opts.userId,
        attempt_number: attempt + 1,
      });

      return { text: response.text ?? "", inputTokens, outputTokens };
    } catch (error) {
      const latencyMs = Date.now() - startTime;

      logTelemetry(supabase, {
        task_type: task,
        model_id: modelId,
        effort,
        input_tokens: 0,
        output_tokens: 0,
        thinking_tokens: 0,
        estimated_cost_usd: null,
        latency_ms: latencyMs,
        status: "error",
        error_message: error instanceof Error ? error.message : "Unknown error",
        pricing_version: "v1",
        document_id: opts.documentId,
        user_id: opts.userId,
        attempt_number: attempt + 1,
      });

      if (!isRetryableError(error) || attempt === models.length - 1) {
        throw error;
      }
      console.warn(`Model ${modelId} failed, trying ${models[attempt + 1]}`);
    }
  }

  throw new Error("All models failed");
}

// --- Page extraction ---

function parsePageContent(text: string): ExtractedPage[] {
  const pages: ExtractedPage[] = [];
  const sections = text.split(/---PAGE_BREAK---/gi);

  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;

    const pageMatch = trimmed.match(/PAGE\s+(\d+):\s*([\s\S]*)/i);
    if (pageMatch) {
      const pageNumber = parseInt(pageMatch[1], 10);
      const content = pageMatch[2].trim();
      if (content) {
        pages.push({ pageNumber, content, characterCount: content.length });
      }
    } else {
      const numberMatch = trimmed.match(/^PAGE\s+(\d+)/i);
      if (numberMatch) {
        const pageNumber = parseInt(numberMatch[1], 10);
        const content = trimmed.replace(/^PAGE\s+\d+:?\s*/i, "").trim();
        if (content) {
          pages.push({ pageNumber, content, characterCount: content.length });
        }
      }
    }
  }

  pages.sort((a, b) => a.pageNumber - b.pageNumber);

  if (pages.length === 0) {
    const cleanText = text
      .replace(/PAGE\s+\d+:\s*/gi, "")
      .replace(/---PAGE_BREAK---/gi, "")
      .trim();
    if (cleanText) {
      pages.push({ pageNumber: 1, content: cleanText, characterCount: cleanText.length });
    }
  }

  return pages;
}

// --- Classification pipeline ---

function classifyAllPages(
  pages: ExtractedPage[],
  totalPages: number,
): { pageMetadata: PageMetadata[]; uncertainPages: Array<{ index: number; page: ExtractedPage }> } {
  const pageMetadata: PageMetadata[] = [];
  const uncertainPages: Array<{ index: number; page: ExtractedPage }> = [];

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const result = classifyPageHeuristic(page, page.pageNumber, totalPages);

    const metadata: PageMetadata = {
      pageNumber: page.pageNumber,
      classification: result.classification,
      filtered: FILTERED_TYPES.includes(result.classification),
      confidence: result.confidence,
      detectionMethod: "heuristic",
      characterCount: page.characterCount,
      keywords: result.matchedKeywords,
    };
    pageMetadata.push(metadata);

    if (result.requiresAI) {
      uncertainPages.push({ index: i, page });
    }
  }

  return { pageMetadata, uncertainPages };
}

async function runAIClassification(
  genAI: InstanceType<typeof GoogleGenAI>,
  supabase: ReturnType<typeof createClient>,
  uncertainPages: Array<{ index: number; page: ExtractedPage }>,
  pageMetadata: PageMetadata[],
  documentId: string,
  userId: string,
): Promise<number> {
  const BATCH_SIZE = 10;
  let totalAIClassifications = 0;
  const validClassifications: PageClassification[] = [
    "content", "cover", "toc", "outline", "objectives", "review", "quiz", "blank", "unknown",
  ];

  for (let i = 0; i < uncertainPages.length; i += BATCH_SIZE) {
    const batch = uncertainPages.slice(i, i + BATCH_SIZE);

    const pagesData = batch.map(({ page }) => ({
      content: page.content,
      pageNumber: page.pageNumber,
      totalPages: pageMetadata.length,
      characterCount: page.characterCount,
    }));

    const prompt = buildPageClassificationPrompt(pagesData);

    try {
      const { text: responseText } = await callGemini(
        genAI, supabase, "page_classify",
        [{ role: "user", parts: [{ text: prompt }] }],
        { documentId, userId, responseMimeType: "application/json", effort: "low" },
      );

      const parsed = JSON.parse(responseText || "[]");
      if (!Array.isArray(parsed)) continue;

      parsed.forEach((result: any, batchIndex: number) => {
        if (batchIndex >= batch.length) return;
        const { index } = batch[batchIndex];
        const metadata = pageMetadata[index];

        const classification = validClassifications.includes(result.classification)
          ? result.classification
          : "content";

        let confidence = parseFloat(result.confidence);
        if (isNaN(confidence) || confidence < 0 || confidence > 1) confidence = 0.5;

        if (confidence > metadata.confidence) {
          metadata.classification = classification;
          metadata.confidence = confidence;
          metadata.detectionMethod = "ai";
          metadata.filtered = FILTERED_TYPES.includes(classification);
          metadata.keywords = [
            ...(metadata.keywords || []),
            `ai-reason: ${result.reasoning || ""}`,
          ];
          totalAIClassifications++;
        }
      });
    } catch (error) {
      console.warn("AI classification batch failed, keeping heuristic results:", error);
    }
  }

  return totalAIClassifications;
}

function applyFiltering(
  pages: ExtractedPage[],
  pageMetadata: PageMetadata[],
): { filteredText: string; keptPages: ExtractedPage[] } {
  const keptPages: ExtractedPage[] = [];

  for (let i = 0; i < pages.length; i++) {
    if (!pageMetadata[i].filtered) {
      keptPages.push(pages[i]);
    }
  }

  const filteredText = keptPages
    .map((page) => `\n\n--- Page ${page.pageNumber} ---\n\n${page.content}`)
    .join("")
    .trim();

  return { filteredText, keptPages };
}

function handleEdgeCases(
  filterResult: { filteredText: string; keptPages: ExtractedPage[] },
  allPages: ExtractedPage[],
  pageMetadata: PageMetadata[],
  totalPages: number,
): { filteredText: string; pageMetadata: PageMetadata[] } {
  const { keptPages } = filterResult;

  // Edge Case 1: All pages filtered
  if (keptPages.length === 0) {
    const sortedPages = [...allPages].sort((a, b) => b.characterCount - a.characterCount);
    const toKeep = Math.max(1, Math.ceil(sortedPages.length / 2));
    const recoveredPages = sortedPages.slice(0, toKeep);

    recoveredPages.forEach((page) => {
      const metadata = pageMetadata.find((m) => m.pageNumber === page.pageNumber);
      if (metadata) {
        metadata.filtered = false;
        metadata.classification = "content";
        metadata.confidence = 0.5;
        metadata.detectionMethod = "heuristic";
        metadata.keywords = [...(metadata.keywords || []), "recovered-fallback"];
      }
    });

    const filteredText = recoveredPages
      .sort((a, b) => a.pageNumber - b.pageNumber)
      .map((page) => `\n\n--- Page ${page.pageNumber} ---\n\n${page.content}`)
      .join("")
      .trim();

    return { filteredText, pageMetadata };
  }

  // Edge Case 2: Short document with only 1 page kept
  if (totalPages < 5 && keptPages.length === 1) {
    const borderlinePages = allPages.filter((page) => {
      const metadata = pageMetadata.find((m) => m.pageNumber === page.pageNumber);
      return metadata?.filtered && metadata.confidence < 0.8 && page.characterCount > 200;
    });

    if (borderlinePages.length > 0) {
      const bestBorderline = borderlinePages.sort((a, b) => b.characterCount - a.characterCount)[0];
      const metadata = pageMetadata.find((m) => m.pageNumber === bestBorderline.pageNumber);
      if (metadata) {
        metadata.filtered = false;
        metadata.classification = "content";
        metadata.keywords = [...(metadata.keywords || []), "recovered-short-doc"];
      }

      const allKept = [...keptPages, bestBorderline].sort((a, b) => a.pageNumber - b.pageNumber);
      const filteredText = allKept
        .map((page) => `\n\n--- Page ${page.pageNumber} ---\n\n${page.content}`)
        .join("")
        .trim();

      return { filteredText, pageMetadata };
    }
  }

  return { filteredText: filterResult.filteredText, pageMetadata };
}

// --- Main handler ---

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  // Verify service role auth
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "") ?? "";
  const newKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const legacyKey = Deno.env.get("LEGACY_SERVICE_ROLE_KEY") ?? "";
  if (!token || (token !== newKey && token !== legacyKey)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let payload: RequestPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  const { documentId, userId, filePath, batchId } = payload;

  try {
    // === Stage: extracting ===
    await updateDocumentStatus(supabase, documentId, {
      status: "processing",
      processing_stage: "extracting",
      processing_started_at: new Date().toISOString(),
      error_message: null,
      error_stage: null,
    });

    // Download PDF from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("documents")
      .download(filePath);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download file: ${downloadError?.message || "No data"}`);
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    // Base64 encode in Deno
    const base64 = btoa(
      bytes.reduce((data, byte) => data + String.fromCharCode(byte), ""),
    );

    // Initialize Gemini
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured");
    const genAI = new GoogleGenAI({ apiKey });

    // Extract pages via Gemini Vision
    const { text: extractedRawText } = await callGemini(
      genAI, supabase, "pdf_extract",
      [
        { role: "user", parts: [
          { inlineData: { mimeType: "application/pdf", data: base64 } },
          { text: PDF_EXTRACTION_PROMPT },
        ] },
      ],
      { documentId, userId, effort: "medium" },
    );

    if (!extractedRawText?.trim()) {
      throw new Error("No text extracted from PDF");
    }

    const pages = parsePageContent(extractedRawText);
    if (pages.length === 0) {
      throw new Error("Failed to parse pages from extracted text");
    }

    const totalPages = pages.length;

    // === Stage: filtering ===
    await updateDocumentStatus(supabase, documentId, {
      status: "processing",
      processing_stage: "filtering",
    });

    // Run local cleanup pipeline
    const cleanupResult = cleanDocument(
      pages.map((p) => ({ pageNumber: p.pageNumber, content: p.content })),
    );

    // Generate cleaned data (local assembly — LLM structuring is opt-in)
    let cleanedData: string;
    const llmStructuringEnabled = Deno.env.get("LLM_STRUCTURING_ENABLED") === "true";

    if (llmStructuringEnabled) {
      try {
        const CHUNK_SIZE = 8000;
        const chunks: Array<Array<{ pageNumber: number; content: string }>> = [];
        let currentChunk: Array<{ pageNumber: number; content: string }> = [];
        let currentSize = 0;

        for (const page of cleanupResult.pages) {
          if (currentSize + page.content.length > CHUNK_SIZE && currentChunk.length > 0) {
            chunks.push(currentChunk);
            currentChunk = [];
            currentSize = 0;
          }
          currentChunk.push(page);
          currentSize += page.content.length;
        }
        if (currentChunk.length > 0) chunks.push(currentChunk);

        const structuredChunks: string[] = [];
        for (const chunk of chunks) {
          const text = chunk.map((p) => `--- Page ${p.pageNumber} ---\n${p.content}`).join("\n\n");
          const { text: structured } = await callGemini(
            genAI, supabase, "pdf_extract",
            [{ role: "user", parts: [{ text: `${LLM_STRUCTURING_PROMPT}\n\n<raw_text>\n${text}\n</raw_text>\n\nRestructure the above text into clean, well-formatted plain text:` }] }],
            { documentId, userId, effort: "low" },
          );
          structuredChunks.push(structured);
        }
        cleanedData = structuredChunks.join("\n\n");
      } catch (error) {
        console.warn("LLM structuring failed, using local cleanup:", error);
        cleanedData = cleanupResult.pages
          .map((p) => `--- Page ${p.pageNumber} ---\n\n${p.content}`)
          .join("\n\n");
      }
    } else {
      cleanedData = cleanupResult.pages
        .map((p) => `--- Page ${p.pageNumber} ---\n\n${p.content}`)
        .join("\n\n");
    }

    // Classify pages
    const { pageMetadata, uncertainPages } = classifyAllPages(pages, totalPages);

    // AI classification for uncertain pages
    let aiClassificationsUsed = 0;
    if (uncertainPages.length > 0) {
      aiClassificationsUsed = await runAIClassification(
        genAI, supabase, uncertainPages, pageMetadata, documentId, userId,
      );
    }

    // Apply filtering
    const filterResult = applyFiltering(pages, pageMetadata);
    const finalResult = handleEdgeCases(filterResult, pages, pageMetadata, totalPages);

    // Calculate stats
    const keptPages = finalResult.pageMetadata.filter((m) => !m.filtered).length;
    const filteredPages = finalResult.pageMetadata.filter((m) => m.filtered).length;

    // Validate
    if (keptPages === 0) {
      throw new Error("All pages were filtered out. Document may only contain non-content pages.");
    }

    if (!finalResult.filteredText || finalResult.filteredText.length < 100) {
      throw new Error("Insufficient content extracted after filtering");
    }

    // === Stage: analyzing ===
    await updateDocumentStatus(supabase, documentId, {
      status: "processing",
      processing_stage: "analyzing",
    });

    // Extract topics
    const topicPrompt = `${TOPIC_EXTRACTION_PROMPT}${finalResult.filteredText.slice(0, 15000)}\n</document>`;
    let topics: string[];
    try {
      const { text: topicsText } = await callGemini(
        genAI, supabase, "topic_extract",
        [{ role: "user", parts: [{ text: topicPrompt }] }],
        { documentId, userId, responseMimeType: "application/json", effort: "low" },
      );

      const parsed = JSON.parse(
        (topicsText || "[]").replace(/```json\n?|\n?```/g, "").trim(),
      );
      topics = Array.isArray(parsed) && parsed.length > 0 ? parsed : ["General"];
    } catch {
      topics = ["General"];
    }

    // === Stage: finalizing ===
    await updateDocumentStatus(supabase, documentId, {
      status: "processing",
      processing_stage: "finalizing",
    });

    // Write results to DB
    await updateDocumentStatus(supabase, documentId, {
      status: "ready",
      processing_stage: null,
      extracted_text: finalResult.filteredText,
      cleaned_data: cleanedData,
      topics,
      page_count: keptPages,
      original_page_count: totalPages,
      filtered_page_count: keptPages,
      page_metadata: finalResult.pageMetadata,
      processing_completed_at: new Date().toISOString(),
    });

    // Batch coordination
    if (batchId) {
      await supabase.rpc("increment_batch_completed", { p_batch_id: batchId });
    }

    return new Response(
      JSON.stringify({
        success: true,
        stats: { totalPages, keptPages, filteredPages, aiClassificationsUsed },
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Document processing failed:", errorMessage);

    // Determine which stage failed
    const { data: currentDoc } = await supabase
      .from("documents")
      .select("processing_stage")
      .eq("id", documentId)
      .single();

    await updateDocumentStatus(supabase, documentId, {
      status: "failed",
      error_message: errorMessage,
      error_stage: currentDoc?.processing_stage || "extracting",
    });

    // Batch coordination on failure
    if (batchId) {
      await supabase.rpc("increment_batch_failed", { p_batch_id: batchId });
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
