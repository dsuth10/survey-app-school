import React from "react";
import { RadioGroup, Radio } from "@heroui/react";

const OPTIONS = ["True", "False"];

export default function TrueFalseQuestion({ question, value, onChange, index }) {
  const options = question.options && question.options.length >= 2
    ? question.options
    : OPTIONS;

  return (
    <RadioGroup
      label={`${index + 1}. ${question.questionText}`}
      value={value}
      onValueChange={onChange}
      isRequired={question.isRequired}
      description={question.isRequired ? "Required" : ""}
      className="mb-6 p-4 border border-divider rounded-lg shadow-sm"
    >
      {options.map((opt) => (
        <Radio key={opt} value={opt}>
          {opt}
        </Radio>
      ))}
    </RadioGroup>
  );
}
