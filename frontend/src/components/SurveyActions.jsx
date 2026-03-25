import React from "react";
import { Button, ButtonGroup } from "@heroui/react";

export default function SurveyActions({ 
  onSubmit, 
  onCancel, 
  isSubmitting, 
  submitLabel = "Submit Response",
  cancelLabel = "Cancel"
}) {
  return (
    <div className="flex gap-4 mt-8">
      <Button 
        color="primary" 
        variant="shadow" 
        onPress={onSubmit}
        isLoading={isSubmitting}
      >
        {submitLabel}
      </Button>
      <Button 
        variant="flat" 
        onPress={onCancel}
      >
        {cancelLabel}
      </Button>
    </div>
  );
}
