"use client";

import { useRouter } from "next/navigation";

import { PatternLesson } from "@/components/pattern-lesson/PatternLesson";
import { ForestBackdrop } from "@/components/shared/ForestBackdrop";
import {
  getLessonCheckProgressBySubtopic,
  markSubtopicLessonComplete,
  saveLessonCheckProgress,
} from "@/lib/storage";
import { useAppStorage } from "@/lib/use-app-storage";
import type { Subtopic } from "@/types/agent";

export function PatternLessonPage({
  knowledgeId,
  subtopic,
}: {
  knowledgeId: string;
  subtopic: Subtopic;
}) {
  const router = useRouter();
  const storage = useAppStorage();
  const checkProgress = getLessonCheckProgressBySubtopic(
    storage,
    knowledgeId,
    subtopic.id,
  );

  return (
    <ForestBackdrop compact>
      <PatternLesson
        knowledgeId={knowledgeId}
        subtopic={subtopic}
        completeLabel="完成解锁"
        initialCheckProgress={checkProgress}
        onCheckProgressChange={saveLessonCheckProgress}
        onComplete={() => {
          markSubtopicLessonComplete(knowledgeId, subtopic.id);
          router.push(`/knowledge/${knowledgeId}`);
        }}
      />
    </ForestBackdrop>
  );
}
