export type QuestionType = "choice" | "true-false";
export type Difficulty = 1 | 2 | 3 | 4 | 5;
export type StrategyLevel = 1 | 2 | 3 | 4 | 5;
export type SessionStatus = "active" | "completed";

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

export interface KnowledgeExample {
  id: string;
  base: string;
  comparative: string;
  superlative: string;
}

export interface KnowledgeSubtopic {
  id: string;
  title: string;
  description: string;
}

export interface KnowledgeRule {
  id: string;
  subtopicId: string;
  title: string;
  explanation: string;
  examples: KnowledgeExample[];
}

export interface Knowledge {
  id: string;
  title: string;
  description: string;
  subtopics: KnowledgeSubtopic[];
  rules: KnowledgeRule[];
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
  difficulty: Difficulty;
}

export interface QuestionBatch {
  questions: Question[];
}

export interface Attempt {
  id: string;
  sessionId: string;
  knowledgeId: string;
  questionId: string;
  answer: string | boolean;
  correct: boolean;
  timestamp: number;
}

export interface QuestionDistributionItem {
  subtopic: string;
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

export interface SubtopicPerformance {
  subtopic: string;
  correct: number;
  total: number;
  accuracy: number;
}

export interface BatchPerformance {
  batchNumber: number;
  total: number;
  correct: number;
  accuracy: number;
  subtopicStats: SubtopicPerformance[];
}

export interface BatchObservation {
  batchNumber: number;
  currentBatch: BatchPerformance;
  pastBatches: BatchPerformance[];
  previousStrategies: TeachingStrategy[];
  consecutiveSubtopicErrors: Record<string, number>;
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
  mastery: number;
  strengths: string[];
  weaknesses: string[];
  currentDifficulty: Difficulty;
  recommendedFocus: string[];
  strategyLevel: StrategyLevel;
  summary: string;
  updatedAt: number;
}

export interface LearningSession {
  id: string;
  userId: string;
  knowledgeId: string;
  startedAt: number;
  endedAt?: number;
  status: SessionStatus;
  sessionSummary?: SessionSummary;
}

export interface SessionState {
  sessionId: string;
  userId: string;
  knowledgeId: string;
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

export interface LearningAnalysisContext {
  task: "analyze_learning_state";
  knowledge: Knowledge;
  learningState: LearningState;
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
