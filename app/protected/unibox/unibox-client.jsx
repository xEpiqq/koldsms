"use client";

import React, { useState, useEffect } from "react";
import { Heading } from "@/components/heading";
import { Text } from "@/components/text";
import { Fieldset, FieldGroup, Field, Label } from "@/components/fieldset";
import { Input } from "@/components/input";
import { Textarea } from "@/components/textarea";
import { Button } from "@/components/button";

/**
 * userBackends: Array of backend objects: { id, base_url, created_at, ... }
 */
export default function UniboxClient({ userBackends }) {
  // Combined conversation previews
  const [previews, setPreviews] = useState([]);
  // Which phone/which backend is selected?
  const [selectedPhone, setSelectedPhone] = useState("");
  const [selectedBackendIndex, setSelectedBackendIndex] = useState(null);
  // Loaded conversation messages
  const [conversation, setConversation] = useState([]);
  // For status messages
  const [status, setStatus] = useState("");

  // For sending a new message
  const [newSelectedBackend, setNewSelectedBackend] = useState(0);
  const [newPhoneNumber, setNewPhoneNumber] = useState("");
  const [newMessage, setNewMessage] = useState("");

  // Controls whether we're showing the "Send Message" form
  const [showNewForm, setShowNewForm] = useState(false);

  /**
   * Load the unified inbox from all userBackends.
   */
  async function loadInbox() {
    try {
      const results = await Promise.all(
        userBackends.map(async (b, index) => {
          const r = await fetch(`${b.base_url}/messages`);
          if (!r.ok) throw new Error(await r.text());
          const data = await r.json();
          // Each item: { phoneNumber, snippet, timestamp, unread, fromYou }
          return data.map((item) => ({
            ...item,
            backendIndex: index,
            backendUrl: b.base_url,
          }));
        })
      );
      setPreviews(results.flat());
    } catch (err) {
      console.error("Inbox error:", err.message);
    }
  }

  // Initially + refresh every 5s
  useEffect(() => {
    if (!userBackends?.length) return;
    loadInbox();
    const id = setInterval(loadInbox, 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userBackends]);

  // Load selected conversation every 5s
  useEffect(() => {
    if (!selectedPhone || selectedBackendIndex == null) {
      setConversation([]);
      return;
    }
    async function loadConversation() {
      try {
        const chosenBackend = userBackends[selectedBackendIndex];
        if (!chosenBackend) return;
        const r = await fetch(
          `${chosenBackend.base_url}/conversation?phone=${encodeURIComponent(
            selectedPhone
          )}`
        );
        if (!r.ok) throw new Error(await r.text());
        const data = await r.json();
        setConversation(data);
      } catch (err) {
        console.error("Conversation error:", err.message);
      }
    }
    loadConversation();
    const id = setInterval(loadConversation, 5000);
    return () => clearInterval(id);
  }, [selectedPhone, selectedBackendIndex, userBackends]);

  /**
   * Send a brand-new message.
   */
  async function handleSendNew() {
    setStatus("Sending new message...");
    try {
      const chosen = userBackends[newSelectedBackend];
      if (!chosen) throw new Error("Invalid backend index");

      const res = await fetch(`${chosen.base_url}/send-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: newPhoneNumber,
          text: newMessage,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const responseText = await res.text();
      setStatus(responseText);
      setNewPhoneNumber("");
      setNewMessage("");
    } catch (err) {
      setStatus("Error: " + err.message);
    }
  }

  // If user has no backends, show a simple message
  if (!userBackends?.length) {
    return (
      <div className="p-6">
        <Heading>No backends found for your account.</Heading>
        <Text>
          Please add rows to your <code>backends</code> table or create a UI to do
          so.
        </Text>
      </div>
    );
  }

  // If the user selects a preview, close the "send new" form if open
  function selectPreview(phone, backendIndex) {
    setSelectedPhone(phone);
    setSelectedBackendIndex(backendIndex);
    setStatus("");
    setShowNewForm(false);
  }

  return (
    <div className="px-6 py-4 h-full w-full flex gap-6">
      {/* LEFT COLUMN: Unified Inbox */}
      <div className="w-80 flex-shrink-0">
        {/* Header row: "Unified Inbox" + "Send Message" button aligned right */}
        <div className="flex items-center justify-between mb-4">
          <Heading level={3} className="!m-0">
            Unified Inbox
          </Heading>
          <Button
            color="cyan"
            onClick={() => {
              // Clear conversation
              setSelectedPhone("");
              setSelectedBackendIndex(null);
              setShowNewForm(true);
              setStatus("");
            }}
          >
            Send Message
          </Button>
        </div>

        {/* Scrollable preview list */}
        <div
          className="flex flex-col gap-3 max-h-[calc(100vh-200px)] overflow-y-auto pr-1"
          style={{
            // Make scrollbar narrower and color it to blend in
            scrollbarWidth: "thin",        // Firefox
            scrollbarColor: "#666 #2f2f2f" // (thumb color) (track color)
          }}
        >
          {previews.map((p, idx) => {
            const isActive =
              p.phoneNumber === selectedPhone &&
              p.backendIndex === selectedBackendIndex;
            return (
              <div
                key={idx}
                className={`border rounded p-4 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                  isActive
                    ? "border-blue-500 bg-zinc-50 dark:bg-zinc-800"
                    : "border-zinc-200 dark:border-zinc-700"
                }`}
                onClick={() => selectPreview(p.phoneNumber, p.backendIndex)}
              >
                <Text className="text-sm font-medium !m-0">
                  From: {p.phoneNumber}
                </Text>
                <Text
                  className={`!mt-1 ${
                    p.unread ? "font-bold" : "font-normal"
                  } break-words`}
                >
                  {p.snippet} {p.fromYou && "(You)"}
                </Text>
                <Text className="text-xs text-zinc-500 !mt-1 !mb-0">
                  {p.timestamp}
                </Text>
                <Text className="text-xs text-zinc-500 !m-0">
                  [Backend #{p.backendIndex}]
                </Text>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT COLUMN: Either the conversation or the "Send new" form */}
      <div className="flex-1">
        {showNewForm ? (
          // --------------- "Send New Message" form ---------------
          <>
            <Heading level={3}>Send a brand-new message</Heading>
            <Fieldset className="mt-4 space-y-3">
              <FieldGroup>
                <Field>
                  <Label>Backend</Label>
                  <select
                    className="mt-1 block w-full rounded border border-zinc-300 bg-white dark:bg-zinc-800 dark:border-zinc-700 text-sm p-2"
                    value={newSelectedBackend}
                    onChange={(e) => setNewSelectedBackend(Number(e.target.value))}
                  >
                    {userBackends.map((b, i) => (
                      <option key={b.id} value={i}>
                        Backend #{i} - {b.base_url}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field>
                  <Label>Phone</Label>
                  <Input
                    className="mt-1 w-full"
                    value={newPhoneNumber}
                    onChange={(e) => setNewPhoneNumber(e.target.value)}
                  />
                </Field>
                <Field>
                  <Label>Message</Label>
                  <Textarea
                    className="mt-1 w-full"
                    rows={5}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                  />
                </Field>
              </FieldGroup>
            </Fieldset>

            <Button
              color="cyan"
              className="mt-3"
              onClick={handleSendNew}
            >
              Send Message
            </Button>
            {status && (
              <Text className="mt-2 text-sm text-rose-600 dark:text-rose-400">
                {status}
              </Text>
            )}
          </>
        ) : selectedPhone && selectedBackendIndex != null ? (
          // --------------- Conversation Display ---------------
          <>
            <Heading level={3}>
              Conversation with {selectedPhone} (Backend #{selectedBackendIndex})
            </Heading>
            {conversation.length === 0 ? (
              <Text className="mt-3">No messages yet.</Text>
            ) : (
              <div className="mt-3 space-y-3">
                {conversation.map((msg, i) => (
                  <div
                    key={i}
                    className="p-3 rounded bg-zinc-100 dark:bg-zinc-800"
                  >
                    <Text className="text-xs text-zinc-500 !mt-0 !mb-1">
                      {msg.from} ({msg.time})
                    </Text>
                    <Text className="whitespace-pre-wrap !m-0">{msg.text}</Text>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          // --------------- Prompt to select a conversation ---------------
          <Heading level={3}>Select a conversation.</Heading>
        )}
      </div>
    </div>
  );
}
