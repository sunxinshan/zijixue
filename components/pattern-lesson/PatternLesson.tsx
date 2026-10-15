"use client";

import Link from "next/link";
import { useState } from "react";

import { ComicLesson } from "@/components/pattern-lesson/ComicLesson";
import { TextLesson } from "@/components/pattern-lesson/TextLesson";
import { UnderstandingCheck } from "@/components/pattern-lesson/UnderstandingCheck";
import {
  getInitialTeachingMode,
  getPublishedComicPanels,
} from "@/lib/pattern-lesson";
import type { Subtopic, TeachingMode } from "@/types/agent";

export function PatternLesson({
  knowledgeId,
  subtopic,
  initialPatternId,
  completeLabel = "开始练习",
  onComplete,
}: {
  knowledgeId: string;
  subtopic: Subtopic;
  initialPatternId?: string;
  completeLabel?: string;
  onComplete: () => void;
}) {
  const [patternIndex, setPatternIndex] = useState(() => {
    const index = subtopic.patterns.findIndex(
      (item) => item.id === initialPatternId,
    );
    return index >= 0 ? index : 0;
  });
  const [modeOverride, setModeOverride] = useState<TeachingMode | null>(null);
  const [comicFailed, setComicFailed] = useState(false);
  const [checksPassed, setChecksPassed] = useState(false);

  const pattern = subtopic.patterns[patternIndex];
  const content = pattern.teachingContent;
  const publishedPanels = getPublishedComicPanels(content);
  const hasComic = publishedPanels.length > 0 && !comicFailed;
  const mode = hasComic
    ? modeOverride ?? getInitialTeachingMode(content)
    : "text";
  const hasUnderstandingCheck = Boolean(content.understandingCheck?.length);
  const canContinue = !hasUnderstandingCheck || checksPassed;

  const handleComicError = () => {
    setComicFailed(true);
  };

  const handleContinue = () => {
    if (!canContinue) return;
    if (patternIndex < subtopic.patterns.length - 1) {
      setComicFailed(false);
      setChecksPassed(false);
      setPatternIndex((current) => current + 1);
      return;
    }
    onComplete();
  };

  return (
    <main className="mx-auto max-w-4xl pb-8">
      <div className="flex items-center justify-between gap-3">
        <Link
          href={`/knowledge/${knowledgeId}`}
          className="rounded-2xl bg-white/85 px-4 py-3 text-sm font-black text-[#315341] shadow-sm"
        >
          ← 返回
        </Link>
        <span className="rounded-2xl bg-white/85 px-4 py-3 text-sm font-black text-[#60786a]">
          {patternIndex + 1}/{subtopic.patterns.length}
        </span>
      </div>

      <section className="mt-5 rounded-[2rem] bg-white/95 p-5 shadow-[0_20px_55px_rgba(47,108,66,0.14)] sm:p-7">
        <div className="text-center">
          <p className="text-xs font-black tracking-wide text-[#2c8a56]">
            {subtopic.name}
          </p>
          <h1 className="mt-2 text-3xl font-black text-[#173f2a]">
            {pattern.name}
          </h1>
          <p className="mt-2 text-sm font-semibold text-[#60786a]">
            先理解，再进入正式练习。讲解和检查不会直接计入 Pattern 掌握度。
          </p>
        </div>

        {hasComic ? (
          <div
            className="mx-auto mt-5 grid max-w-md grid-cols-2 rounded-2xl bg-[#f4f7ef] p-1"
            role="tablist"
            aria-label="讲解模式"
          >
            {[
              { id: "comic", label: "漫画讲解" },
              { id: "text", label: "文字讲解" },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={mode === item.id}
                onClick={() => setModeOverride(item.id as TeachingMode)}
                className={`min-h-11 rounded-xl px-4 text-sm font-black transition ${
                  mode === item.id
                    ? "bg-white text-[#277146] shadow-sm"
                    : "text-[#74887b]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        ) : null}

        <div className="mt-6">
          {mode === "comic" && hasComic ? (
            <ComicLesson lesson={content.comic!} onImageError={handleComicError} />
          ) : (
            <TextLesson content={content} />
          )}
        </div>

        <div className="mt-5 rounded-2xl bg-[#eaf7e7] p-4 text-[#214d32]">
          <p className="text-xs font-black tracking-wide text-[#2c8a56]">
            核心规则
          </p>
          <p className="mt-2 font-black">
            {content.rule ?? content.structure ?? content.concept}
          </p>
          {content.structure && content.rule ? (
            <p className="mt-1 text-sm font-bold text-[#60786a]">
              {content.structure}
            </p>
          ) : null}
        </div>

        {content.understandingCheck?.length ? (
          <div className="mt-5">
            <UnderstandingCheck
              key={pattern.id}
              questions={content.understandingCheck}
              onPassedChange={setChecksPassed}
            />
          </div>
        ) : null}

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={patternIndex === 0}
            onClick={() => {
              setComicFailed(false);
              setChecksPassed(false);
              setPatternIndex((current) => current - 1);
            }}
            className="min-h-14 rounded-2xl bg-[#f4f7ef] px-5 font-black text-[#315341] disabled:opacity-35"
          >
            上一步
          </button>
          <button
            type="button"
            disabled={!canContinue}
            onClick={handleContinue}
            className="min-h-14 rounded-2xl bg-gradient-to-r from-[#2d995b] to-[#58bd6d] px-5 font-black text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-45"
          >
            {!canContinue
              ? "先完成理解检查"
              : patternIndex < subtopic.patterns.length - 1
                ? "继续学习"
                : completeLabel}
          </button>
        </div>
      </section>
    </main>
  );
}
