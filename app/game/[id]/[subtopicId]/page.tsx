import { notFound } from "next/navigation";

import { GameView } from "@/components/game/GameView";
import { getKnowledge, getSubtopic } from "@/data/knowledge/comparative";

export default async function SubtopicGamePage({
  params,
}: {
  params: Promise<{ id: string; subtopicId: string }>;
}) {
  const { id, subtopicId } = await params;
  const knowledge = getKnowledge(id);
  const subtopic = knowledge ? getSubtopic(knowledge, subtopicId) : undefined;

  if (!knowledge || !subtopic) notFound();

  return (
    <GameView
      knowledge={knowledge}
      mode="subtopic"
      subtopic={subtopic}
    />
  );
}
