import { notFound } from "next/navigation";

import { KnowledgeView } from "@/components/knowledge/KnowledgeView";
import { getKnowledge } from "@/data/knowledge/comparative";

export default async function KnowledgePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const knowledge = getKnowledge(id);

  if (!knowledge) notFound();

  return <KnowledgeView knowledge={knowledge} />;
}
