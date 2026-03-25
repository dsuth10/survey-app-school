import React from "react";
import { Button } from "@heroui/react";

function parseOrder(value, options) {
  if (value) {
    try {
      const parsed = typeof value === "string" ? JSON.parse(value) : value;
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (_) {}
  }
  return [...options];
}

export default function RankingQuestion({ question, value, onChange, index }) {
  const options = question.options && Array.isArray(question.options) ? question.options.filter(Boolean) : [];
  const [order, setOrder] = React.useState(() => parseOrder(value, options));

  React.useEffect(() => {
    const next = parseOrder(value, options);
    setOrder(next);
    if (!value && next.length) onChange(JSON.stringify(next));
  }, [question.id]);

  const move = (fromIndex, direction) => {
    const toIndex = fromIndex + direction;
    if (toIndex < 0 || toIndex >= order.length) return;
    const next = [...order];
    [next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]];
    setOrder(next);
    onChange(JSON.stringify(next));
  };

  if (options.length === 0) return null;

  return (
    <div className="mb-6 p-4 border border-divider rounded-lg shadow-sm">
      <p className="font-semibold mb-2">
        {index + 1}. {question.questionText}
        {question.isRequired && <span className="text-danger"> *</span>}
      </p>
      <p className="text-sm text-default-500 mb-3">Order the items (use ↑ ↓ to move).</p>
      <div className="space-y-2">
        {order.map((item, i) => (
          <div
            key={`${item}-${i}`}
            className="flex items-center gap-2 p-2 rounded-lg bg-default-100"
          >
            <span className="text-sm font-medium w-8">{i + 1}.</span>
            <span className="flex-grow">{item}</span>
            <div className="flex gap-1">
              <Button
                size="sm"
                isIconOnly
                variant="flat"
                onPress={() => move(i, -1)}
                isDisabled={i === 0}
              >
                ↑
              </Button>
              <Button
                size="sm"
                isIconOnly
                variant="flat"
                onPress={() => move(i, 1)}
                isDisabled={i === order.length - 1}
              >
                ↓
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
