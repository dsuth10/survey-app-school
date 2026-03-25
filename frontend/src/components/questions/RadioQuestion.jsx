import React from "react";
import { RadioGroup, Radio } from "@heroui/react";

export default function RadioQuestion({ question, value, onChange, index }) {
  return (
    <RadioGroup
      label={`${index + 1}. ${question.questionText}`}
      value={value}
      onValueChange={onChange}
      isRequired={question.isRequired}
      description={question.isRequired ? "Required" : ""}
      className="mb-6 p-4 border border-divider rounded-lg shadow-sm"
    >
      {question.options.map((opt, i) => (
        <Radio key={i} value={opt}>
          {opt}
        </Radio>
      ))}
    </RadioGroup>
  );
}
