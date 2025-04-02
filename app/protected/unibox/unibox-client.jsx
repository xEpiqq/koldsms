"use client";

import React, { useState, useEffect } from "react";

// userBackends: an array of objects like:
//   { id: number, base_url: string, created_at: string, ... }
export default function UniboxClient({ userBackends }) {
  // "previews" is our unified inbox array
  const [previews, setPreviews] = useState([]);

  // Which conversation is open?
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

  /**
   * Load the unified inbox from all userBackends.
   */
  async function loadInbox() {
    try {
      // For each backend, fetch /messages
      const results = await Promise.all(
        userBackends.map(async (b, index) => {
          const r = await fetch(`${b.base_url}/messages`);
          if (!r.ok) throw new Error(await r.text());
          const data = await r.json();
          // data is an array of { phoneNumber, snippet, timestamp, unread, fromYou }
          // Attach the "backendIndex" so we know which server it belongs to
          return data.map((item) => ({
            ...item,
            backendIndex: index,
            backendUrl: b.base_url,
          }));
        })
      );
      // Flatten into a single array
      const combined = results.flat();
      setPreviews(combined);
    } catch (err) {
      console.error("Inbox error:", err.message);
    }
  }

  /**
   * On mount, and every 5s, load the inbox.
   */
  useEffect(() => {
    if (!userBackends || userBackends.length === 0) return;
    loadInbox();
    const id = setInterval(loadInbox, 5000);
    return () => clearInterval(id);
  }, [userBackends]);

  /**
   * If the user selects a phone + backend,
   * we load the conversation from that backend.
   */
  useEffect(() => {
    if (!selectedPhone || selectedBackendIndex === null) {
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
   * Send a brand-new message using the unified /send-message endpoint.
   */
  async function handleSendNew() {
    setStatus("Sending new message...");
    try {
      const backendIndex = newSelectedBackend;
      const chosen = userBackends[backendIndex];
      if (!chosen) throw new Error("Invalid backend index");

      const res = await fetch(`${chosen.base_url}/send-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: newPhoneNumber, text: newMessage }),
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
  if (!userBackends || userBackends.length === 0) {
    return (
      <div style={{ padding: 16 }}>
        <h2>No backends found for your account.</h2>
        <p>Add rows to your <code>backends</code> table or create a UI to do so.</p>
      </div>
    );
  }

  /**
   * RENDER
   */
  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "sans-serif" }}>
      {/* LEFT SIDE: Unified Inbox + "Send New Message" */}
      <div style={{ width: 300, borderRight: "1px solid #ccc", padding: 16 }}>
        <h2>Unified Inbox</h2>
        {previews.map((p, idx) => (
          <div
            key={idx}
            style={{
              marginBottom: 8,
              padding: 8,
              border: "1px solid #ddd",
              cursor: "pointer",
              fontWeight: p.unread ? "bold" : "normal",
            }}
            onClick={() => {
              setSelectedPhone(p.phoneNumber);
              setSelectedBackendIndex(p.backendIndex);
              setStatus("");
            }}
          >
            <div>
              <strong>From:</strong> {p.phoneNumber}
            </div>
            <div>
              {p.snippet} {p.fromYou && "(You)"}
            </div>
            <div style={{ fontSize: "0.8em", color: "#666" }}>
              {p.timestamp}
            </div>
            <div style={{ fontSize: "0.8em", color: "#999" }}>
              [Backend #{p.backendIndex}]
            </div>
          </div>
        ))}

        <h3 style={{ marginTop: 20 }}>Send New Message</h3>
        <label>Backend:</label>
        <select
          style={{ width: "100%", marginBottom: 8 }}
          value={newSelectedBackend}
          onChange={(e) => setNewSelectedBackend(Number(e.target.value))}
        >
          {userBackends.map((b, i) => (
            <option key={b.id} value={i}>
              Backend #{i} - {b.base_url}
            </option>
          ))}
        </select>

        <label>Phone:</label>
        <input
          style={{ width: "100%", marginBottom: 8 }}
          value={newPhoneNumber}
          onChange={(e) => setNewPhoneNumber(e.target.value)}
        />
        <label>Message:</label>
        <textarea
          style={{ width: "100%", marginBottom: 8 }}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
        />
        <button onClick={handleSendNew} style={{ width: "100%" }}>
          Send
        </button>
        <p>{status}</p>
      </div>

      {/* RIGHT SIDE: Conversation display */}
      <div style={{ flex: 1, padding: 16, overflowY: "auto" }}>
        {selectedPhone && selectedBackendIndex !== null ? (
          <>
            <h2>
              Conversation with {selectedPhone} (Backend #{selectedBackendIndex})
            </h2>
            {conversation.length === 0 ? (
              <p>No messages yet.</p>
            ) : (
              conversation.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    marginBottom: 8,
                    textAlign: msg.direction === "outgoing" ? "right" : "left",
                  }}
                >
                  <div
                    style={{
                      display: "inline-block",
                      background: msg.direction === "outgoing" ? "#daf0ff" : "#eee",
                      padding: 8,
                      borderRadius: 6,
                    }}
                  >
                    <div style={{ fontWeight: "bold", fontSize: 12 }}>
                      {msg.from} ({msg.time})
                    </div>
                    <div>{msg.text}</div>
                  </div>
                </div>
              ))
            )}
          </>
        ) : (
          <h2>Select a conversation.</h2>
        )}
      </div>
    </div>
  );
}
