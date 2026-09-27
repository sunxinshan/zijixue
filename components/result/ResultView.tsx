"use client";

import Link from "next/link";
import { useMemo } from "react";

import { ForestBackdrop } from "@/components/shared/ForestBackdrop";
import { ProgressBar } from "@/components/shared/ProgressBar";
import {
  calculateStars,
  getAttemptStats,
  getSessionAttempts,
  getSessionXp,
  getSubtopicStats,
} from "@/lib/game";
import { getMasteryMeta } from "@/lib/mastery";
import { useAppStorage } from "@/lib/use-app-storage";
import type { Knowledge } from "@/types/agent";

export function ResultView({
  sessionId,
  knowledge,
}: {
  sessionId: string;
  knowledge: Knowledge;
}) {
  const storage = useAppStorage();

  const view = useMemo(() => {
    const session = storage.sessions.find((item) => item.id === sessionId);
    if (!session || !session.sessionSummary) {
      return {
        session: null,
        attempts: [],
        stats: null,
        subtopicStats: [],
        wrongQuestions: [],
        xp: 0,
      };
    }

    const attempts = getSessionAttempts(storage, sessionId);
    const stats = getAttemptStats(attempts);
    const questionById = new Map(
      storage.questions.map((question) => [question.id, question]),
    );
    const wrongQuestions = Array.from(
      new Set(
        attempts
          .filter((attempt) => !attempt.correct)
          .map((attempt) => attempt.questionId),
      ),
    )
      .map((questionId) => questionById.get(questionId))
      .filter((question) => Boolean(question));

    const recommendedSubtopics =
      session.mode === "challenge"
        ? Array.from(
            new Map(
              session.sessionSummary.recommendedFocus
                .map((patternId) =>
                  knowledge.subtopics.find((subtopic) =>
                    subtopic.patterns.some((pattern) => pattern.id === patternId),
                  ),
                )
                .filter((subtopic) => Boolean(subtopic))
                .map((subtopic) => [subtopic!.id, subtopic!]),
            ).values(),
          )
        : [];

    return {
      session,
      attempts,
      stats,
      subtopicStats: getSubtopicStats(storage, knowledge),
      wrongQuestions,
      recommendedSubtopics,
      xp: getSessionXp(storage, sessionId),
    };
  }, [knowledge, sessionId, storage]);

  if (!view.session || !view.stats || !view.session.sessionSummary) {
    return (
      <ForestBackdrop compact>
        <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center rounded-[2rem] bg-white/90 p-8 text-center shadow-sm">
          <span className="text-5xl">🍃</span>
          <h1 className="mt-4 text-2xl font-black text-[#173f2a]">
            没有找到这个 Session
          </h1>
          <p className="mt-2 text-sm font-semibold text-[#74887b]">
            学习记录可能已被清除，可以重新开始超级大脑教学。
          </p>
          <Link
            href={`/game/${knowledge.id}`}
            className="mt-6 rounded-2xl bg-[#2d995b] px-6 py-4 font-black text-white"
          >
            重新开始
          </Link>
        </div>
      </ForestBackdrop>
    );
  }

  const summary = view.session.sessionSummary;
  const masteryMeta = getMasteryMeta(summary.mastery);
  const stars = calculateStars(view.stats.correct, view.stats.total);
  const focusTitles = summary.recommendedFocus
    .map(
      (id) =>
        knowledge.subtopics
          .flatMap((subtopic) => subtopic.patterns)
          .find((pattern) => pattern.id === id)?.name,
    )
    .filter((title): title is string => Boolean(title));

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
            超级大脑 Session 完成
          </p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">
            🎉 森林探险成功！
          </h1>
          <div className="mt-5 text-4xl tracking-[0.2em]" aria-label={`${stars} 颗星`}>
            {"⭐".repeat(stars)}
          </div>
          <div className="mx-auto mt-6 grid max-w-xl grid-cols-3 gap-3">
            <div className="rounded-2xl bg-white/15 p-3">
              <p className="text-2xl font-black">{view.stats.accuracy}%</p>
              <p className="text-xs font-bold text-white/75">正确率</p>
            </div>
            <div className="rounded-2xl bg-white/15 p-3">
              <p className="text-2xl font-black">+{view.xp}</p>
              <p className="text-xs font-bold text-white/75">XP</p>
            </div>
            <div className="rounded-2xl bg-white/15 p-3">
              <p className="text-2xl font-black">
                {view.stats.correct}/{view.stats.total}
              </p>
              <p className="text-xs font-bold text-white/75">答对题数</p>
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-[2rem] bg-white/92 p-5 shadow-sm ring-1 ring-white sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-black text-[#74887b]">
                超级大脑综合判断
              </p>
              <h2 className="mt-1 text-2xl font-black text-[#173f2a]">
                {masteryMeta.icon} 掌握度 {summary.mastery}%
              </h2>
            </div>
            <span className="text-3xl">🌳</span>
          </div>
          <div className="mt-4">
            <ProgressBar value={summary.mastery} />
          </div>
          <p className="mt-4 text-sm font-semibold leading-7 text-[#60786a]">
            {summary.summary}
          </p>
        </section>

        <section className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[1.75rem] bg-white/92 p-5 shadow-sm ring-1 ring-white">
            <h2 className="font-black text-[#277146]">已经掌握</h2>
            {summary.strengths.length > 0 ? (
              <ul className="mt-3 space-y-2 text-sm font-bold text-[#4f7a5e]">
                {summary.strengths.map((strength) => (
                  <li key={strength}>🌿 {strength}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm font-semibold text-[#74887b]">
                超级大脑还没有发现稳定的强项。
              </p>
            )}
          </div>
          <div className="rounded-[1.75rem] bg-white/92 p-5 shadow-sm ring-1 ring-white">
            <h2 className="font-black text-[#a16a16]">下一步重点</h2>
            {focusTitles.length > 0 ? (
              <ul className="mt-3 space-y-2 text-sm font-bold text-[#8a5a00]">
                {focusTitles.map((title) => (
                  <li key={title}>🌱 {title}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm font-semibold text-[#74887b]">
                暂时没有额外的重点建议。
              </p>
            )}
          </div>
        </section>

        <section className="mt-5 rounded-[2rem] bg-white/92 p-5 shadow-sm ring-1 ring-white sm:p-6">
          <h2 className="text-xl font-black text-[#173f2a]">Subtopic 表现</h2>
          <div className="mt-5 space-y-4">
            {view.subtopicStats.map((stat) => (
              <div key={stat.subtopicId}>
                <div className="mb-1 flex items-center justify-between text-sm font-black text-[#315341]">
                  <span>{stat.title}</span>
                  <span>{stat.total > 0 ? `${stat.accuracy}%` : "未练习"}</span>
                </div>
                <ProgressBar value={stat.accuracy} />
              </div>
            ))}
          </div>
        </section>

        {view.session.mode === "challenge" && view.recommendedSubtopics.length > 0 ? (
          <section className="mt-5 rounded-[2rem] bg-white/92 p-5 shadow-sm ring-1 ring-white sm:p-6">
            <h2 className="text-xl font-black text-[#173f2a]">建议先复习 Subtopic</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {view.recommendedSubtopics.map((subtopic) => (
                <Link
                  key={subtopic.id}
                  href={`/game/${knowledge.id}/${subtopic.id}`}
                  className="rounded-2xl bg-[#fff5d4] p-4 font-black text-[#8a5a00] ring-1 ring-[#f2dc92]"
                >
                  {subtopic.name} →
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-5 rounded-[2rem] bg-white/92 p-5 shadow-sm ring-1 ring-white sm:p-6">
          <h2 className="text-xl font-black text-[#173f2a]">
            {view.wrongQuestions.length > 0 ? "本次需要复习" : "本 Session 全部答对"}
          </h2>
          {view.wrongQuestions.length > 0 ? (
            <div className="mt-4 space-y-3">
              {view.wrongQuestions.map((question) => (
                <div
                  key={question?.id}
                  className="rounded-2xl bg-[#fff8ed] p-4 ring-1 ring-[#f4dfb9]"
                >
                  <p className="text-sm font-black text-[#765221]">
                    {question?.question}
                  </p>
                  <p className="mt-1 text-sm font-bold text-[#2f754d]">
                    正确答案：
                    {typeof question?.answer === "boolean"
                      ? question.answer
                        ? "正确"
                        : "错误"
                      : question?.answer}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 rounded-2xl bg-[#effbf0] p-4 text-sm font-bold text-[#277146]">
              超级大脑记录的 Attempt 全部正确。
            </p>
          )}
        </section>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Link
            href={`/game/${knowledge.id}`}
            className="flex min-h-14 items-center justify-center rounded-2xl bg-gradient-to-r from-[#2d995b] to-[#58bd6d] px-6 font-black text-white shadow-lg transition hover:-translate-y-0.5"
          >
            开始新 Session
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
