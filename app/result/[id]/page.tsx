import { ResultView } from "@/components/result/ResultView";
import {
  comparativesKnowledgePoints,
  comparativesQuestions,
  comparativesSection,
} from "@/data/content/comparatives";

export default async function ResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <ResultView
      challengeId={id}
      section={comparativesSection}
      knowledgePoints={comparativesKnowledgePoints}
      questions={comparativesQuestions}
    />
  );
}
