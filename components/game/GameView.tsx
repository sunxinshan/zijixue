"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { AnswerButton } from "@/components/game/AnswerButton";
import { ForestBackdrop } from "@/components/shared/ForestBackdrop";
import { ProgressBar } from "@/components/shared/ProgressBar";
import {
  QUESTIONS_PER_CHALLENGE,
  calculateCurrentStreak,
  calculateQuestionXp,
  calculateStars,
  createGameSession,
  formatAnswer,
  isAnswerCorrect,
} from "@/lib/game";
import { selectQuestions } from "@/lib/question-selector";
import {
  buildChallengeRecord,
  completeChallenge,
  loadAppStorage,
} from "@/lib/storage";
import type {
  Attempt,
  ContentSection,
  GameSession,
  KnowledgePoint,
  Question,
} from "@/types/content";

interface FeedbackState {
  isCorrect: boolean;
  selectedAnswer: string;
  correctAnswer: string;
  explanation?: string;
  xpEarned: number;
}

const questionTypeLabels: Record<Question["type"], string> = {
  choice: "选择题",
  "fill-blank": "填空题",
  "sentence-translation": "句子翻译",
  ordering: "排序题",
  listening: "听力题",
};

function createAttemptId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `attempt-${crypto.randomUUID()}`;
  }
  return `attempt-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createChallengeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `challenge-${crypto.randomUUID()}`;
  }
  return `challenge-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function GameView({
  section,
  knowledgePoints,
  questions,
}: {
  section: ContentSection;
  knowledgePoints: KnowledgePoint[];
  questions: Question[];
}) {
  const router = useRouter();
  const initialized = useRef(false);
  const attemptsRef = useRef<Attempt[]>([]);
  const startedAtRef = useRef("");
  const [session, setSession] = useState<GameSession | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  useEffect(() => {
    if (initialized.current || questions.length === 0) return;
    initialized.current = true;

    const storage = loadAppStorage();
    const selectedQuestions = selectQuestions(questions, {
      count: QUESTIONS_PER_CHALLENGE,
      mastery: storage.mastery,
    });
    const challengeId = createChallengeId();
    startedAtRef.current = new Date().toISOString();
    setSession(
      createGameSession(
        challengeId,
        selectedQuestions.map((question) => question.id),
      ),
    );
  }, [questions]);

  const currentQuestion = session
    ? questions.find(
        (question) =>
          question.id === session.questionIds[session.currentIndex],
      )
    : undefined;

  const knowledgePoint =
    currentQuestion && currentQuestion.knowledgePointIds.length > 0
      ? knowledgePoints.find(
          (point) => point.id === currentQuestion.knowledgePointIds[0],
        )
      : undefined;

  const submitAnswer = (answerOverride?: string | string[]) => {
    if (!session || !currentQuestion || feedback) return;

    const answer = answerOverride ?? currentAnswer;
    const hasAnswer = Array.isArray(answer)
      ? answer.some((value) => value.trim().length > 0)
      : answer.trim().length > 0;
    if (!hasAnswer) return;

    const isCorrect = isAnswerCorrect(currentQuestion, answer);
    const nextResults = {
      ...session.results,
      [currentQuestion.id]: isCorrect,
    };
    const streak = calculateCurrentStreak(
      session.questionIds,
      nextResults,
      session.currentIndex,
    );
    const xpEarned = calculateQuestionXp(isCorrect, streak);
    const createdAt = new Date().toISOString();
    attemptsRef.current.push({
      id: createAttemptId(),
      questionId: currentQuestion.id,
      knowledgePointIds: currentQuestion.knowledgePointIds,
      answer,
      isCorrect,
      createdAt,
    });

    setSession({
      ...session,
      answers: {
        ...session.answers,
        [currentQuestion.id]: answer,
      },
      results: nextResults,
      isSubmitted: true,
      correctCount: session.correctCount + (isCorrect ? 1 : 0),
      earnedXp: session.earnedXp + xpEarned,
    });
    setCurrentAnswer(typeof answer === "string" ? answer : answer.join(" / "));
    setFeedback({
      isCorrect,
      selectedAnswer: formatAnswer(answer),
      correctAnswer: formatAnswer(currentQuestion.answer),
      explanation: currentQuestion.explanation,
      xpEarned,
    });
  };

  const finishChallenge = () => {
    if (!session || !currentQuestion) return;

    const completedAt = new Date().toISOString();
    const stars = calculateStars(
      session.correctCount,
      session.questionIds.length,
    );
    const knowledgePointIds = Array.from(
      new Set(
        session.questionIds.flatMap((questionId) => {
          const question = questions.find((item) => item.id === questionId);
          return question?.knowledgePointIds ?? [];
        }),
      ),
    );
    const challenge = buildChallengeRecord({
      id: session.challengeId,
      questionIds: session.questionIds,
      knowledgePointIds,
      correctAnswers: session.correctCount,
      questionXp: session.earnedXp,
      stars,
      startedAt: startedAtRef.current,
      completedAt,
    });

    completeChallenge({
      challenge,
      attempts: attemptsRef.current,
    });
    router.push(`/result/${encodeURIComponent(challenge.id)}`);
  };

  const handleNext = () => {
    if (!session || !feedback) return;

    if (session.currentIndex < session.questionIds.length - 1) {
      setSession({
        ...session,
        currentIndex: session.currentIndex + 1,
        isSubmitted: false,
      });
      setCurrentAnswer("");
      setFeedback(null);
        return;
    }

    finishChallenge();
  };

  if (!session || !currentQuestion) {
    return (
      <ForestBackdrop compact>
        <div className="flex min-h-[70vh] flex-col items-center justify-center rounded-[2rem] bg-white/85 p-8 text-center shadow-sm">
          <span className="animate-bounce text-4xl">🌱</span>
          <p className="mt-3 font-black text-[#315341]">正在准备挑战…</p>
        </div>
      </ForestBackdrop>
    );
  }

  const answerState = (option: string) => {
    if (!feedback) return "idle" as const;
    if (option === currentQuestion.answer) return "correct" as const;
    if (option === feedback.selectedAnswer) return "wrong" as const;
    return "idle" as const;
  };

  return (
    <ForestBackdrop compact>
      <header className="flex items-center justify-between gap-3">
        <Link
          href={`/knowledge/${section.id}`}
          className="inline-flex min-h-11 items-center rounded-2xl bg-white/85 px-4 text-sm font-black text-[#315341] shadow-sm"
        >
          ← 规则
        </Link>
        <div className="flex items-center gap-2 rounded-2xl bg-white/85 px-4 py-2 shadow-sm">
          <span className="font-black text-[#315341]">
            {session.currentIndex + 1} / {session.questionIds.length}
          </span>
          <span className="text-[#d9a417]">⭐</span>
          <span className="font-black text-[#b27b00]">{session.earnedXp}</span>
        </div>
      </header>

      <main className="mx-auto mt-5 max-w-2xl">
        <ProgressBar
          value={session.currentIndex + (feedback ? 1 : 0)}
          max={session.questionIds.length}
          tone="yellow"
        />

        <section className="mt-5 rounded-[2rem] bg-white/95 p-5 shadow-[0_20px_55px_rgba(47,108,66,0.14)] ring-1 ring-white sm:p-7">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#eaf7e7] px-3 py-1 text-xs font-black text-[#2a7849]">
              {questionTypeLabels[currentQuestion.type]}
            </span>
            {knowledgePoint ? (
              <span className="rounded-full bg-[#fff5d4] px-3 py-1 text-xs font-black text-[#8a5a00]">
                {knowledgePoint.title}
              </span>
            ) : null}
          </div>

          <h1 className="mt-5 whitespace-pre-wrap text-2xl font-black leading-relaxed text-[#173f2a] sm:text-3xl">
            {currentQuestion.prompt}
          </h1>

          {currentQuestion.type === "choice" ? (
            <div className="mt-6 space-y-3">
              {(currentQuestion.options ?? []).map((option) => (
                <AnswerButton
                  key={option}
                  onClick={() => submitAnswer(option)}
                  disabled={Boolean(feedback)}
                  state={answerState(option)}
                >
                  {option}
                </AnswerButton>
              ))}
            </div>
          ) : (
            <form
              className="mt-6"
              onSubmit={(event) => {
                event.preventDefault();
                submitAnswer();
              }}
            >
              {currentQuestion.type === "sentence-translation" ? (
                <textarea
                  value={currentAnswer}
                  onChange={(event) => setCurrentAnswer(event.target.value)}
                  disabled={Boolean(feedback)}
                  autoFocus
                  rows={3}
                  placeholder="在这里输入英文句子…"
                  className="w-full resize-none rounded-2xl border-2 border-[#dce8d6] bg-[#fbfdf8] px-4 py-4 text-base font-bold text-[#214d32] outline-none transition placeholder:text-[#9aab9f] focus:border-[#66c979] disabled:opacity-80"
                />
              ) : (
                <input
                  value={currentAnswer}
                  onChange={(event) => setCurrentAnswer(event.target.value)}
                  disabled={Boolean(feedback)}
                  autoFocus
                  autoComplete="off"
                  placeholder="输入英文答案"
                  className="h-14 w-full rounded-2xl border-2 border-[#dce8d6] bg-[#fbfdf8] px-4 text-base font-extrabold text-[#214d32] outline-none transition placeholder:text-[#9aab9f] focus:border-[#66c979] disabled:opacity-80"
                />
              )}
              {!feedback ? (
                <button
                  type="submit"
                  disabled={!currentAnswer.trim()}
                  className="mt-4 min-h-14 w-full rounded-2xl bg-gradient-to-r from-[#2d995b] to-[#58bd6d] px-6 text-base font-black text-white shadow-lg transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  提交答案
                </button>
              ) : null}
            </form>
          )}
        </section>

        {feedback ? (
          <section
            className={`mt-4 rounded-[1.75rem] border-2 p-5 shadow-sm ${
              feedback.isCorrect
                ? "border-[#8fda9b] bg-[#effbf0]"
                : "border-[#f4b1aa] bg-[#fff5f3]"
            }`}
            aria-live="polite"
          >
            <div className="flex items-start gap-3">
              <span className="text-3xl">
                {feedback.isCorrect ? "🎉" : "🌱"}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-lg font-black ${
                    feedback.isCorrect ? "text-[#17693c]" : "text-[#a33d36]"
                  }`}
                >
                  {feedback.isCorrect ? "太棒了！" : "再想一想"}
                </p>
                {!feedback.isCorrect ? (
                  <p className="mt-2 text-sm font-bold text-[#a33d36]">
                    ❌ 你的答案：{feedback.selectedAnswer}
                  </p>
                ) : null}
                <p className="mt-1 text-sm font-bold text-[#315341]">
                  ✅ 正确答案：{feedback.correctAnswer}
                </p>
                {feedback.explanation ? (
                  <p className="mt-2 text-sm font-semibold leading-6 text-[#60786a]">
                    {feedback.explanation}
                  </p>
                ) : null}
                {feedback.xpEarned > 0 ? (
                  <p className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-sm font-black text-[#d28a00]">
                    +{feedback.xpEarned} XP
                  </p>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={handleNext}
              className="mt-5 min-h-14 w-full rounded-2xl bg-[#245f3c] px-6 text-base font-black text-white shadow-lg transition hover:-translate-y-0.5"
            >
              {session.currentIndex === session.questionIds.length - 1
                ? "查看挑战结果"
                : "下一题"}
              <span className="ml-2" aria-hidden="true">
                →
              </span>
            </button>
          </section>
        ) : (
          <p className="mt-4 text-center text-xs font-bold text-[#74887b]">
            {currentQuestion.type === "choice"
              ? "选择答案后会立即反馈"
              : "输入答案后点击提交"}
          </p>
        )}
      </main>
    </ForestBackdrop>
  );
}
