export type QuestionType = "choice" | "true-false";
export type Difficulty = 1 | 2 | 3 | 4 | 5;
export type StrategyLevel = 1 | 2 | 3 | 4 | 5;
export type SessionStatus = "active" | "completed";
export type LearningScope = "subtopic" | "knowledge";
export type SessionMode = "subtopic" | "challenge";

export type Diagnosis =
  | "accidental"
  | "subtopic_weakness"
  | "rule_misunderstanding"
  | "multiple_weaknesses"
  | "persistent_failure"
  | "improving"
  | "mastered";

export type StrategyAction =
  | "continue"
  | "targeted_practice"
  | "explain"
  | "simplify"
  | "change_strategy"
  | "increase_difficulty"
  | "mixed_review"
  | "finish";

export interface PatternExample {
  id: string;
  text: string;
  base?: string;
  comparative?: string;
  superlative?: string;
  coverageItemId?: string;
}

export interface Pattern {
  id: string;
  knowledgeId: string;
  subtopicId: string;
  name: string;
  description: string;
  required: boolean;
  minimumQuestions: number;
  coverageItems?: string[];
  examples: PatternExample[];
}

export interface Subtopic {
  id: string;
  knowledgeId: string;
  name: string;
  description: string;
  minimumQuestions: number;
  targetAccuracy: number;
  patterns: Pattern[];
}

export interface Knowledge {
  id: string;
  title: string;
  description: string;
  subtopics: Subtopic[];
}

export interface Question {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[];
  answer: string | boolean;
  explanation: string;
  knowledgeId: string;
  knowledgeSubtopic: string;
  patternId: string;
  coverageItemId?: string;
  difficulty: Difficulty;
}

export interface QuestionBatch {
  questions: Question[];
}

export interface Attempt {
  id: string;
  sessionId: string;
  knowledgeId: string;
  subtopicId?: string;
  patternId?: string;
  coverageItemId?: string;
  questionId: string;
  answer: string | boolean;
  correct: boolean;
  timestamp: number;
}

export interface PatternProgress {
  patternId: string;
  attemptedQuestions: number;
  correctQuestions: number;
  coveredItems: string[];
  coverageComplete: boolean;
}

export interface QuestionDistributionItem {
  patternId: string;
  count: number;
}

export interface TeachingStrategy {
  diagnosis: Diagnosis;
  strategyLevel: StrategyLevel;
  action: StrategyAction;
  focus: string[];
  difficulty: Difficulty;
  questionDistribution: QuestionDistributionItem[];
  explanation?: string;
  examples?: string[];
  reason: string;
}

export interface PatternPerformance {
  patternId: string;
  correct: number;
  total: number;
  accuracy: number;
}

export interface BatchPerformance {
  batchNumber: number;
  total: number;
  correct: number;
  accuracy: number;
  patternStats: PatternPerformance[];
}

export interface BatchObservation {
  batchNumber: number;
  currentBatch: BatchPerformance;
  pastBatches: BatchPerformance[];
  previousStrategies: TeachingStrategy[];
  patternProgress: Record<string, PatternProgress>;
  consecutivePatternErrors: Record<string, number>;
}

export interface SessionSummary {
  mastery: number;
  strengths: string[];
  weaknesses: string[];
  recommendedFocus: string[];
  summary: string;
}

export interface LearningState {
  userId: string;
  knowledgeId: string;
  scope: LearningScope;
  subtopicId?: string;
  mastery: number;
  strengths: string[];
  weaknesses: string[];
  currentDifficulty: Difficulty;
  recommendedFocus: string[];
  strategyLevel: StrategyLevel;
  patternProgress: Record<string, PatternProgress>;
  completed: boolean;
  summary: string;
  updatedAt: number;
}

export interface LearningSession {
  id: string;
  userId: string;
  knowledgeId: string;
  mode: SessionMode;
  subtopicId?: string;
  startedAt: number;
  endedAt?: number;
  status: SessionStatus;
  sessionSummary?: SessionSummary;
}

export interface SessionState {
  sessionId: string;
  userId: string;
  knowledgeId: string;
  mode: SessionMode;
  subtopicId?: string;
  learningState: LearningState;
  attempts: Attempt[];
  currentBatch?: QuestionBatch;
  currentQuestionIndex?: number;
  lastAnswer?: string | boolean;
  isCorrect?: boolean;
  strategies: TeachingStrategy[];
  sessionSummary?: SessionSummary;
}

export interface AppStorage {
  version: 2;
  userId: string;
  learningStates: LearningState[];
  sessions: LearningSession[];
  attempts: Attempt[];
  questions: Question[];
  legacyXp?: number;
  legacyStars?: number;
}

export interface StrategyGenerationContext {
  task: "generate_teaching_strategy";
  knowledge: Knowledge;
  learningState: LearningState;
  observation: BatchObservation;
}

export interface BatchGenerationContext {
  task: "generate_question_batch";
  knowledge: Knowledge;
  learningState: LearningState;
  strategy: TeachingStrategy;
  batchNumber: number;
  previousQuestions: string[];
}

export interface SessionSummaryContext {
  task: "summarize_session";
  knowledge: Knowledge;
  learningState: LearningState;
  attempts: Attempt[];
  questions: Question[];
  strategies: TeachingStrategy[];
}
