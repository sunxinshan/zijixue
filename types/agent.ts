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

export interface TeachingExample {
  sentence: string;
  translation?: string;
  analysis?: string;
}

export type TeachingMode = "comic" | "text";
export type ComicStatus = "draft" | "reviewed" | "published";

export interface ComicDialogue {
  characterId: string;
  characterName: string;
  text: string;
  translation?: string;
  emotion?: string;
}

export interface ComicPanel {
  id: string;
  order: number;
  imageUrl: string;
  purpose: string;
  sceneDescription: string;
  narration?: string;
  dialogue: ComicDialogue[];
  focusText?: string[];
  teacherNote?: string;
  altText: string;
}

export interface ComicLesson {
  id: string;
  status: ComicStatus;
  panels: ComicPanel[];
  styleId?: string;
  altText: string;
}

export type UnderstandingCheckType =
  | "choice"
  | "true_false"
  | "fill_blank";

export interface UnderstandingCheckQuestion {
  id: string;
  type: UnderstandingCheckType;
  prompt: string;
  options?: string[];
  answer: string | boolean;
  explanation: string;
}

export interface TeachingContent {
  concept: string;
  why?: string;
  rule?: string;
  structure?: string;
  examples: TeachingExample[];
  usage?: string[];
  contrasts?: string[];
  commonMistakes?: string[];
  guidedExamples?: string[];
  practiceHints?: string[];
  comic?: ComicLesson;
  understandingCheck?: UnderstandingCheckQuestion[];
}

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
  teachingContent: TeachingContent;
  explanations?: string[];
  notes?: string[];
  examples: PatternExample[];
}

export interface Subtopic {
  id: string;
  knowledgeId: string;
  name: string;
  learningGoal: string;
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


export interface QuestionPool {
  id: string;
  knowledgeId: string;
  subtopicId: string;
  patternId: string;
  questions: Question[];
  version: number;
  status: "active" | "invalid";
  createdAt: string;
  updatedAt: string;
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
  previousPatternProgress?: Record<string, PatternProgress>;
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

export interface LessonProgress {
  knowledgeId: string;
  subtopicId: string;
  completed: boolean;
  completedAt?: number;
}

export interface AppStorage {
  version: 2;
  userId: string;
  learningStates: LearningState[];
  sessions: LearningSession[];
  attempts: Attempt[];
  questions: Question[];
  lessonProgress: Record<string, LessonProgress>;
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
