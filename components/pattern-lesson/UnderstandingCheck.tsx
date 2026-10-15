"use client";

import { useEffect, useState } from "react";

import { AnswerButton } from "@/components/game/AnswerButton";
import { evaluateUnderstandingAnswer } from "@/lib/pattern-lesson";
import type { UnderstandingCheckQuestion } from "@/types/agent";

interface CheckFeedback {
  correct: boolean;
  explanation: string;
}

function buildInitialFeedback(
  questions: UnderstandingCheckQuestion[],
  answers: Record<string, string | boolean>,
): Record<string, CheckFeedback> {
  return Object.fromEntries(
    questions.flatMap((question) => {
      const answer = answers[question.id];
      if (answer === undefined) return [];
      return [
        [
          question.id,
          {
            correct: evaluateUnderstandingAnswer(question, answer),
            explanation: question.explanation,
          },
        ],
      ];
    }),
  );
}

export function UnderstandingCheck({
  questions,
  initialAnswers = {},
  onPassedChange,
  onAnswersChange,
}: {
  questions: UnderstandingCheckQuestion[];
  initialAnswers?: Record<string, string | boolean>;
  onPassedChange?: (passed: boolean) => void;
  onAnswersChange?: (
    answers: Record<string, string | boolean>,
    passed: boolean,
  ) => void;
}) {
  const [selected, setSelected] = useState<
    Record<string, string | boolean>
  >(() => initialAnswers);
  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      Object.entries(initialAnswers)
        .filter(([, answer]) => typeof answer === "string")
        .map(([id, answer]) => [id, String(answer)]),
    ),
  );
  const [feedback, setFeedback] = useState<Record<string, CheckFeedback>>(
    () => buildInitialFeedback(questions, initialAnswers),
  );

  const passed = questions.every((question) => feedback[question.id]?.correct);

  useEffect(() => {
    onPassedChange?.(questions.length === 0 ? true : passed);
  }, [onPassedChange, passed, questions.length]);

  const check = (
    question: UnderstandingCheckQuestion,
    answer: string | boolean,
  ) => {
    const correct = evaluateUnderstandingAnswer(question, answer);
    const nextSelected = { ...selected, [question.id]: answer };
    const nextFeedback = {
      ...feedback,
      [question.id]: {
        correct,
        explanation: question.explanation,
      },
    };
    const nextPassed = questions.every(
      (item) => nextFeedback[item.id]?.correct === true,
    );

    setSelected(nextSelected);
    setFeedback(nextFeedback);
    onAnswersChange?.(nextSelected, nextPassed);
  };

  const answerState = (
    question: UnderstandingCheckQuestion,
    option: string | boolean,
  ) => {
    const current = feedback[question.id];
    if (!current) return "idle" as const;
    if (current.correct && option === question.answer) return "correct" as const;
    if (!current.correct && selected[question.id] === option) {
      return "wrong" as const;
    }
    return "idle" as const;
  };

  return (
    <section className="rounded-[1.5rem] bg-[#fff8df] p-5">
      <p className="text-xs font-black tracking-wide text-[#8a5a00]">
        理解检查
      </p>
      <p className="mt-1 text-sm font-semibold text-[#60786a]">
        检查只是帮助确认是否看懂，不会直接改变 Pattern 掌握度。
      </p>

      <div className="mt-4 space-y-5">
        {questions.map((question, index) => {
          const current = feedback[question.id];
          const locked = current?.correct === true;

          return (
            <div key={question.id} className="rounded-2xl bg-white p-4">
              <p className="font-black text-[#214d32]">
                {index + 1}. {question.prompt}
              </p>

              {question.type === "choice" ? (
                <div className="mt-3 space-y-2">
                  {(question.options ?? []).map((option) => (
                    <AnswerButton
                      key={option}
                      onClick={() => check(question, option)}
                      disabled={locked}
                      state={answerState(question, option)}
                    >
                      {option}
                    </AnswerButton>
                  ))}
                </div>
              ) : null}

              {question.type === "true_false" ? (
                <div className="mt-3 space-y-2">
                  {[true, false].map((option) => (
                    <AnswerButton
                      key={String(option)}
                      onClick={() => check(question, option)}
                      disabled={locked}
                      state={answerState(question, option)}
                    >
                      {option ? "✅ 正确" : "❌ 错误"}
                    </AnswerButton>
                  ))}
                </div>
              ) : null}

              {question.type === "fill_blank" ? (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input
                    value={drafts[question.id] ?? ""}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [question.id]: event.target.value,
                      }))
                    }
                    disabled={locked}
                    className="min-h-12 flex-1 rounded-2xl border-2 border-[#dcebd9] bg-[#f8fbf5] px-4 font-bold text-[#214d32] outline-none focus:border-[#66c979] disabled:opacity-70"
                    aria-label={question.prompt}
                  />
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => check(question, drafts[question.id] ?? "")}
                    className="min-h-12 rounded-2xl bg-[#2d995b] px-5 font-black text-white disabled:opacity-50"
                  >
                    检查
                  </button>
                </div>
              ) : null}

              {current ? (
                <div
                  className={`mt-3 rounded-xl px-3 py-2 text-sm font-semibold ${
                    current.correct
                      ? "bg-[#effbf0] text-[#17693c]"
                      : "bg-[#fff5f3] text-[#a33d36]"
                  }`}
                >
                  <p className="font-black">
                    {current.correct ? "答对了" : "再试一次"}
                  </p>
                  <p className="mt-1">{current.explanation}</p>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
