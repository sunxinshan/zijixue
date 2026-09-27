"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { AnswerButton } from "@/components/game/AnswerButton";
import { ForestBackdrop } from "@/components/shared/ForestBackdrop";
import { ProgressBar } from "@/components/shared/ProgressBar";
import { createBatchPerformance } from "@/lib/agent/analysis";
import {
  AgentRequestError,
  completeAgentBatch,
  startAgentSession,
} from "@/lib/agent/client";
import {
  createLocalId,
  createTimestamp,
  evaluateQuestionAnswer,
  XP_PER_CORRECT,
} from "@/lib/game";
import {
  completeSession,
  getSubtopicLearningState,
  getSubtopicLearningStates,
  loadAgentStorage,
  recordAttempt,
  saveQuestions,
  upsertSession,
} from "@/lib/storage";
import { useAppStorage } from "@/lib/use-app-storage";
import type {
  Attempt,
  BatchPerformance,
  Knowledge,
  LearningSession,
  LearningState,
  QuestionBatch,
  SessionMode,
  Subtopic,
  TeachingStrategy,
} from "@/types/agent";

type GameStatus =
  | "loading"
  | "question"
  | "analyzing"
  | "continue-ready"
  | "error";

interface FeedbackState {
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation: string;
  xpEarned: number;
}

const questionTypeLabels = {
  choice: "选择题",
  "true-false": "判断题",
} as const;

function formatAnswer(answer: string | boolean): string {
  if (typeof answer === "boolean") return answer ? "正确" : "错误";
  return answer;
}

