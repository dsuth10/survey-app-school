import React from "react";
import { CheckboxGroup, Checkbox } from "@heroui/react";

export default function CheckboxQuestion({ question, value = [], onChange, index }) {
  return (
    <CheckboxGroup
      label={`${index + 1}. ${question.questionText}`}
      value={value}
      onValueChange={onChange}
      isRequired={question.isRequired}
      description={question.isRequired ? "Required" : ""}
      className="mb-6 p-4 border border-divider rounded-lg shadow-sm"
    >
      {question.options.map((opt, i) => (
        <Checkbox key={i} value={opt}>
          {opt}
        </Checkbox>
      ))}
    </CheckboxGroup>
  );
}
