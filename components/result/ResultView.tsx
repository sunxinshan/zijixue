"use client";

import Link from "next/link";
import { useMemo } from "react";

import { ForestBackdrop } from "@/components/shared/ForestBackdrop";
import { ProgressBar } from "@/components/shared/ProgressBar";
import { getCorrectRate } from "@/lib/game";
import { getMasteryMeta } from "@/lib/mastery";
import { useAppStorage } from "@/lib/use-app-storage";
import type {
  ContentSection,
  KnowledgeMastery,
  KnowledgePoint,
  Question,
} from "@/types/content";

export function ResultView({
  challengeId,
  section,
  knowledgePoints,
  questions,
}: {
  challengeId: string;
  section: ContentSection;
  knowledgePoints: KnowledgePoint[];
  questions: Question[];
}) {
  const storage = useAppStorage();

  const view = useMemo(() => {
    const challenge = storage.challenges.find(
      (item) => item.id === challengeId,
    );
    if (!challenge) {
      return {
        challenge: null,
        wrongQuestions: [] as Question[],
        mastery: {} as Record<string, KnowledgeMastery>,
        masteryAverage: 0,
      };
    }

    const challengeAttempts = storage.attempts.filter(
      (attempt) =>
        challenge.questionIds.includes(attempt.questionId) &&
        attempt.createdAt >= challenge.startedAt &&
        (!challenge.completedAt || attempt.createdAt <= challenge.completedAt),
    );
    const wrongQuestionIds = Array.from(
      new Set(
        challengeAttempts
          .filter((attempt) => !attempt.isCorrect)
          .map((attempt) => attempt.questionId),
      ),
    );

    return {
      challenge,
      wrongQuestions: wrongQuestionIds
        .map((questionId) => questions.find((question) => question.id === questionId))
        .filter((question): question is Question => Boolean(question)),
      mastery: storage.mastery,
      masteryAverage: Math.round(
        knowledgePoints.reduce(
          (sum, point) => sum + (storage.mastery[point.id]?.mastery ?? 0),
          0,
        ) / Math.max(1, knowledgePoints.length),
      ),
    };
  }, [challengeId, knowledgePoints, questions, storage]);

  if (!view.challenge) {
    return (
      <ForestBackdrop compact>
        <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center rounded-[2rem] bg-white/90 p-8 text-center shadow-sm">
          <span className="text-5xl">🍃</span>
          <h1 className="mt-4 text-2xl font-black text-[#173f2a]">
            没有找到这次挑战
          </h1>
          <p className="mt-2 text-sm font-semibold text-[#74887b]">
            学习记录可能已被清除，可以重新开始一轮。
          </p>
          <Link
            href={`/game/${section.id}`}
            className="mt-6 rounded-2xl bg-[#2d995b] px-6 py-4 font-black text-white"
          >
            重新挑战
          </Link>
        </div>
      </ForestBackdrop>
    );
  }

  const challenge = view.challenge;
  const accuracy = getCorrectRate(
    challenge.correctAnswers,
    challenge.totalQuestions,
  );

  return (
    <ForestBackdrop compact>
      <main className="mx-auto max-w-3xl pb-8">
        <section className="relative overflow-hidden rounded-[2.25rem] bg-gradient-to-br from-[#21734a] to-[#58b96c] p-6 text-center text-white shadow-[0_24px_60px_rgba(34,111,65,0.25)] sm:p-8">
          <div aria-hidden="true" className="absolute left-5 top-5 text-3xl opacity-30">
            🍃
          </div>
          <div aria-hidden="true" className="absolute right-5 top-10 text-4xl opacity-30">
            🦋
          </div>
          <p className="text-sm font-black tracking-wide text-white/80">
            挑战完成
          </p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">
            🎉 森林探险成功！
          </h1>
          <div className="mt-5 text-4xl tracking-[0.2em]" aria-label={`${challenge.stars} 颗星`}>
            {"⭐".repeat(challenge.stars)}
          </div>
          <div className="mx-auto mt-6 grid max-w-xl grid-cols-3 gap-3">
            <div className="rounded-2xl bg-white/15 p-3">
              <p className="text-2xl font-black">{accuracy}%</p>
              <p className="text-xs font-bold text-white/75">正确率</p>
            </div>
            <div className="rounded-2xl bg-white/15 p-3">
              <p className="text-2xl font-black">+{challenge.earnedXp}</p>
              <p className="text-xs font-bold text-white/75">XP</p>
            </div>
            <div className="rounded-2xl bg-white/15 p-3">
              <p className="text-2xl font-black">
                {challenge.correctAnswers}/{challenge.totalQuestions}
              </p>
              <p className="text-xs font-bold text-white/75">答对题数</p>
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-[2rem] bg-white/92 p-5 shadow-sm ring-1 ring-white sm:p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-[#173f2a]">知识掌握度</h2>
              <p className="text-sm font-semibold text-[#74887b]">
                本机平均掌握度 {view.masteryAverage}%
              </p>
            </div>
            <span className="text-2xl">🌳</span>
          </div>
          <div className="mt-5 space-y-4">
            {knowledgePoints.map((point) => {
              const mastery = view.mastery[point.id]?.mastery ?? 0;
              const meta = getMasteryMeta(mastery);
              return (
                <div key={point.id}>
                  <div className="mb-1 flex items-center justify-between text-sm font-black text-[#315341]">
                    <span>
                      {meta.icon} {point.title}
                    </span>
                    <span>{mastery}%</span>
                  </div>
                  <ProgressBar value={mastery} />
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-5 rounded-[2rem] bg-white/92 p-5 shadow-sm ring-1 ring-white sm:p-6">
          <h2 className="text-xl font-black text-[#173f2a]">
            {view.wrongQuestions.length > 0 ? "本次需要复习" : "全部答对啦"}
          </h2>
          {view.wrongQuestions.length > 0 ? (
            <div className="mt-4 space-y-3">
              {view.wrongQuestions.map((question) => (
                <div
                  key={question.id}
                  className="rounded-2xl bg-[#fff8ed] p-4 ring-1 ring-[#f4dfb9]"
                >
                  <p className="text-sm font-black text-[#765221]">
                    {question.prompt}
                  </p>
                  <p className="mt-1 text-sm font-bold text-[#2f754d]">
                    正确答案：{Array.isArray(question.answer) ? question.answer.join(" / ") : question.answer}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 rounded-2xl bg-[#effbf0] p-4 text-sm font-bold text-[#277146]">
              这一轮没有错题，知识树叶又长大了一圈。
            </p>
          )}
        </section>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Link
            href={`/game/${section.id}`}
            className="flex min-h-14 items-center justify-center rounded-2xl bg-gradient-to-r from-[#2d995b] to-[#58bd6d] px-6 font-black text-white shadow-lg transition hover:-translate-y-0.5"
          >
            再练一次
          </Link>
          <Link
            href="/"
            className="flex min-h-14 items-center justify-center rounded-2xl bg-white px-6 font-black text-[#315341] shadow-sm ring-1 ring-[#e1ebdd] transition hover:-translate-y-0.5"
          >
            返回英语森林
          </Link>
        </div>
      </main>
    </ForestBackdrop>
  );
}
