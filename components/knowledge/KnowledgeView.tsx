"use client";

import Link from "next/link";
import { useMemo } from "react";

import { KnowledgeCard } from "@/components/knowledge/KnowledgeCard";
import { ForestBackdrop } from "@/components/shared/ForestBackdrop";
import { ProgressBar } from "@/components/shared/ProgressBar";
import { getMasteryMeta } from "@/lib/mastery";
import {
  getSubtopicLearningStates,
  isChallengeUnlocked,
  isSubtopicLessonUnlocked,
} from "@/lib/storage";
import { useAppStorage } from "@/lib/use-app-storage";
import type { Knowledge } from "@/types/agent";

export function KnowledgeView({ knowledge }: { knowledge: Knowledge }) {
  const storage = useAppStorage();
  const subtopicStates = getSubtopicLearningStates(storage, knowledge.id);
  const challengeUnlocked = isChallengeUnlocked(storage, knowledge);
  const averageMastery =
    subtopicStates.length > 0
      ? Math.round(
          subtopicStates.reduce((sum, state) => sum + state.mastery, 0) /
            subtopicStates.length,
        )
      : 0;
  const meta = getMasteryMeta(averageMastery);

  const speak = (word: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = "en-US";
    utterance.rate = 0.82;
    window.speechSynthesis.speak(utterance);
  };

  const completedCount = useMemo(
    () => subtopicStates.filter((state) => state.completed).length,
    [subtopicStates],
  );

  return (
    <ForestBackdrop>
      <header className="flex items-center justify-between gap-4">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded-2xl bg-white/85 px-4 text-sm font-black text-[#315341] shadow-sm"
        >
          ← 返回森林
        </Link>
        <div className="rounded-2xl bg-white/85 px-4 py-2 text-right shadow-sm">
          <p className="text-xs font-bold text-[#74887b]">Knowledge 掌握度</p>
          <p className="font-black text-[#277146]">
            {meta.icon} {averageMastery}%
          </p>
        </div>
      </header>

      <main className="mt-6">
        <section className="rounded-[2rem] bg-[#1f7148] p-6 text-white shadow-[0_18px_50px_rgba(31,113,72,0.2)]">
          <span className="text-4xl">🐉</span>
          <h1 className="mt-3 text-3xl font-black sm:text-4xl">
            {knowledge.title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-white/80 sm:text-base">
            {knowledge.description}
          </p>
          <div className="mt-5 max-w-sm">
            <ProgressBar
              value={completedCount}
              max={knowledge.subtopics.length}
              label={`Subtopic 完成 ${completedCount}/${knowledge.subtopics.length}`}
              tone="yellow"
            />
          </div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          {knowledge.subtopics.map((subtopic, index) => {
            const state = subtopicStates.find(
              (item) => item.subtopicId === subtopic.id,
            );
            return (
              <KnowledgeCard
                key={subtopic.id}
                subtopic={subtopic}
                index={index}
                state={state}
                lessonUnlocked={isSubtopicLessonUnlocked(
                  storage,
                  knowledge.id,
                  subtopic,
                  state,
                )}
                lessonHref={`/pattern/${knowledge.id}/${subtopic.id}`}
                onPronounce={speak}
              />
            );
          })}
        </section>

        <section className="mt-6 rounded-[2rem] bg-white/92 p-6 shadow-sm ring-1 ring-white">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black tracking-wide text-[#8a5a00]">
                Knowledge Challenge
              </p>
              <h2 className="mt-1 text-xl font-black text-[#173f2a]">
                👑 比较级场景挑战
              </h2>
              <p className="mt-2 text-sm font-semibold text-[#60786a]">
                {challengeUnlocked
                  ? "所有 Subtopic 已完成，挑战将混合全部 Pattern。"
                  : "完成全部 Subtopic 和 required Pattern Coverage 后解锁。"}
              </p>
            </div>
          </div>
          {challengeUnlocked ? (
            <Link
              href={`/game/${knowledge.id}`}
              className="mt-5 flex min-h-14 items-center justify-center rounded-2xl bg-[#8a5a00] px-6 font-black text-white shadow-lg"
            >
              通关挑战
            </Link>
          ) : (
            <div className="mt-5 rounded-2xl bg-[#f8fbf5] px-5 py-4 text-center text-sm font-black text-[#74887b]">
              🔒 尚未解锁
            </div>
          )}
        </section>
      </main>
    </ForestBackdrop>
  );
}
