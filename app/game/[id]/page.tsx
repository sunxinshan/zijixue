import { notFound } from "next/navigation";

import { GameView } from "@/components/game/GameView";
import {
  comparativesKnowledgePoints,
  comparativesQuestions,
  comparativesSection,
  comparativesSectionId,
} from "@/data/content/comparatives";

export default async function GamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (id !== comparativesSectionId) {
    notFound();
  }

  return (
    <GameView
      section={comparativesSection}
      knowledgePoints={comparativesKnowledgePoints}
      questions={comparativesQuestions}
    />
  );
}
