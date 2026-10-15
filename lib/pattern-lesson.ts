import { normalizeChoiceAnswer } from "@/lib/game";
import type {
  ComicPanel,
  TeachingContent,
  TeachingMode,
  UnderstandingCheckQuestion,
} from "@/types/agent";

export function getPublishedComicPanels(
  content: TeachingContent,
): ComicPanel[] {
  const comic = content.comic;
  if (
    !comic ||
    comic.status !== "published" ||
    comic.panels.length < 1 ||
    comic.panels.length > 2 ||
    comic.panels.some((panel) => panel.imageUrl.trim().length === 0)
  ) {
    return [];
  }
  return [...comic.panels].sort((left, right) => left.order - right.order);
}

export function hasPublishedComic(content: TeachingContent): boolean {
  return getPublishedComicPanels(content).length > 0;
}

export function getInitialTeachingMode(
  content: TeachingContent,
): TeachingMode {
  return hasPublishedComic(content) ? "comic" : "text";
}

export function evaluateUnderstandingAnswer(
  question: UnderstandingCheckQuestion,
  answer: string | boolean,
): boolean {
  if (
    typeof question.answer === "boolean" ||
    typeof answer === "boolean"
  ) {
    return question.answer === answer;
  }
  return normalizeChoiceAnswer(answer) === normalizeChoiceAnswer(question.answer);
}
