"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/button";
import {
  Fieldset,
  Legend,
  FieldGroup,
  Field,
  Label,
  Description,
} from "@/components/fieldset";
import { Textarea } from "@/components/textarea";

/**
 * SequenceStep component:
 *  - Tells the user about dynamic variables like {firstName}, {lastName}, {companyName}.
 *  - Displays a Textarea for "messageContent".
 *  - Provides an autocomplete dropdown when the user types "{".
 */
export default function SequenceStep({
  scheduleForm,
  setScheduleForm,
  saveSequence,
}) {
  // Which variables you want to allow:
  const dynamicVariables = [
    "{firstName}",
    "{lastName}",
    "{companyName}",
  ];

  // State to show/hide the autocomplete dropdown
  const [showAutocomplete, setShowAutocomplete] = useState(false);

  // If you want to track the X/Y position in a more advanced way, you could do so here.
  // For simplicity, we show the suggestions below the textarea always.
  const textAreaRef = useRef(null);

  /**
   * If the user typed "{" as the last character, show the dropdown.
   * Otherwise, hide it.
   */
  function handleTextareaChange(e) {
    const { value, selectionStart } = e.target;
    setScheduleForm({ ...scheduleForm, messageContent: value });

    // If the last typed character is '{', show suggestions
    // We'll also check that it's not a repeated {{ or something,
    // but you can remove that check if you want.
    if (
      selectionStart > 0 &&
      value[selectionStart - 1] === "{" &&
      (selectionStart === 1 || value[selectionStart - 2] !== "{")
    ) {
      setShowAutocomplete(true);
    } else {
      // Hide if user deletes or types something else
      setShowAutocomplete(false);
    }
  }

  /**
   * Inserts the chosen variable in place of the last typed '{'.
   */
  function insertVariable(variable) {
    const textarea = textAreaRef.current;
    if (!textarea) return;

    const { value, selectionStart, selectionEnd } = textarea;
    // We find the position of the '{' we just typed. That is (selectionStart - 1).
    const insertPos = selectionStart - 1;
    if (insertPos < 0) return;

    // Replace that '{' with the entire variable, e.g. {firstName}
    const newValue =
      value.substring(0, insertPos) + variable + value.substring(selectionEnd);

    // Compute new cursor position => insertPos + length of inserted variable
    const newCursorPos = insertPos + variable.length;

    // Update the form and hide dropdown
    setScheduleForm({ ...scheduleForm, messageContent: newValue });
    setShowAutocomplete(false);

    // Re-focus and set cursor
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    });
  }

  return (
    <div style={{ marginTop: "2rem" }}>
      <h2 className="text-lg font-semibold">Sequence</h2>

      {/* Explain dynamic variables to the user */}
      <p className="text-sm mt-2 mb-4 text-foreground/80">
        Use dynamic variables like <code>{"{firstName}"}</code>,{" "}
        <code>{"{lastName}"}</code>, and <code>{"{companyName}"}</code> in your
        message. For example:{" "}
        <em>
          "Hello {"{firstName}"} from {"{companyName}"}!"
        </em>
        <br />
        As soon as you type a lone <strong>{"{"}</strong> character, you'll see
        suggestions.
      </p>

      <Fieldset style={{ marginTop: "1.5rem", maxWidth: 500 }}>
        <Legend>Message Settings</Legend>
        <FieldGroup>
          <Field>
            <Label>Message Content</Label>
            <Textarea
              ref={textAreaRef}
              rows={3}
              value={scheduleForm.messageContent}
              onChange={handleTextareaChange}
            />
            <Description>
              This is the SMS message sent to each lead.
            </Description>
          </Field>
        </FieldGroup>
      </Fieldset>

      {/* Autocomplete suggestions (only shown if showAutocomplete = true) */}
      {showAutocomplete && (
        <div
          style={{
            marginTop: 8,
            border: "1px solid #ccc",
            background: "white",
            borderRadius: 4,
            padding: "4px 8px",
            maxWidth: 250,
            boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
          }}
        >
          <p className="text-xs mb-2 text-foreground/60">
            Insert a dynamic variable:
          </p>
          {dynamicVariables.map((variable) => (
            <div
              key={variable}
              onClick={() => insertVariable(variable)}
              style={{
                padding: "4px 0",
                cursor: "pointer",
                borderBottom: "1px solid #eee",
              }}
            >
              <code>{variable}</code>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: "1.5rem" }}>
        <Button color="blue" onClick={saveSequence}>
          Save Sequence
        </Button>
      </div>
    </div>
  );
}
