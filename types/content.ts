export type SourceType = "book" | "worksheet" | "photo" | "custom";
export type KnowledgeCategory =
  | "grammar"
  | "vocabulary"
  | "sentence-pattern"
  | "reading";

export type QuestionType =
  | "choice"
  | "fill-blank"
  | "sentence-translation"
  | "ordering"
  | "listening";

export interface SourceDocument {
  id: string;
  title: string;
  sourceType: SourceType;
  subject: "english";
  grade?: string;
  version?: string;
  pages?: number[];
  sections: ContentSection[];
}

export interface ContentSection {
  id: string;
  sourceDocumentId: string;
  title: string;
  order: number;
  knowledgePointIds: string[];
  questionIds: string[];
}

export interface KnowledgePoint {
  id: string;
  sectionId: string;
  title: string;
  category: KnowledgeCategory;
  summary: string;
  rules?: Rule[];
  examples?: Example[];
  relatedKnowledgePointIds?: string[];
}

export interface Rule {
  id: string;
  knowledgePointId: string;
  title: string;
  explanation: string;
  examples: Example[];
}

export interface Example {
  id: string;
  base?: string;
  comparative?: string;
  superlative?: string;
  english?: string;
  chinese?: string;
  audioUrl?: string;
}

export interface Question {
  id: string;
  knowledgePointIds: string[];
  type: QuestionType;
  prompt: string;
  options?: string[];
  answer: string | string[];
  explanation?: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  sourceQuestionId?: string;
  tags?: string[];
}

export interface Attempt {
  id: string;
  questionId: string;
  knowledgePointIds: string[];
  answer: string | string[];
  isCorrect: boolean;
  responseTimeMs?: number;
  createdAt: string;
}

export interface KnowledgeMastery {
  knowledgePointId: string;
  mastery: number;
  correctCount: number;
  wrongCount: number;
  streak: number;
  lastPracticedAt?: string;
  lastCorrectAt?: string;
}

export interface PlayerProfile {
  id: string;
  nickname?: string;
  level: number;
  xp: number;
  totalStars: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChallengeRecord {
  id: string;
  knowledgePointIds: string[];
  questionIds: string[];
  totalQuestions: number;
  correctAnswers: number;
  earnedXp: number;
  stars: 1 | 2 | 3;
  startedAt: string;
  completedAt?: string;
}

export interface AppStorage {
  player: PlayerProfile;
  mastery: Record<string, KnowledgeMastery>;
  attempts: Attempt[];
  challenges: ChallengeRecord[];
}

export interface GameSession {
  challengeId: string;
  questionIds: string[];
  currentIndex: number;
  answers: Record<string, string | string[]>;
  results: Record<string, boolean>;
  isSubmitted: boolean;
  isFinished: boolean;
  correctCount: number;
  earnedXp: number;
}
