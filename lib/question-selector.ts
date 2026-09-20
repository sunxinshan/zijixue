import type { KnowledgeMastery, Question } from "@/types/content";

export interface QuestionSelectionOptions {
  count?: number;
  mastery?: Record<string, KnowledgeMastery>;
  random?: () => number;
}

export function getQuestionWeight(
  question: Question,
  mastery: Record<string, KnowledgeMastery> = {},
): number {
  const pointMasteries = question.knowledgePointIds.map(
    (id) => mastery[id]?.mastery ?? 0,
  );
  const lowestMastery = pointMasteries.length > 0 ? Math.min(...pointMasteries) : 0;
  return Math.max(1, 100 - lowestMastery);
}

export function selectQuestions(
  questions: Question[],
  options: QuestionSelectionOptions = {},
): Question[] {
  const count = Math.min(options.count ?? 10, questions.length);
  const random = options.random ?? Math.random;
  const pool = [...questions];
  const selected: Question[] = [];

  while (selected.length < count && pool.length > 0) {
    const weights = pool.map((question) =>
      getQuestionWeight(question, options.mastery),
    );
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let ticket = random() * totalWeight;
    let selectedIndex = pool.length - 1;

    for (let index = 0; index < pool.length; index += 1) {
      ticket -= weights[index];
      if (ticket < 0) {
        selectedIndex = index;
        break;
      }
    }

    selected.push(pool[selectedIndex]);
    pool.splice(selectedIndex, 1);
  }

  return selected;
}
