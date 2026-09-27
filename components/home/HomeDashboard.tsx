"use client";

import Link from "next/link";
import { useMemo } from "react";

import { comparativeKnowledge } from "@/data/knowledge/comparative";
import { ForestBackdrop } from "@/components/shared/ForestBackdrop";
import { ProgressBar } from "@/components/shared/ProgressBar";
import {
  calculateStars,
  getLevelProgress,
  getSubtopicStats,
  getTotalXp,
} from "@/lib/game";
import { getMasteryMeta } from "@/lib/mastery";
import { getSubtopicLearningStates } from "@/lib/storage";
import { useAppStorage } from "@/lib/use-app-storage";

export function HomeDashboard() {
  const storage = useAppStorage();

  const view = useMemo(() => {
    const subtopicStates = getSubtopicLearningStates(storage, comparativeKnowledge.id);
    const aggregateMastery =
      subtopicStates.length > 0
        ? Math.round(
            subtopicStates.reduce((sum, state) => sum + state.mastery, 0) /
              subtopicStates.length,
          )
        : 0;
    const stats = getSubtopicStats(storage, comparativeKnowledge);
    const completedSessions = storage.sessions.filter(
      (session) => session.status === "completed",
    );
    const bestStars = Math.max(
      0,
      ...completedSessions.map((session) => {
        const attempts = storage.attempts.filter(
          (attempt) => attempt.sessionId === session.id,
        );
        const correct = attempts.filter((attempt) => attempt.correct).length;
        return calculateStars(correct, attempts.length);
      }),
    );
    const focusTitles = (subtopicStates.flatMap((state) => state.recommendedFocus))
      .map(
        (id) =>
          comparativeKnowledge.subtopics
            .flatMap((subtopic) => subtopic.patterns)
            .find((pattern) => pattern.id === id)?.name,
      )
      .filter((title): title is string => Boolean(title));

    return {
      aggregateMastery,
      subtopicStates,
      stats,
      bestStars,
      focusTitles,
      totalXp: getTotalXp(storage),
      progress: getLevelProgress(getTotalXp(storage)),
      completedSessions: completedSessions.length,
      wrongQuestionCount: new Set(
        storage.attempts
          .filter((attempt) => !attempt.correct)
          .map((attempt) => attempt.questionId),
      ).size,
    };
  }, [storage]);

  const mastery = view.aggregateMastery;
  const masteryMeta = getMasteryMeta(mastery);

  return (
    <ForestBackdrop>
      <header className="flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3" aria-label="英语森林首页">
          <span className="flex h-12 w-12 items-center justify-center rounded-3xl bg-white text-2xl shadow-sm ring-1 ring-white">
            🌳
          </span>
          <div>
            <p className="text-xl font-black tracking-tight text-[#174b30] sm:text-2xl">
              英语森林
            </p>
            <p className="text-xs font-bold text-[#6d8576]">English Forest</p>
          </div>
        </Link>

        <div className="min-w-36 rounded-3xl bg-white/90 px-4 py-3 shadow-sm ring-1 ring-white">
          <div className="mb-1 flex items-center justify-between text-xs font-black text-[#55705f]">
            <span>Lv.{view.progress.level}</span>
            <span>{view.progress.currentXp}/300 XP</span>
          </div>
          <ProgressBar value={view.progress.currentXp} max={300} tone="yellow" />
        </div>
      </header>

      <main className="mt-8 space-y-6">
        <section className="relative overflow-hidden rounded-[2.25rem] bg-gradient-to-br from-[#277d4c] to-[#55b66b] p-6 text-white shadow-[0_24px_60px_rgba(34,111,65,0.25)] sm:p-8">
          <div
            aria-hidden="true"
            className="absolute -right-6 top-6 text-8xl opacity-20"
          >
            🐉
          </div>
          <div className="relative max-w-xl">
            <span className="inline-flex rounded-full bg-white/20 px-3 py-1 text-xs font-black tracking-wide">
              超级大脑教学
            </span>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
              比较级大冒险
            </h1>
            <p className="mt-3 max-w-md text-sm font-semibold leading-6 text-white/85 sm:text-base">
              超级大脑会读取长期学习状态，每题量由超级大脑根据 Pattern Coverage 动态决定。
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3 text-sm font-bold">
              <span className="rounded-2xl bg-white/15 px-3 py-2">
                动态题量 3-20
              </span>
              <span className="rounded-2xl bg-white/15 px-3 py-2">
                {masteryMeta.icon} {masteryMeta.label}
              </span>
              <span className="rounded-2xl bg-white/15 px-3 py-2">
                最佳 {view.bestStars > 0 ? "⭐".repeat(view.bestStars) : "—"}
              </span>
            </div>
            {view.focusTitles.length > 0 ? (
              <p className="mt-4 text-sm font-bold text-white/90">
                当前建议重点：{view.focusTitles.join("、")}
              </p>
            ) : null}
            <Link
              href={`/knowledge/${comparativeKnowledge.id}`}
              className="mt-6 inline-flex min-h-14 items-center justify-center rounded-2xl bg-[#fff3a7] px-7 text-base font-black text-[#2f5c25] shadow-lg transition hover:-translate-y-0.5 hover:bg-[#fff7c8]"
            >
              开始学习
              <span className="ml-2" aria-hidden="true">
                →
              </span>
            </Link>
          </div>
        </section>

        <section className="grid grid-cols-3 gap-3">
          <div className="rounded-3xl bg-white/90 p-4 text-center shadow-sm ring-1 ring-white">
            <p className="text-2xl">{masteryMeta.icon}</p>
            <p className="mt-1 text-xl font-black text-[#205238]">{mastery}%</p>
            <p className="text-xs font-bold text-[#74887b]">超级大脑掌握度</p>
          </div>
          <div className="rounded-3xl bg-white/90 p-4 text-center shadow-sm ring-1 ring-white">
            <p className="text-2xl">⭐</p>
            <p className="mt-1 text-xl font-black text-[#205238]">
              {(storage.legacyStars ?? 0) +
                storage.sessions.filter((session) => session.status === "completed")
                  .length}
            </p>
            <p className="text-xs font-bold text-[#74887b]">累计星星</p>
          </div>
          <div className="rounded-3xl bg-white/90 p-4 text-center shadow-sm ring-1 ring-white">
            <p className="text-2xl">🌱</p>
            <p className="mt-1 text-xl font-black text-[#205238]">
              {view.wrongQuestionCount}
            </p>
            <p className="text-xs font-bold text-[#74887b]">待复习题</p>
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-end justify-between">
            <div>
              <h2 className="text-xl font-black text-[#173f2a]">我的学习</h2>
              <p className="text-sm font-semibold text-[#74887b]">
                已完成 {view.completedSessions} 个超级大脑 Session
              </p>
            </div>
            <Link
              href={`/knowledge/${comparativeKnowledge.id}`}
              className="text-sm font-black text-[#2c8a56]"
            >
              查看全部规则
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {view.stats.map((stat) => {
              const meta = getMasteryMeta(stat.accuracy);
              return (
                <div
                  key={stat.subtopicId}
                  className="flex items-center gap-4 rounded-3xl bg-white/90 p-4 shadow-sm ring-1 ring-white"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#eef8e8] text-2xl">
                    {stat.total > 0 ? meta.icon : "🌱"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate font-black text-[#214d32]">
                        {stat.title}
                      </p>
                      <span className="text-xs font-black text-[#4f7a5e]">
                        {stat.total > 0 ? `${stat.accuracy}%` : "待练习"}
                      </span>
                    </div>
                    <div className="mt-2">
                      <ProgressBar value={stat.accuracy} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <p className="pb-4 text-center text-xs font-semibold text-[#7d9183]">
          Session、Attempt 和 LearningState 自动保存在这台设备
        </p>
      </main>
    </ForestBackdrop>
  );
}
