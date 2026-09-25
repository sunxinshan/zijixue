import type { QuestionBatch } from "@/types/agent";

function shuffle<T>(values: T[], random: () => number): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function reorderQuestionOptions(
  options: string[],
  answer: string,
  targetPosition: number,
): string[] {
  let removedAnswer = false;
  const distractors: string[] = [];

  for (const option of options) {
    if (!removedAnswer && option === answer) {
      removedAnswer = true;
      continue;
    }
    distractors.push(option);
  }

  const reordered = [...distractors];
  reordered.splice(Math.min(targetPosition, reordered.length), 0, answer);
  return reordered;
}

export function randomizeChoiceOptionPositions(
  batch: QuestionBatch,
  random: () => number = Math.random,
): QuestionBatch {
  const groups = new Map<number, number[]>();

  batch.questions.forEach((question, index) => {
    if (question.type !== "choice" || !question.options) return;
    const length = question.options.length;
    const group = groups.get(length) ?? [];
    group.push(index);
    groups.set(length, group);
  });

  const questions = [...batch.questions];

  for (const [optionCount, questionIndexes] of groups) {
    const positions = questionIndexes.map((_, index) => index % optionCount);
    const shuffledPositions = shuffle(positions, random);

    questionIndexes.forEach((questionIndex, index) => {
      const question = questions[questionIndex];
      if (
        question.type !== "choice" ||
        !question.options ||
        typeof question.answer !== "string"
      ) {
        return;
      }

      questions[questionIndex] = {
        ...question,
        options: reorderQuestionOptions(
          question.options,
          question.answer,
          shuffledPositions[index],
        ),
      };
    });
  }

  return { questions };
}
