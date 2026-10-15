"use client";

import { useRouter } from "next/navigation";

import { PatternLesson } from "@/components/pattern-lesson/PatternLesson";
import { ForestBackdrop } from "@/components/shared/ForestBackdrop";
import { markSubtopicLessonComplete } from "@/lib/storage";
import type { Subtopic } from "@/types/agent";

export function PatternLessonPage({
  knowledgeId,
  subtopic,
}: {
  knowledgeId: string;
  subtopic: Subtopic;
}) {
  const router = useRouter();

  return (
    <ForestBackdrop compact>
      <PatternLesson
        knowledgeId={knowledgeId}
        subtopic={subtopic}
        completeLabel="完成解锁"
        onComplete={() => {
          markSubtopicLessonComplete(knowledgeId, subtopic.id);
          router.push(`/knowledge/${knowledgeId}`);
        }}
      />
    </ForestBackdrop>
  );
}
