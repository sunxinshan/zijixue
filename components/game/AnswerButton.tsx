import type { ReactNode } from "react";

export function AnswerButton({
  children,
  onClick,
  disabled,
  state = "idle",
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  state?: "idle" | "correct" | "wrong";
}) {
  const stateClass = {
    idle:
      "border-white bg-white/95 text-[#214d32] shadow-[0_10px_25px_rgba(47,108,66,0.10)] hover:-translate-y-0.5 hover:border-[#8ad79a]",
    correct: "border-[#66c979] bg-[#e8faea] text-[#17693c]",
    wrong: "border-[#f3a39b] bg-[#fff0ee] text-[#a33d36]",
  }[state];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`min-h-14 w-full rounded-2xl border-2 px-5 py-3 text-left text-base font-extrabold transition disabled:cursor-default ${stateClass}`}
    >
      {children}
    </button>
  );
}
