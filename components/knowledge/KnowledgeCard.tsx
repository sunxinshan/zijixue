"use client";

import type { Example, KnowledgePoint } from "@/types/content";

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
  example: Example;
  onPronounce: (word: string) => void;
}) {
  if (!example.base) {
    return (
      <div className="rounded-2xl bg-[#f8fbf5] p-3 text-sm">
        <p className="font-bold text-[#214d32]">{example.english}</p>
        <p className="mt-1 text-[#688072]">{example.chinese}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <WordPill word={example.base} tone="base" onPronounce={onPronounce} />
      <span className="font-black text-[#91a098]">→</span>
      {example.comparative ? (
        <WordPill
          word={example.comparative}
          tone="comparative"
          onPronounce={onPronounce}
        />
      ) : null}
      {example.superlative ? (
        <>
          <span className="font-black text-[#91a098]">→</span>
          <WordPill
            word={example.superlative}
            tone="superlative"
            onPronounce={onPronounce}
          />
        </>
      ) : null}
    </div>
  );
}

export function KnowledgeCard({
  point,
  index,
  onPronounce,
}: {
  point: KnowledgePoint;
  index: number;
  onPronounce: (word: string) => void;
}) {
  const rule = point.rules?.[0];

  return (
    <article className="rounded-[2rem] border border-white bg-white/90 p-5 shadow-[0_16px_45px_rgba(47,108,66,0.10)] backdrop-blur sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#e8f6df] text-lg font-black text-[#277146]">
          {index + 1}
        </span>
        <div>
          <h2 className="text-xl font-black text-[#173f2a]">{point.title}</h2>
          <p className="mt-1 text-sm font-medium leading-6 text-[#5b7062]">
            {rule?.explanation ?? point.summary}
          </p>
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
