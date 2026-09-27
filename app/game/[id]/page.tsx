import { notFound } from "next/navigation";

import { GameView } from "@/components/game/GameView";
import { getKnowledge } from "@/data/knowledge/comparative";

export default async function ChallengePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const knowledge = getKnowledge(id);

  if (!knowledge) notFound();

  return <GameView knowledge={knowledge} mode="challenge" />;
}
