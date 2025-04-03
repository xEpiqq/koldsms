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
  const [previews, setPreviews] = useState([]);
  const [selectedPhone, setSelectedPhone] = useState("");
  const [selectedBackendIndex, setSelectedBackendIndex] = useState("");
  const [conversation, setConversation] = useState([]);
  const [status, setStatus] = useState("");

  const [newSelectedBackend, setNewSelectedBackend] = useState(0);
  const [newPhoneNumber, setNewPhoneNumber] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);

  // Indicates whether conversation has loaded at least once for the current phone/backend
  const [conversationHasLoaded, setConversationHasLoaded] = useState(false);
  // Show skeleton if !conversationHasLoaded when we first do the load
  const [loadingConv, setLoadingConv] = useState(false);

  /**
   * Loads the unified inbox from all userBackends, sorts to float unresponded
   * messages (where !fromYou && unread) to top.
   */
  async function loadInbox() {
    try {
      // 1. Fetch from each backend
      const results = await Promise.all(
        userBackends.map(async (b, index) => {
          const r = await fetch(`${b.base_url}/messages`);
          if (!r.ok) throw new Error(await r.text());
          const data = await r.json();
          // Each item might look like: { phoneNumber, snippet, timestamp, unread, fromYou, ... }
          return data.map((item) => ({
            ...item,
            backendIndex: index,
            backendUrl: b.base_url,
          }));
        })
      );

      // 2. Flatten
      const flattened = results.flat();

      // 3. Sort so unresponded => top
      const sorted = flattened.sort((a, b) => {
        const aIsUnresp = !a.fromYou && a.unread ? 1 : 0;
        const bIsUnresp = !b.fromYou && b.unread ? 1 : 0;
        return bIsUnresp - aIsUnresp; // descending
      });

      setPreviews(sorted);
    } catch (err) {
      console.error("Inbox error:", err.message);
    }
  }

  // Load inbox on mount + refresh every 5s
  useEffect(() => {
    if (!userBackends?.length) return;
    loadInbox();
    const id = setInterval(loadInbox, 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userBackends]);

  /**
   * If we have a selected conversation, load it every 5s.
   * We only show skeleton if conversationHasLoaded == false.
   */
  useEffect(() => {
    if (!selectedPhone || selectedBackendIndex == null) {
      setConversation([]);
      return;
    }

    async function loadConversation() {
      // Only show skeleton if this conversation hasn't loaded yet
      if (!conversationHasLoaded) {
        setLoadingConv(true);
      }
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

        // Now that we have data, mark that it loaded once
        if (!conversationHasLoaded) {
          setConversationHasLoaded(true);
        }
      } catch (err) {
        console.error("Conversation error:", err.message);
      } finally {
        setLoadingConv(false);
      }
    }
    loadConversation();

    const id = setInterval(loadConversation, 5000);
    return () => clearInterval(id);
  }, [
    selectedPhone,
    selectedBackendIndex,
    userBackends,
    conversationHasLoaded,
  ]);

  /**
   * Send a brand-new message
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

  // If user has no backends => simple message
  if (!userBackends?.length) {
    return (
      <div className="p-6 h-screen overflow-hidden">
        <Heading>No backends found for your account.</Heading>
        <Text>
          Please add rows to your <code>backends</code> table or create a UI to
          do so.
        </Text>
      </div>
    );
  }

  /**
   * On selecting a preview => reset conversationHasLoaded, so that we
   * show skeleton again if user picks a different conversation.
   */
  function selectPreview(phone, backendIndex) {
    setSelectedPhone(phone);
    setSelectedBackendIndex(backendIndex);
    setStatus("");
    setShowNewForm(false);

    // Reset so next load triggers skeleton again
    setConversationHasLoaded(false);
    setConversation([]);
  }

  return (
    // Full screen height, hidden overflow => no page scrollbar
    <div className="h-screen overflow-hidden flex">
      {/* LEFT column: The inbox */}
      <div className="w-80 flex-shrink-0 border-r border-zinc-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <Heading level={3} className="!m-0">
            Unified Inbox
          </Heading>
          <Button
            color="cyan"
            onClick={() => {
              setSelectedPhone("");
              setSelectedBackendIndex(null);
              setShowNewForm(true);
              setStatus("");
            }}
          >
            Send Message
          </Button>
        </div>

        <div
          className="flex flex-col gap-3 h-[calc(100vh-100px)] overflow-y-auto pr-1"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "#666 #2f2f2f",
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
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT column: conversation area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {showNewForm ? (
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

              <Button color="cyan" className="mt-3" onClick={handleSendNew}>
                Send Message
              </Button>
              {status && (
                <Text className="mt-2 text-sm text-rose-600 dark:text-rose-400">
                  {status}
                </Text>
              )}
            </>
          ) : selectedPhone && selectedBackendIndex != null ? (
            <>
              <Heading level={3}>Conversation with {selectedPhone}</Heading>

              {loadingConv ? (
                <ConversationSkeleton />
              ) : conversation.length === 0 ? (
                <Text className="mt-3">No messages yet.</Text>
              ) : (
                <div className="mt-3 space-y-3">
                  {conversation.map((msg, i) => {
                    const isFromMe = msg.direction === "outgoing";
                    return (
                      <div
                        key={i}
                        className={`flex mb-2 ${
                          isFromMe ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`flex flex-col ${
                            isFromMe ? "items-end" : "items-start"
                          }`}
                        >
                          <div
                            className={`inline-block px-3 py-2 max-w-[80%] whitespace-pre-wrap break-words rounded-lg ${
                              isFromMe
                                ? "bg-cyan-100 text-black"
                                : "bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white"
                            }`}
                          >
                            {msg.text}
                          </div>
                          <div className="text-xs text-zinc-500 mt-1">
                            {msg.time}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <Heading level={3}>Select a conversation.</Heading>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Shows 2-line skeleton: first from me (right), then from them (left).
 */
function ConversationSkeleton() {
  // We'll define an array [true => me, false => them]
  const layout = [true, false];

  return (
    <div className="mt-3 space-y-3">
      {layout.map((isMe, i) => (
        <div
          key={i}
          className={`flex ${isMe ? "justify-end" : "justify-start"} mb-2 animate-pulse`}
        >
          <div className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
            {/* Bubble */}
            <div
              className={`inline-block px-3 py-2 max-w-[80%] rounded-lg
                ${
                  isMe
                    ? "bg-cyan-200"
                    : "bg-zinc-200 dark:bg-zinc-700"
                }`}
            >
              <div className="h-3 w-24" />
            </div>
            {/* Time placeholder */}
            <div className="text-xs text-zinc-500 mt-1">
              <div className="h-2 w-10 bg-zinc-300 dark:bg-zinc-600 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
