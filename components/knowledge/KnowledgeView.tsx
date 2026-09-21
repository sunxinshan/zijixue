"use client";

import Link from "next/link";
import { useMemo } from "react";

import { KnowledgeCard } from "@/components/knowledge/KnowledgeCard";
import { ForestBackdrop } from "@/components/shared/ForestBackdrop";
import { ProgressBar } from "@/components/shared/ProgressBar";
import { getSubtopicStats } from "@/lib/game";
import { getMasteryMeta } from "@/lib/mastery";
import { getLearningState } from "@/lib/storage";
import { useAppStorage } from "@/lib/use-app-storage";
import type { Knowledge } from "@/types/agent";

export function KnowledgeView({ knowledge }: { knowledge: Knowledge }) {
  const storage = useAppStorage();
  const learningState = getLearningState(storage, knowledge.id);
  const mastery = learningState?.mastery ?? 0;
  const meta = getMasteryMeta(mastery);
  const subtopicStats = useMemo(
    () => getSubtopicStats(storage, knowledge),
    [knowledge, storage],
  );

  const speak = (word: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = "en-US";
    utterance.rate = 0.82;
    window.speechSynthesis.speak(utterance);
  };

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
          <p className="text-xs font-bold text-[#74887b]">Agent 掌握度</p>
          <p className="font-black text-[#277146]">
            {meta.icon} {mastery}%
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
            {learningState?.summary ?? knowledge.description}
          </p>
          <div className="mt-5 max-w-sm">
            <ProgressBar value={mastery} label="长期 LearningState" tone="yellow" />
          </div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          {knowledge.subtopics.map((subtopic, index) => {
            const rule = knowledge.rules.find(
              (item) => item.subtopicId === subtopic.id,
            );
            const stats = subtopicStats.find(
              (item) => item.subtopicId === subtopic.id,
            );

            return (
              <KnowledgeCard
                key={subtopic.id}
                subtopic={subtopic}
                rule={rule}
                index={index}
                accuracy={stats?.accuracy}
                totalAttempts={stats?.total}
                onPronounce={speak}
              />
            );
          })}
        </section>

        <div className="sticky bottom-4 z-10 mt-6 rounded-[1.5rem] border border-white bg-white/90 p-3 shadow-[0_16px_40px_rgba(47,108,66,0.16)] backdrop-blur">
          <Link
            href={`/game/${knowledge.id}`}
            className="flex min-h-14 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#2d995b] to-[#58bd6d] px-6 text-base font-black text-white shadow-lg transition hover:-translate-y-0.5"
          >
            开始 Agent 教学
            <span className="ml-2" aria-hidden="true">
              →
            </span>
          </Link>
        </div>
      </main>
    </ForestBackdrop>
  );
}
