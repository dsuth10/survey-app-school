import React from "react";
import { Input, Textarea } from "@heroui/react";

export default function TextQuestion({ question, value, onChange, index, isLong = false }) {
  const Component = isLong ? Textarea : Input;
  return (
    <div className="mb-6 p-4 border border-divider rounded-lg shadow-sm">
      <Component
        label={`${index + 1}. ${question.questionText}`}
        placeholder="Type your answer here..."
        value={value}
        onValueChange={onChange}
        isRequired={question.isRequired}
        variant="bordered"
        labelPlacement="outside"
        errorMessage={question.isRequired && !value ? "This field is required" : ""}
      />
    </div>
  );
}
