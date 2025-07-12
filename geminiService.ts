import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { EvaluationResult, EvaluationCategoryName } from "./types";
import { TOTAL_ROUNDS } from "./constants";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getAiResponse(prompt: string): Promise<string> {
  try {
    const systemInstruction = `System Persona: You are an AI opponent in a creativity game. Your goal is to provide a very simple, literal, and basic answer to the user's challenge. Avoid all cleverness, humor, or deep thinking. Be straightforward and uninspired to give the human player a fair chance. IMPORTANT: Your entire response MUST be three lines of text or less.`;
    
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-04-17',
      contents: `Challenge: "${prompt}"`,
      config: {
        systemInstruction: systemInstruction,
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return response.text;
  } catch (error) {
    console.error("Error getting AI response:", error);
    return "The AI is speechless. It seems your brilliance broke it.";
  }
}

export async function getFusedIdea(
  userAnswers: string[],
  aiAnswers: string[]
): Promise<string> {
  const formattedUserAnswers = userAnswers.map((answer, index) => `${index + 1}. ${answer || '(No answer provided)'}`).join('\n');
  const formattedAiAnswers = aiAnswers.map((answer, index) => `${index + 1}. ${answer}`).join('\n');

  const prompt = `
System Persona: You are the 'Merger Maestro,' a brilliant business consultant AI. Your specialty is taking two competing business plans and fusing them into a single, superior, and often wildly creative new venture.

Your Task:
You have been given 10 answers from a Human and 10 answers from an AI. Each set of answers builds a complete business concept, following a specific sequence of questions (name, slogan, core idea, etc.).
Analyze both sets of answers. Identify the strongest, most creative, and most interesting parts of each. Then, synthesize them into ONE new, cohesive business plan.

--- The Human's Plan ---
${formattedUserAnswers}

--- The AI's Plan ---
${formattedAiAnswers}

Your Output:
Create a final, fused business pitch. It MUST have the following structure:

### [New Fused Company Name]
**Slogan:** [New Fused Slogan]

**The Big Idea:**
[A compelling paragraph describing the new, merged concept. Combine the core features, target audiences, and unique advantages from both original plans.]

**Business Brief:**
[A short summary covering the merged business model and the memorable 'wild card' feature.]

**Final Pitch:**
[A single, powerful sentence that encapsulates the entire fused idea.]

Do not include any other explanatory text. Just the final, fused business plan in the format above.
`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-04-17',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error getting fused idea:", error);
    return "### Fusion Catastrophe\nThe Merger Maestro short-circuited. The two business plans were so incompatible they created a paradox. Please try again with less reality-bending concepts.";
  }
}


export async function evaluateAnswers(
  challenges: string[],
  userAnswers: string[],
  aiAnswers: string[]
): Promise<EvaluationResult> {
  const formattedRounds = challenges
    .map((challenge, index) => {
      return `
--- ROUND ${index + 1} ---
Challenge: "${challenge}"
Human's Answer: "${userAnswers[index] || '(No answer provided)'}"
IdeaGPT's Answer: "${aiAnswers[index]}"
`;
    })
    .join('');

  const evaluationCriteria: EvaluationCategoryName[] = [
    '🧠 Critical Thinking',
    '🎯 Reasoning & Logic',
    '🎭 Interpretation',
    '🧃 Creativity & Humor',
    '💗 Emotional Intelligence'
  ];

  const prompt = `
System Instruction: You are an expert judge in innovation, cognitive science, and business strategy. Your task is to impartially evaluate two sets of answers to a series of ${TOTAL_ROUNDS} creative challenges. One set is from a Human, the other from an IdeaGPT AI.

Evaluation Criteria:
For each of the ${TOTAL_ROUNDS} rounds, you must score both the Human and the AI from 0.0 to 10.0 on the following five dimensions:
${evaluationCriteria.join('\n')}

Input Data:
Here are the ${TOTAL_ROUNDS} challenges and the corresponding answers from the Human and the IdeaGPT AI.
${formattedRounds}

Output Format:
You MUST provide your response as a single, valid JSON object. Do not include any text, explanations, or markdown fences (like \`\`\`json) before or after the JSON object. The JSON object must conform to the following TypeScript interface:

interface EvaluationCategory {
  category: '🧠 Critical Thinking' | '🎯 Reasoning & Logic' | '🎭 Interpretation' | '🧃 Creativity & Humor' | '💗 Emotional Intelligence';
  userScore: number;
  aiScore: number;
  winner: 'YOU' | 'IdeaGPT' | 'TIE';
}

interface EvaluationResult {
  scorecard: EvaluationCategory[];
  verdict: string;
}

Instructions for JSON content:
- The 'scorecard' array must contain exactly 5 objects, one for each evaluation category listed above. The order must be preserved.
- For each category in the scorecard, calculate the AVERAGE score for the Human across all ${TOTAL_ROUNDS} rounds, and the AVERAGE score for the AI across all ${TOTAL_ROUNDS} rounds. Round to one decimal place.
- The 'winner' for each category should be 'YOU' if the user's average score is higher, 'IdeaGPT' if the AI's is higher, and 'TIE' if they are equal.
- The 'verdict' should be a short, punchy, and final conclusion about the overall performance, declaring a definitive winner with some flavor text. Example: "You're a certified Innovation Madlad. IdeaGPT's still buffering from the burn."
`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-04-17",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    let jsonStr = response.text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }
    
    const parsedData = JSON.parse(jsonStr) as EvaluationResult;

    // Data validation
    if (!parsedData.scorecard || !parsedData.verdict || parsedData.scorecard.length !== 5) {
      throw new Error("Invalid JSON structure from API.");
    }
    
    return parsedData;

  } catch (error) {
    console.error("Failed to parse or receive evaluation:", error);
    throw new Error("The judges are deliberating... rather slowly. There might have been an error.");
  }
}
