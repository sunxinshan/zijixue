import { redirect } from "next/navigation";

export default async function PatternDetailPage({
  params,
}: {
  params: Promise<{
    knowledgeId: string;
    subtopicId: string;
    patternId: string;
  }>;
}) {
  const { knowledgeId, subtopicId } = await params;
  redirect(`/pattern/${knowledgeId}/${subtopicId}`);
}
