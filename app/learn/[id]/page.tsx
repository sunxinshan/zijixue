import { redirect } from "next/navigation";

export default async function LearnPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/knowledge/${id}`);
}
