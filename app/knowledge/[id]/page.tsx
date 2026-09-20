import { notFound } from "next/navigation";

import { KnowledgeView } from "@/components/knowledge/KnowledgeView";
import {
  comparativesKnowledgePoints,
  comparativesSection,
  comparativesSectionId,
} from "@/data/content/comparatives";

export default async function KnowledgePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (id !== comparativesSectionId) {
    notFound();
  }

  return (
    <KnowledgeView
      section={comparativesSection}
      knowledgePoints={comparativesKnowledgePoints}
    />
  );
}
