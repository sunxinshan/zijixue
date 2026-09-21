"use client";

import { ProgressBar } from "@/components/shared/ProgressBar";
import type {
  KnowledgeExample,
  KnowledgeRule,
  KnowledgeSubtopic,
} from "@/types/agent";

function WordPill({
  word,
  tone,
  onPronounce,
}: {
  word: string;
  tone: "base" | "comparative" | "superlative";
  onPronounce: (word: string) => void;
}) {
  const toneClass = {
    base: "bg-[#f4f7ef] text-[#35533f] ring-[#dce8d6]",
    comparative: "bg-[#e6f7e9] text-[#17693c] ring-[#b9e5c1]",
    superlative: "bg-[#fff3c9] text-[#8a5a00] ring-[#f2dc92]",
  }[tone];

  return (
    <button
      type="button"
      onClick={() => onPronounce(word)}
      className={`rounded-2xl px-3 py-2 text-base font-extrabold ring-1 transition hover:-translate-y-0.5 sm:text-lg ${toneClass}`}
      aria-label={`播放 ${word} 的发音`}
    >
      {word}
    </button>
  );
}

function ExampleRow({
  example,
  onPronounce,
}: {
  example: KnowledgeExample;
  onPronounce: (word: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <WordPill word={example.base} tone="base" onPronounce={onPronounce} />
      <span className="font-black text-[#91a098]">→</span>
      <WordPill
        word={example.comparative}
        tone="comparative"
        onPronounce={onPronounce}
      />
      <span className="font-black text-[#91a098]">→</span>
      <WordPill
        word={example.superlative}
        tone="superlative"
        onPronounce={onPronounce}
      />
    </div>
  );
}

export function KnowledgeCard({
  subtopic,
  rule,
  index,
  accuracy,
  totalAttempts,
  onPronounce,
}: {
  subtopic: KnowledgeSubtopic;
  rule?: KnowledgeRule;
  index: number;
  accuracy?: number;
  totalAttempts?: number;
  onPronounce: (word: string) => void;
}) {
  return (
    <article className="rounded-[2rem] border border-white bg-white/90 p-5 shadow-[0_16px_45px_rgba(47,108,66,0.10)] backdrop-blur sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#e8f6df] text-lg font-black text-[#277146]">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-black text-[#173f2a]">{subtopic.title}</h2>
          <p className="mt-1 text-sm font-medium leading-6 text-[#5b7062]">
            {rule?.explanation ?? subtopic.description}
          </p>
          {typeof accuracy === "number" && (totalAttempts ?? 0) > 0 ? (
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-xs font-black text-[#60786a]">
                <span>练习表现</span>
                <span>{accuracy}%</span>
              </div>
              <ProgressBar value={accuracy} />
            </div>
          ) : null}
        </div>
      </div>

      {rule?.examples.length ? (
        <div className="mt-5 space-y-3">
          {rule.examples.map((example) => (
            <ExampleRow
              key={example.id}
              example={example}
              onPronounce={onPronounce}
            />
          ))}
        </div>
      ) : null}

      <p className="mt-4 rounded-2xl bg-[#f6f9f3] px-4 py-3 text-xs font-semibold text-[#769080]">
        点击英文单词可以听发音
      </p>
    </article>
  );
}
