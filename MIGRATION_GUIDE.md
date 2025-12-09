# PDF Page Filtering Migration Guide

## Overview
This migration adds page-by-page filtering to the document processing pipeline. Cover pages, table of contents, objectives, quiz questions, and other non-content pages are now automatically filtered out before questions are generated.

## Database Migration Required

### Run the Migration
You need to run the Supabase migration to add the new columns to the `documents` table:

```bash
# If using Supabase CLI:
supabase db push

# Or manually execute the SQL file:
# supabase/migrations/20251209_add_page_filtering_fields.sql
```

### New Database Fields
The migration adds these columns to the `documents` table:
- `page_metadata` (JSONB) - Array of page classification information
- `filtered_page_count` (INTEGER) - Number of pages after filtering
- `original_page_count` (INTEGER) - Total pages in the original PDF

## Changes to Existing Functionality

### Document Processing (`/api/documents/process`)
**Before:** Extracted full PDF text in one pass
**After:** Extracts page-by-page, classifies each page, filters unwanted pages

**New Response Format:**
```json
{
  "success": true,
  "topics": ["Topic 1", "Topic 2"],
  "textLength": 15234,
  "filteringStats": {
    "totalPages": 25,
    "keptPages": 18,
    "filteredPages": 7,
    "byType": {
      "content": 18,
      "cover": 1,
      "toc": 2,
      "objectives": 1,
      "quiz": 3,
      "blank": 0
    }
  }
}
```

### Question Generation
- Now works with filtered content (no changes to API)
- Questions will only be generated from actual content pages
- No contamination from ToC, quiz questions, or cover pages

## How It Works

### 1. Page Extraction
- PDF is sent to Gemini with instructions to mark page boundaries
- Response is parsed into individual pages with page numbers

### 2. Heuristic Classification (Fast)
Each page is analyzed using keyword patterns:
- **Cover pages**: "syllabus", "professor", "course" + short length
- **Table of Contents**: "table of contents", high density of page numbers
- **Quiz pages**: "quiz", "test" + numbered questions + MC options
- **Objectives**: "learning objectives" + action verbs
- **Outline**: "outline", "agenda" + hierarchical numbering
- **Review**: "summary", "what we learned"
- **Blank**: < 50 characters

### 3. AI Classification (Fallback)
For pages with confidence < 0.8:
- Batches up to 10 pages per API call
- Uses `gemini-2.0-flash-exp` for cost efficiency
- Provides classification + confidence + reasoning

### 4. Filtering
Pages classified as cover, toc, outline, objectives, review, quiz, or blank are filtered out.

### 5. Edge Case Handling
- **All pages filtered**: Keeps top 50% by character count
- **Short documents** (< 5 pages): Looser filtering thresholds
- **Hybrid pages**: Objectives pages with substantial content are kept

## Cost Impact

**Before:** ~2 Gemini API calls per document
**After:** ~2.3 calls per document (15% increase)

**Breakdown:**
- 1 call for page extraction
- ~0.3 calls for AI classification (batched, only for uncertain pages)
- 1 call for topic extraction

**Optimization:**
- 70-90% of pages classified using heuristics (no AI cost)
- AI classification batched (up to 10 pages per call)
- Fast model used (`gemini-2.0-flash-exp`)

## Testing

### Manual Testing
1. Upload a PDF with cover page + ToC + content
2. Check document processing response for `filteringStats`
3. Verify filtered text doesn't contain ToC content
4. Generate quiz and verify questions are high quality

### Check Page Metadata
Query the database to see classification details:
```sql
SELECT
  file_name,
  original_page_count,
  filtered_page_count,
  page_metadata
FROM documents
WHERE id = 'your-document-id';
```

### Common Test Cases
- Standard textbook chapter (20+ pages)
- Lecture slides with cover + objectives
- Course syllabus (mostly ToC/outline)
- Document with quiz questions
- Very short document (2-3 pages)

## Monitoring

### Logs
Look for these log entries during processing:
```
[Filter Pipeline] Extracting pages from PDF...
[Filter Pipeline] Extracted N pages
[Filter Pipeline] Classifying pages...
[Filter Pipeline] Using AI to classify X uncertain pages...
[Filter Pipeline] Applying filtering rules...
[Filter Pipeline] Filtering complete: {...}
```

### Warnings to Watch
- `All pages filtered! Keeping top 50% by content...` - Document might be all non-content
- `Short document with only 1 page kept. Loosening filters...` - Very short doc, might need manual review

## Rollback Plan

If you need to revert to the old behavior:

1. **Restore the old process route:**
```typescript
// In src/app/api/documents/process/route.ts
// Replace filterPDFPages() with the old extraction code
const extractionResponse = await genAI.models.generateContent({
  model: GEMINI_MODEL,
  contents: [
    { inlineData: { mimeType: "application/pdf", data: base64 } },
    { text: "Extract all text content from this PDF document..." }
  ],
});
const extractedText = extractionResponse.text;
```

2. **Database:** New columns are optional - old code will work with them present

3. **Remove imports:** Remove `import { filterPDFPages } from "@/lib/pdf/filter-pipeline";`

## Support

If you encounter issues:
1. Check the console logs for `[Filter Pipeline]` entries
2. Query `page_metadata` in database to see classification details
3. Verify the migration was applied successfully
4. Test with a simple PDF first (few pages, clear structure)
# Change Title: Fix New Quiz button text wrapping
## Description of the change
The 'New Quiz' button text in the quizzes page was wrapping onto two lines when the screen size was small. This change adds the 'whitespace-nowrap' Tailwind CSS class to the button to prevent the text from wrapping.
Code Changes (Only things that we're replaced):
Before Code Change
```
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 hover:scale-[1.02] transition-all"
```
After Code Change
```
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 hover:scale-[1.02] transition-all whitespace-nowrap"
```