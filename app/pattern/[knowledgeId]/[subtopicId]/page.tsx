import { notFound } from "next/navigation";

import { PatternLessonPage } from "@/components/pattern-lesson/PatternLessonPage";
import { getKnowledge, getSubtopic } from "@/data/knowledge/comparative";

export default async function PatternPage({
  params,
}: {
  params: Promise<{ knowledgeId: string; subtopicId: string }>;
}) {
  const { knowledgeId, subtopicId } = await params;
  const knowledge = getKnowledge(knowledgeId);
  const subtopic = knowledge ? getSubtopic(knowledge, subtopicId) : undefined;

  if (!knowledge || !subtopic) notFound();

  return (
    <PatternLessonPage knowledgeId={knowledge.id} subtopic={subtopic} />
  );
}
