import type { TeachingContent } from "@/types/agent";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-[#f8fbf5] p-4">
      <p className="text-xs font-black tracking-wide text-[#2c8a56]">
        {title}
      </p>
      <div className="mt-2 text-sm font-semibold leading-6 text-[#315341]">
        {children}
      </div>
    </section>
  );
}

export function TextLesson({ content }: { content: TeachingContent }) {
  return (
    <div className="space-y-4">
      <Section title="核心概念">
        <p>{content.concept}</p>
      </Section>

      {content.why ? (
        <Section title="为什么">
          <p>{content.why}</p>
        </Section>
      ) : null}

      {content.rule ? (
        <Section title="规则">
          <p className="font-black text-[#214d32]">{content.rule}</p>
        </Section>
      ) : null}

      {content.structure ? (
        <Section title="结构">
          <p className="rounded-xl bg-[#fff8df] px-3 py-2 font-black text-[#8a5a00]">
            {content.structure}
          </p>
        </Section>
      ) : null}

      <Section title="例句">
        <div className="space-y-3">
          {content.examples.map((example) => (
            <div
              key={`${example.sentence}-${example.translation ?? ""}`}
              className="rounded-xl bg-white p-3 ring-1 ring-[#e2eee0]"
            >
              <p className="font-black text-[#214d32]">{example.sentence}</p>
              {example.translation ? (
                <p className="mt-1 text-sm text-[#60786a]">
                  {example.translation}
                </p>
              ) : null}
              {example.analysis ? (
                <p className="mt-1 text-xs font-semibold text-[#8a5a00]">
                  {example.analysis}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </Section>

      {content.usage?.length ? (
        <Section title="用法">
          <ul className="space-y-1">
            {content.usage.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </Section>
      ) : null}

      {content.contrasts?.length ? (
        <Section title="对比">
          <ul className="space-y-1">
            {content.contrasts.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </Section>
      ) : null}

      {content.commonMistakes?.length ? (
        <section className="rounded-2xl bg-[#fff5f3] p-4">
          <p className="text-xs font-black tracking-wide text-[#a33d36]">
            常见错误
          </p>
          <ul className="mt-2 space-y-1 text-sm font-semibold leading-6 text-[#8f4a44]">
            {content.commonMistakes.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {content.practiceHints?.length ? (
        <Section title="练习提示">
          <ul className="space-y-1">
            {content.practiceHints.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </Section>
      ) : null}
    </div>
  );
}
