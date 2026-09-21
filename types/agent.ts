export type QuestionType = "choice" | "true-false";
export type Difficulty = 1 | 2 | 3 | 4 | 5;
export type AgentAction = "continue" | "finish";
export type SessionStatus = "active" | "completed";

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

export interface AgentDecision {
  action: AgentAction;
  focus: string[];
  difficulty: Difficulty;
  reason: string;
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
  decisions: AgentDecision[];
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

export interface BatchGenerationContext {
  task: "generate_batch";
  knowledge: Knowledge;
  learningState: LearningState;
  focus: string[];
  difficulty: Difficulty;
  batchNumber: number;
  previousQuestions: string[];
}

export interface BatchAnalysisContext {
  task: "analyze_batch";
  knowledge: Knowledge;
  learningState: LearningState;
  attempts: Attempt[];
  questions: Question[];
  batchNumber: number;
}

export interface SessionSummaryContext {
  task: "summarize_session";
  knowledge: Knowledge;
  learningState: LearningState;
  attempts: Attempt[];
  questions: Question[];
  decisions: AgentDecision[];
}
