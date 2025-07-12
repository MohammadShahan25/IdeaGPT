export enum GameState {
  Welcome,
  Playing,
  Submitting,
  Fusing,
  FusionResult,
  Evaluating,
  Results,
  Review,
  Error,
}

export type EvaluationCategoryName = 
  | '🧠 Critical Thinking'
  | '🎯 Reasoning & Logic'
  | '🎭 Interpretation'
  | '🧃 Creativity & Humor'
  | '💗 Emotional Intelligence';

export interface EvaluationCategory {
  category: EvaluationCategoryName;
  userScore: number;
  aiScore: number;
  winner: 'YOU' | 'IdeaGPT' | 'TIE';
}

export interface EvaluationResult {
  scorecard: EvaluationCategory[];
  verdict: string;
}
