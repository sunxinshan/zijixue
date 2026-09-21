import { ResultView } from "@/components/result/ResultView";
import { comparativeKnowledge } from "@/data/knowledge/comparative";

export default async function ResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <ResultView sessionId={id} knowledge={comparativeKnowledge} />;
}