export function GameView({
  knowledge,
  mode,
  subtopic,
}: {
  knowledge: Knowledge;
  mode: SessionMode;
  subtopic?: Subtopic;
}) {
  const router = useRouter();
  const storageState = useAppStorage();
  const initialized = useRef(false);
  const [status, setStatus] = useState<GameStatus>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [provider, setProvider] = useState("");
  const [session, setSession] = useState<LearningSession | null>(null);
  const [learningState, setLearningState] = useState<LearningState | null>(null);
  const [currentBatch, setCurrentBatch] = useState<QuestionBatch | null>(null);
  const [nextBatch, setNextBatch] = useState<QuestionBatch | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [batchNumber, setBatchNumber] = useState(1);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [strategies, setStrategies] = useState<TeachingStrategy[]>([]);
  const [pastBatches, setPastBatches] = useState<BatchPerformance[]>([]);
  const [previousQuestions, setPreviousQuestions] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    async function initialize() {
      try {
        const storage = loadAgentStorage();
        const currentLearningState =
          mode === "subtopic" && subtopic
            ? getSubtopicLearningState(storage, knowledge.id, subtopic.id)
            : undefined;
        const response = await startAgentSession({
          userId: storage.userId,
          knowledge,
          mode,
          subtopicId: subtopic?.id,
          learningState: currentLearningState,
          subtopicStates: getSubtopicLearningStates(storage, knowledge.id),
        });

        upsertSession(response.session);
        saveQuestions(response.batch.questions);
        setProvider(response.provider);
        setSession(response.session);
        setLearningState(response.learningState);
        setStrategies([response.strategy]);
        setCurrentBatch(response.batch);
        setPreviousQuestions(
          response.batch.questions.map((question) => question.question),
        );
        setStatus("question");
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Agent 初始化失败",
        );
        setErrorStatus(error instanceof AgentRequestError ? error.status : null);
        setStatus("error");
      }
    }

    void initialize();
  }, [knowledge, mode, subtopic]);

  const currentQuestion = currentBatch?.questions[currentIndex];

  const handleAnswer = (answer: string | boolean) => {
    if (!session || !currentQuestion || !currentBatch || feedback) return;

    const correct = evaluateQuestionAnswer(currentQuestion, answer);
    const attempt: Attempt = {
      id: createLocalId("attempt"),
      sessionId: session.id,
      knowledgeId: knowledge.id,
      subtopicId: currentQuestion.knowledgeSubtopic,
      patternId: currentQuestion.patternId,
      coverageItemId: currentQuestion.coverageItemId,
      questionId: currentQuestion.id,
      answer,
      correct,
      timestamp: createTimestamp(),
    };

    recordAttempt(attempt);
    setAttempts((current) => [...current, attempt]);
    setFeedback({
      selectedAnswer: formatAnswer(answer),
      correctAnswer: formatAnswer(currentQuestion.answer),
      isCorrect: correct,
      explanation: currentQuestion.explanation,
      xpEarned: correct ? XP_PER_CORRECT : 0,
    });
  };

  const finishBatch = async () => {
    if (
      !session ||
      !learningState ||
      !currentBatch ||
      attempts.length === 0
    ) {
      return;
    }

    setStatus("analyzing");
    setFeedback(null);

    try {
      const batchQuestionIds = new Set(
        currentBatch.questions.map((question) => question.id),
      );
      const batchAttempts = attempts.filter((attempt) =>
        batchQuestionIds.has(attempt.questionId),
      );
      const currentPerformance = createBatchPerformance(
        batchNumber,
        batchAttempts,
        currentBatch.questions,
      );
      const response = await completeAgentBatch({
        userId: session.userId,
        knowledge,
        mode,
        subtopicId: subtopic?.id,
        learningState,
        sessionId: session.id,
        attempts: batchAttempts,
        currentBatch,
        batchNumber,
        pastBatches,
        strategies,
        previousQuestions,
      });

      setLearningState(response.learningState);
      const nextStrategies = [...strategies, response.strategy];
      setStrategies(nextStrategies);
      setPastBatches((current) => [...current, currentPerformance]);
      setPreviousQuestions((current) => [
        ...current,
        ...currentBatch.questions.map((question) => question.question),
      ]);

      if (response.strategy.action !== "finish") {
        if (!response.batch) throw new Error("Agent 未返回下一批题目");
        saveQuestions(response.batch.questions);
        setNextBatch(response.batch);
        setBatchNumber((current) => current + 1);
        setStatus("continue-ready");
        return;
      }

      if (!response.sessionSummary) {
        throw new Error("Agent 未返回 SessionSummary");
      }

      completeSession(
        session.id,
        response.sessionSummary,
        response.learningState,
      );
      router.push(`/result/${encodeURIComponent(session.id)}`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Agent 分析失败",
      );
      setStatus("error");
    }
  };

  const handleNext = () => {
    if (!currentBatch || !feedback) return;
    if (currentIndex < currentBatch.questions.length - 1) {
      setCurrentIndex((current) => current + 1);
      setFeedback(null);
      return;
    }
    void finishBatch();
  };

  const startNextBatch = () => {
    if (!nextBatch) return;
    setCurrentBatch(nextBatch);
    setNextBatch(null);
    setCurrentIndex(0);
    setFeedback(null);
    setStatus("question");
  };

  const answerState = (answer: string | boolean) => {
    if (!feedback || !currentQuestion) return "idle" as const;
    if (answer === currentQuestion.answer) return "correct" as const;
    if (formatAnswer(answer) === feedback.selectedAnswer) return "wrong" as const;
    return "idle" as const;
  };

  if (status === "loading") {
    return (
      <ForestBackdrop compact>
        <div className="flex min-h-[70vh] flex-col items-center justify-center rounded-[2rem] bg-white/85 p-8 text-center shadow-sm">
          <span className="animate-bounce text-4xl">🤖</span>
          <p className="mt-3 font-black text-[#315341]">
            Agent 正在准备本批题目…
          </p>
        </div>
      </ForestBackdrop>
    );
  }

  if (status === "error" && mode === "challenge" && errorStatus === 403) {
    const subtopicStates = getSubtopicLearningStates(storageState, knowledge.id);
    return (
      <ForestBackdrop compact>
        <div className="mx-auto max-w-2xl rounded-[2rem] bg-white/92 p-6 shadow-sm sm:p-8">
          <div className="text-center">
            <span className="text-5xl">🔒</span>
            <h1 className="mt-4 text-2xl font-black text-[#173f2a]">
              Challenge 尚未解锁
            </h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#74887b]">
              完成全部 Subtopic，并完成 required Pattern Coverage 后即可挑战。
            </p>
          </div>
          <div className="mt-6 space-y-3">
            {knowledge.subtopics.map((subtopic) => {
              const state = subtopicStates.find(
                (item) => item.subtopicId === subtopic.id,
              );
              const covered = subtopic.patterns.filter(
                (pattern) =>
                  !pattern.required ||
                  state?.patternProgress[pattern.id]?.coverageComplete,
              ).length;
              return (
                <div
                  key={subtopic.id}
                  className="flex items-center justify-between gap-4 rounded-2xl bg-[#f8fbf5] p-4"
                >
                  <div>
                    <p className="font-black text-[#315341]">{subtopic.name}</p>
                    <p className="mt-1 text-xs font-semibold text-[#74887b]">
                      Coverage {covered}/{subtopic.patterns.length}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${
                      state?.completed
                        ? "bg-[#e6f7e9] text-[#17693c]"
                        : "bg-[#fff3c9] text-[#8a5a00]"
                    }`}
                  >
                    {state?.completed ? "已完成" : "未完成"}
                  </span>
                </div>
              );
            })}
          </div>
          <Link
            href={`/knowledge/${knowledge.id}`}
            className="mt-6 flex min-h-14 items-center justify-center rounded-2xl bg-[#2d995b] px-6 font-black text-white"
          >
            返回 Subtopic 列表
          </Link>
        </div>
      </ForestBackdrop>
    );
  }

  if (status === "error") {
    return (
      <ForestBackdrop compact>
        <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center rounded-[2rem] bg-white/90 p-8 text-center shadow-sm">
          <span className="text-5xl">🍂</span>
          <h1 className="mt-4 text-2xl font-black text-[#173f2a]">
            Agent 暂时没有准备好
          </h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-[#74887b]">
            {errorMessage}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 rounded-2xl bg-[#2d995b] px-6 py-4 font-black text-white"
          >
            重新加载
          </button>
        </div>
      </ForestBackdrop>
    );
  }

  if (status === "analyzing") {
    return (
      <ForestBackdrop compact>
        <div className="flex min-h-[70vh] flex-col items-center justify-center rounded-[2rem] bg-white/85 p-8 text-center shadow-sm">
          <span className="animate-bounce text-4xl">🌿</span>
          <p className="mt-3 font-black text-[#315341]">
            Agent 正在分析当前批次…
          </p>
          <p className="mt-2 text-sm font-semibold text-[#74887b]">
            程序已经完成本地判分，正在生成下一步教学建议。
          </p>
        </div>
      </ForestBackdrop>
    );
  }

  if (status === "continue-ready") {
    const latestStrategy = strategies.at(-1);
    const focusTitles =
      latestStrategy
        ?.focus.map(
          (id) =>
            knowledge.subtopics
              .flatMap((item) => item.patterns)
              .find((pattern) => pattern.id === id)?.name,
        )
        .filter((title): title is string => Boolean(title)) ?? [];

    return (
      <ForestBackdrop compact>
        <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center rounded-[2rem] bg-white/92 p-8 text-center shadow-[0_20px_55px_rgba(47,108,66,0.14)]">
          <span className="text-5xl">🧭</span>
          <p className="mt-3 text-sm font-black tracking-wide text-[#2c8a56]">
            第 {batchNumber - 1} 批完成
          </p>
          <h1 className="mt-2 text-2xl font-black text-[#173f2a]">
            Agent 建议继续练习
          </h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-[#60786a]">
            {latestStrategy?.reason}
          </p>
          {latestStrategy?.explanation ? (
            <p className="mt-4 rounded-2xl bg-[#effbf0] px-4 py-3 text-sm font-semibold leading-6 text-[#277146]">
              {latestStrategy.explanation}
            </p>
          ) : null}
          {latestStrategy?.examples?.length ? (
            <div className="mt-3 w-full rounded-2xl bg-[#f8fbf5] p-4 text-left">
              <p className="text-xs font-black text-[#60786a]">示例</p>
              <ul className="mt-2 space-y-1 text-sm font-bold text-[#315341]">
                {latestStrategy.examples.map((example) => (
                  <li key={example}>• {example}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {focusTitles.length > 0 ? (
            <p className="mt-4 rounded-2xl bg-[#fff5d4] px-4 py-3 text-sm font-black text-[#8a5a00]">
              下一批重点：{focusTitles.join("、")}
            </p>
          ) : null}
          <button
            type="button"
            onClick={startNextBatch}
            className="mt-6 min-h-14 w-full rounded-2xl bg-gradient-to-r from-[#2d995b] to-[#58bd6d] px-6 font-black text-white shadow-lg"
          >
            开始下一批题目
          </button>
        </div>
      </ForestBackdrop>
    );
  }

  if (!session || !currentQuestion || !currentBatch) {
    return null;
  }

  const overallCorrect = attempts.filter((attempt) => attempt.correct).length;

  return (
    <ForestBackdrop compact>
      <header className="flex items-center justify-between gap-3">
        <Link
          href={`/knowledge/${knowledge.id}`}
          className="inline-flex min-h-11 items-center rounded-2xl bg-white/85 px-4 text-sm font-black text-[#315341] shadow-sm"
        >
          ← 规则
        </Link>
        <div className="flex items-center gap-2 rounded-2xl bg-white/85 px-4 py-2 shadow-sm">
          <span className="font-black text-[#315341]">
            第 {batchNumber} 批 · {currentIndex + 1}/{currentBatch.questions.length}
          </span>
          <span className="text-[#d9a417]">⭐</span>
          <span className="font-black text-[#b27b00]">
            {overallCorrect * XP_PER_CORRECT}
          </span>
        </div>
      </header>

      <main className="mx-auto mt-5 max-w-2xl">
        <div className="mb-2 flex justify-between text-xs font-black text-[#60786a]">
          <span>{provider === "mock" ? "演示教学引擎" : "AI 教学引擎"}</span>
          <span>程序本地判分</span>
        </div>
        <ProgressBar
          value={currentIndex + (feedback ? 1 : 0)}
          max={currentBatch.questions.length}
          tone="yellow"
        />

        {strategies.at(-1)?.explanation && (strategies.at(-1)?.strategyLevel ?? 1) >= 3 ? (
          <section className="mt-4 rounded-[1.5rem] bg-[#effbf0] p-4 ring-1 ring-[#b9e5c1]">
            <p className="text-xs font-black tracking-wide text-[#2c8a56]">
              本轮教学策略
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#315341]">
              {strategies.at(-1)?.explanation}
            </p>
            {strategies.at(-1)?.examples?.length ? (
              <p className="mt-2 text-sm font-bold text-[#277146]">
                {strategies.at(-1)?.examples?.join("　")}
              </p>
            ) : null}
          </section>
        ) : null}

        <section className="mt-5 rounded-[2rem] bg-white/95 p-5 shadow-[0_20px_55px_rgba(47,108,66,0.14)] ring-1 ring-white sm:p-7">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#eaf7e7] px-3 py-1 text-xs font-black text-[#2a7849]">
              {questionTypeLabels[currentQuestion.type]}
            </span>
            <span className="rounded-full bg-[#fff5d4] px-3 py-1 text-xs font-black text-[#8a5a00]">
              {
                knowledge.subtopics
                  .flatMap((item) => item.patterns)
                  .find((pattern) => pattern.id === currentQuestion.patternId)
                  ?.name
              }
            </span>
            <span className="rounded-full bg-[#eef3fb] px-3 py-1 text-xs font-black text-[#496887]">
              难度 {currentQuestion.difficulty}
            </span>
          </div>

          <h1 className="mt-5 text-2xl font-black leading-relaxed text-[#173f2a] sm:text-3xl">
            {currentQuestion.question}
          </h1>

          <div className="mt-6 space-y-3">
            {currentQuestion.type === "choice"
              ? (currentQuestion.options ?? []).map((option) => (
                  <AnswerButton
                    key={option}
                    onClick={() => handleAnswer(option)}
                    disabled={Boolean(feedback)}
                    state={answerState(option)}
                  >
                    {option}
                  </AnswerButton>
                ))
              : [
                  <AnswerButton
                    key="true"
                    onClick={() => handleAnswer(true)}
                    disabled={Boolean(feedback)}
                    state={answerState(true)}
                  >
                    ✅ 正确
                  </AnswerButton>,
                  <AnswerButton
                    key="false"
                    onClick={() => handleAnswer(false)}
                    disabled={Boolean(feedback)}
                    state={answerState(false)}
                  >
                    ❌ 错误
                  </AnswerButton>,
                ]}
          </div>
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
                <p className="mt-2 text-sm font-semibold leading-6 text-[#60786a]">
                  {feedback.explanation}
                </p>
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
              {currentIndex === currentBatch.questions.length - 1
                ? "完成本批并交给 Agent"
                : "下一题"}
              <span className="ml-2" aria-hidden="true">
                →
              </span>
            </button>
          </section>
        ) : (
          <p className="mt-4 text-center text-xs font-bold text-[#74887b]">
            选择答案后立即由程序判分
          </p>
        )}
      </main>
    </ForestBackdrop>
  );
}
