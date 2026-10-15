import { notFound } from "next/navigation";

import { PatternLessonPage } from "@/components/pattern-lesson/PatternLessonPage";
import { getKnowledge, getSubtopic } from "@/data/knowledge/comparative";

export default async function PatternDetailPage({
  params,
}: {
  params: Promise<{
    knowledgeId: string;
    subtopicId: string;
    patternId: string;
  }>;
}) {
  const { knowledgeId, subtopicId, patternId } = await params;
  const knowledge = getKnowledge(knowledgeId);
  const subtopic = knowledge ? getSubtopic(knowledge, subtopicId) : undefined;
  const pattern = subtopic?.patterns.find((item) => item.id === patternId);

  if (!knowledge || !subtopic || !pattern) notFound();

  return (
    <PatternLessonPage
      knowledgeId={knowledge.id}
      subtopic={subtopic}
      patternId={pattern.id}
    />
  );
}
