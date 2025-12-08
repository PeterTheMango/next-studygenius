
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Question, QuizMode, QuizSettings } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// System Prompts
const SYSTEM_PROMPT = `You are an expert educational content creator.
CRITICAL RULES:
1. Generate questions ONLY from the provided document content.
2. Do NOT use external knowledge.
3. Every question MUST be answerable from the text.
4. Return pure JSON.
5. FOCUS STRICTLY on the educational subject matter, concepts, and theories taught in the document.
6. DO NOT generate questions about course administration (e.g., grading policies, syllabus details, exam schedules, instructor names).`;

const MODE_INSTRUCTIONS = {
  learn: `LEARN MODE: Focus on foundational concepts. Provide helpful hints. Explanations should teach. Difficulty: 50% easy, 35% medium, 15% hard.`,
  revision: `REVISION MODE: Active recall. No hints provided in output (or leave empty). Focus on key facts. Difficulty: 30% easy, 45% medium, 25% hard.`,
  test: `TEST MODE: Simulate exam. No hints. Application/Analysis questions. Difficulty: 20% easy, 50% medium, 30% hard.`
};

// Define the response schema strictly
const questionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, enum: ['multiple_choice', 'true_false', 'short_answer', 'fill_blank', 'matching', 'ordering'] },
          topic: { type: Type.STRING },
          difficulty: { type: Type.STRING, enum: ['easy', 'medium', 'hard'] },
          questionText: { type: Type.STRING },
          options: { type: Type.ARRAY, items: { type: Type.STRING } },
          correctAnswer: { type: Type.STRING },
          explanation: { type: Type.STRING },
          hint: { type: Type.STRING },
          sourceReference: { type: Type.STRING },
          timeEstimate: { type: Type.INTEGER },
          matchingPairs: { 
            type: Type.ARRAY, 
            items: { 
              type: Type.OBJECT, 
              properties: { left: {type: Type.STRING}, right: {type: Type.STRING} } 
            } 
          },
          orderingItems: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ['type', 'topic', 'difficulty', 'questionText', 'explanation']
      }
    }
  }
};

export const GeminiService = {
  /**
   * Generates a quiz from a base64 encoded PDF.
   */
  async generateQuiz(
    base64Pdf: string,
    mode: QuizMode,
    settings: QuizSettings
  ): Promise<Question[]> {
    
    // Clean base64 string if it contains metadata
    const cleanBase64 = base64Pdf.includes('base64,') 
      ? base64Pdf.split('base64,')[1] 
      : base64Pdf;

    const prompt = `
      ${SYSTEM_PROMPT}
      ${MODE_INSTRUCTIONS[mode]}
      
      Generate exactly ${settings.questionCount} questions.
      Allowed Types: ${settings.questionTypes.join(', ')}.
      Overall Difficulty: ${settings.difficulty}.
      
      INSTRUCTIONS PER TYPE:
      - 'multiple_choice': Provide exactly 4 options. 'correctAnswer' is the string of the correct option.
      - 'true_false': options are ["True", "False"]. 'correctAnswer' is "True" or "False".
      - 'fill_blank': Include "___" in 'questionText'. 'correctAnswer' is the missing word(s).
      - 'short_answer': 'correctAnswer' is the model answer.
      - 'matching': Provide 3-5 pairs in 'matchingPairs'. 'questionText' should be "Match the following...". Ignore 'options' and 'correctAnswer' fields.
      - 'ordering': Provide 3-5 items in 'orderingItems' in the CORRECT chronological or logical order. 'questionText' should be "Arrange the following...". Ignore 'options' and 'correctAnswer' fields.
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: 'application/pdf',
                data: cleanBase64
              }
            },
            {
              text: prompt
            }
          ]
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: questionSchema,
          temperature: 0.3,
        }
      });

      const text = response.text;
      if (!text) throw new Error("No response from AI");

      const data = JSON.parse(text);
      
      // Post-process to ensure IDs and defaults
      const questions: Question[] = data.questions.map((q: any, idx: number) => ({
        ...q,
        id: `q-${Date.now()}-${idx}`,
        timeEstimate: q.timeEstimate || 30,
        options: q.type === 'true_false' ? ['True', 'False'] : q.options,
        // Ensure arrays are initialized for new types
        matchingPairs: q.matchingPairs || [],
        orderingItems: q.orderingItems || []
      }));

      return questions;

    } catch (error) {
      console.error("Gemini Quiz Generation Error:", error);
      throw error;
    }
  },

  /**
   * Evaluates a short answer question using AI
   */
  async evaluateShortAnswer(questionText: string, userAnswer: string, modelAnswer: string): Promise<{ isCorrect: boolean; feedback: string }> {
    const prompt = `
      I am a teacher grading a student's answer.
      Question: "${questionText}"
      Model/Correct Answer: "${modelAnswer}"
      Student Answer: "${userAnswer}"
      
      Task: Determine if the Student Answer is conceptually correct based on the Model Answer. Ignore minor spelling or grammar mistakes.
      Return JSON: { "isCorrect": boolean, "feedback": "Brief explanation (1 sentence) of why it is correct or incorrect" }
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: prompt }] },
        config: { 
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isCorrect: { type: Type.BOOLEAN },
              feedback: { type: Type.STRING }
            }
          }
        }
      });
      
      const text = response.text;
      if (!text) return { isCorrect: false, feedback: "Could not evaluate." };
      return JSON.parse(text);
    } catch (e) {
      console.error("Evaluation failed", e);
      return { isCorrect: false, feedback: "Error during evaluation." };
    }
  },

  /**
   * Extracts topics for document preview
   */
  async extractTopics(base64Pdf: string): Promise<string[]> {
    const cleanBase64 = base64Pdf.includes('base64,') 
      ? base64Pdf.split('base64,')[1] 
      : base64Pdf;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
            { inlineData: { mimeType: 'application/pdf', data: cleanBase64 } },
            { text: "List up to 5 main educational topics covered in this document as a JSON list of strings. Ignore administrative details like syllabus or grading." }
          ]
        },
        config: {
          responseMimeType: 'application/json',
        }
      });

      const text = response.text;
      if (!text) return ["General Document"];
      return JSON.parse(text);
    } catch (e) {
      console.error("Topic extraction failed", e);
      return ["Document Analysis"];
    }
  }
};
