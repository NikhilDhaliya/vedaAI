import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

export const QuestionSchema = z.object({
  text: z.string(),
  type: z.enum(["mcq", "short", "long", "numerical", "diagram"]),
  options: z.array(z.string()).optional(),
  answer: z.string().default(""),
  difficulty: z.preprocess((val) => {
    if (typeof val === "string") {
      const lower = val.toLowerCase();
      if (lower === "medium") return "moderate";
      return lower;
    }
    return val;
  }, z.enum(["easy", "moderate", "hard"])),
  marks: z.number().positive(),
});

export const SectionSchema = z.object({
  title: z.string(),
  instruction: z.string(),
  questions: z.array(QuestionSchema),
});

export const ExamPaperSchema = z.object({
  sections: z.array(SectionSchema),
});

export type ExamPaperInput = {
  title: string;
  dueDate: Date;
  questionTypes: string[];
  numberOfQuestions: number;
  totalMarks: number;
  instructions?: string;
  sourceText?: string;
};

export type ExamPaperOutput = z.infer<typeof ExamPaperSchema>;

function buildGenerationPrompt(input: ExamPaperInput): string {
  const typesText = input.questionTypes.join(", ");
  const instructionsText = input.instructions ? `\nAdditional instructions from teacher: "${input.instructions}"` : "";
  const sourceContext = input.sourceText 
    ? `\n\nReference Material:\n"""\n${input.sourceText}\n"""`
    : "\n\nNo reference material. Generate creative questions.";

  return `You are a professional academic assessor creating a structured exam paper.
Generate an exam paper based on the following specifications:
- Title / Topic: "${input.title}"
- Total Questions count required: ${input.numberOfQuestions}
- Total Marks required across all questions: ${input.totalMarks}
- Permitted Question Types: [${typesText}] (from: mcq, short, long, numerical, diagram)${instructionsText}${sourceContext}

Guidelines:
1. Divide questions logically into sections (e.g. "Section A", "Section B").
2. Total marks sum must equal EXACTLY ${input.totalMarks}.
3. Total question count must equal EXACTLY ${input.numberOfQuestions}.
4. Provide tags for type, difficulty, and marks for each question.
5. MCQ types must have options array of exactly 4 choices and a correct answer letter (e.g. "A", "B", "C", or "D").
6. EVERY question MUST have an "answer" field. This is mandatory for ALL types:
   - mcq: the correct option letter (e.g. "B")
   - short: a concise model answer (1-2 sentences)
   - long: a detailed model answer (3-5 sentences)
   - numerical: the correct numerical value with units (e.g. "42 m/s")
   - diagram: a text description of the expected diagram/answer

Return ONLY a valid JSON object matching the following structure:
{
  "sections": [
    {
      "title": "Section Title",
      "instruction": "Section specific instructions",
      "questions": [
        {
          "text": "Question content...",
          "type": "mcq",
          "options": ["A", "B", "C", "D"],
          "answer": "B",
          "difficulty": "easy",
          "marks": 5
        },
        {
          "text": "Explain the concept of...",
          "type": "short",
          "answer": "The concept refers to...",
          "difficulty": "moderate",
          "marks": 3
        }
      ]
    }
  ]
}

Do not wrap in \`\`\`json. Return pure JSON string.`;
}

export async function generateExamPaper(input: ExamPaperInput): Promise<ExamPaperOutput> {
  const prompt = buildGenerationPrompt(input);
  let rawJson = "";

  if (process.env.GEMINI_API_KEY) {
    try {
      console.log("[AIService] Generating with Gemini");
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        generationConfig: { responseMimeType: "application/json" }
      });

      const response = await model.generateContent(prompt);
      const text = response.response.text();
      if (text) rawJson = text.trim();
    } catch (err: any) {
      console.error("[AIService] Gemini failed:", err.message);
    }
  }

  if (!rawJson) {
    if (process.env.OPENAI_API_KEY) {
      try {
        console.log("[AIService] Gemini failed/skipped. Running OpenAI fallback.");
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: "You are an exam coordinator. Output structured JSON." },
            { role: "user", content: prompt }
          ],
        });
        const text = response.choices[0]?.message?.content;
        if (text) rawJson = text.trim();
      } catch (err: any) {
        console.error("[AIService] OpenAI fallback failed:", err.message);
        throw new Error("Both AI providers failed to generate.");
      }
    } else {
      throw new Error("AI Generation failed. No keys configured.");
    }
  }

  if (rawJson.startsWith("```")) {
    rawJson = rawJson.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
  }

  try {
    const parsedData = JSON.parse(rawJson);
    return ExamPaperSchema.parse(parsedData);
  } catch (err: any) {
    console.error("[AIService] Zod validation failed:", err.message);
    throw new Error(`AI generated invalid format: ${err.message}`);
  }
}
