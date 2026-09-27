"use client";

import Link from "next/link";

import { ProgressBar } from "@/components/shared/ProgressBar";
import type { LearningState, Subtopic } from "@/types/agent";

export function KnowledgeCard({
  subtopic,
  index,
  state,
  onPronounce,
}: {
  subtopic: Subtopic;
  index: number;
  state?: LearningState;
  onPronounce: (word: string) => void;
}) {
  const coverageComplete =
    state &&
    subtopic.patterns.every(
      (pattern) =>
        !pattern.required ||
        state.patternProgress[pattern.id]?.coverageComplete === true,
    );

  return (
    <article className="rounded-[2rem] border border-white bg-white/90 p-5 shadow-[0_16px_45px_rgba(47,108,66,0.10)] backdrop-blur sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#e8f6df] text-lg font-black text-[#277146]">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-black text-[#173f2a]">{subtopic.name}</h2>
            <span
              className={`rounded-full px-3 py-1 text-xs font-black ${
                state?.completed
                  ? "bg-[#e6f7e9] text-[#17693c]"
                  : coverageComplete
                    ? "bg-[#fff3c9] text-[#8a5a00]"
                    : "bg-[#eef3fb] text-[#496887]"
              }`}
            >
              {state?.completed
                ? "已完成"
                : coverageComplete
                  ? "Coverage 完成"
                  : "学习中"}
            </span>
          </div>
          <p className="mt-1 text-sm font-medium leading-6 text-[#5b7062]">
            {subtopic.description}
          </p>
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-xs font-black text-[#60786a]">
              <span>Mastery</span>
              <span>{state?.mastery ?? 0}%</span>
            </div>
            <ProgressBar value={state?.mastery ?? 0} />
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {subtopic.patterns.map((pattern) => {
          const progress = state?.patternProgress[pattern.id];
          const total = pattern.coverageItems?.length ?? pattern.minimumQuestions;
          const covered = pattern.coverageItems
            ? pattern.coverageItems.filter((item) =>
                progress?.coveredItems.includes(item),
              ).length
            : progress?.attemptedQuestions ?? 0;
          return (
            <div key={pattern.id} className="rounded-2xl bg-[#f8fbf5] p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-black text-[#315341]">{pattern.name}</p>
                <span className="text-xs font-black text-[#60786a]">
                  {covered}/{total}
                </span>
              </div>
              <p className="mt-1 text-xs font-semibold leading-5 text-[#74887b]">
                {pattern.description}
              </p>
              {pattern.examples.slice(0, 2).map((example) => (
                <button
                  type="button"
                  key={example.id}
                  onClick={() => {
                    const word = example.base ?? example.text.split(/\s+/).find((part) => /^[A-Za-z-]+$/.test(part));
                    if (word) onPronounce(word);
                  }}
                  className="mt-2 mr-2 rounded-xl bg-white px-3 py-2 text-left text-xs font-bold text-[#35533f] ring-1 ring-[#dce8d6]"
                >
                  {example.text}
                </button>
              ))}
            </div>
          );
        })}
      </div>

      <Link
        href={`/game/comparative/${subtopic.id}`}
        className="mt-5 flex min-h-12 items-center justify-center rounded-2xl bg-gradient-to-r from-[#2d995b] to-[#58bd6d] px-5 text-sm font-black text-white shadow-md"
      >
        {state?.completed ? "再次练习" : "进入 Subtopic"}
      </Link>
    </article>
  );
}
