"use client";

import { useRouter } from "next/navigation";

import { PatternLesson } from "@/components/pattern-lesson/PatternLesson";
import { ForestBackdrop } from "@/components/shared/ForestBackdrop";
import {
  getLessonCheckProgressBySubtopic,
  markPatternLessonComplete,
  saveLessonCheckProgress,
} from "@/lib/storage";
import { useAppStorage } from "@/lib/use-app-storage";
import type { Subtopic } from "@/types/agent";

export function PatternLessonPage({
  knowledgeId,
  subtopic,
  patternId,
}: {
  knowledgeId: string;
  subtopic: Subtopic;
  patternId?: string;
}) {
  const router = useRouter();
  const storage = useAppStorage();
  const checkProgress = getLessonCheckProgressBySubtopic(
    storage,
    knowledgeId,
    subtopic.id,
  );
  const lessonSubtopic = patternId
    ? {
        ...subtopic,
        patterns: subtopic.patterns.filter(
          (pattern) => pattern.id === patternId,
        ),
      }
    : subtopic;

  return (
    <ForestBackdrop compact>
      <PatternLesson
        knowledgeId={knowledgeId}
        subtopic={lessonSubtopic}
        completeLabel="完成解锁"
        initialCheckProgress={checkProgress}
        onCheckProgressChange={saveLessonCheckProgress}
        onComplete={() => {
          if (patternId) {
            markPatternLessonComplete(knowledgeId, subtopic.id, patternId);
          } else {
            for (const pattern of lessonSubtopic.patterns) {
              markPatternLessonComplete(
                knowledgeId,
                subtopic.id,
                pattern.id,
              );
            }
          }
          router.push(`/knowledge/${knowledgeId}`);
        }}
      />
    </ForestBackdrop>
  );
}
