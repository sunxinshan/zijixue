"use client";

import Image from "next/image";

import type { ComicLesson as ComicLessonData } from "@/types/agent";

export function ComicLesson({
  lesson,
  onImageError,
}: {
  lesson: ComicLessonData;
  onImageError: () => void;
}) {
  const panels = [...lesson.panels].sort(
    (left, right) => left.order - right.order,
  );

  return (
    <div
      className={`grid gap-5 ${panels.length === 2 ? "lg:grid-cols-2" : ""}`}
    >
      {panels.map((panel) => (
        <article
          key={panel.id}
          className="overflow-hidden rounded-[1.75rem] border-2 border-white bg-[#f8fbf5] shadow-[0_16px_40px_rgba(47,108,66,0.12)]"
        >
          <div className="relative overflow-hidden bg-[#eaf5e6]">
            <Image
              src={panel.imageUrl}
              alt={panel.altText}
              width={1024}
              height={1536}
              priority={panel.order === 1}
              className="h-auto w-full object-contain"
              onError={onImageError}
            />
            <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-black text-[#2c8a56] shadow-sm">
              画面 {panel.order}
            </span>
          </div>

          <div className="space-y-3 p-4">
            <p className="text-xs font-black text-[#8a5a00]">
              本格重点：{panel.purpose}
            </p>

            {panel.narration ? (
              <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-[#dcebd9]">
                <p className="text-xs font-black text-[#60786a]">旁白</p>
                <p className="mt-1 font-bold text-[#315341]">
                  {panel.narration}
                </p>
              </div>
            ) : null}

            <div className="space-y-2">
              {panel.dialogue.map((line) => (
                <div
                  key={`${panel.id}-${line.characterId}-${line.text}`}
                  className="rounded-xl rounded-tl-sm bg-[#effbf0] px-3 py-2"
                >
                  <p className="text-xs font-black text-[#2c8a56]">
                    {line.characterName}
                  </p>
                  <p className="mt-1 font-extrabold text-[#214d32]">
                    “{line.text}”
                  </p>
                  {line.translation ? (
                    <p className="mt-1 text-xs font-semibold text-[#60786a]">
                      {line.translation}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>

            {panel.focusText?.length ? (
              <div className="flex flex-wrap gap-2">
                {panel.focusText.map((text) => (
                  <span
                    key={text}
                    className="rounded-full bg-[#fff3c9] px-3 py-1 text-xs font-black text-[#8a5a00]"
                  >
                    {text}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}
