"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Inbox, Zap, Rocket, Search, Menu } from "lucide-react";

// Dummy SMS conversation data (replacing emails with random phone numbers)
const initialConversations = [
  {
    id: "1",
    from: "(686) 335-3259",
    subject: "Re: 71% of active real estate agents did not sell a house last year",
    preview: "-- Kathy J Loeckle Realtor Exit Realty Mason City 2401 S. F...",
    date: "Mar 20, 2025",
    messages: [
      {
        sender: "(975) 240-9056",
        text: "Hey there, just checking in about the market details we discussed.",
        date: "Mar 20, 2025",
      },
      {
        sender: "You",
        text: "Thanks for the follow-up! I'd love to hear more data soon.",
        date: "Mar 20, 2025",
      },
    ],
  },
  {
    id: "2",
    from: "747-854-0652",
    subject: "Re: john, its zach, do you do real estate partnerships?",
    preview: "I'm no longer in the industry – John Haley 214-564-6780 ...",
    date: "Mar 18, 2025",
    messages: [
      {
        sender: "653-227-9901",
        text: "I'm no longer in the industry. Let me know if you have any questions though.",
        date: "Mar 18, 2025",
      },
      {
        sender: "You",
        text: "Thanks for letting me know! All the best.",
        date: "Mar 18, 2025",
      },
    ],
  },
  {
    id: "3",
    from: "218-355-7681",
    subject: "Re: sesi are you still a life coach?",
    preview: "Hello Zach, Thank you for your interest. I am still a life c...",
    date: "Mar 17, 2025",
    messages: [
      {
        sender: "609-445-2300",
        text: "Hello Zach, Thanks for reaching out. I'm definitely still offering sessions!",
        date: "Mar 17, 2025",
      },
      {
        sender: "You",
        text: "Great to hear! I'll schedule something soon.",
        date: "Mar 17, 2025",
      },
    ],
  },
  {
    id: "4",
    from: "313-678-0099",
    subject: "Re: jeremy, its zach, do you do real estate partnerships?",
    preview: "Zach, Thanks for reaching out. I'm not interested at this t...",
    date: "Mar 17, 2025",
    messages: [
      {
        sender: "726-889-3311",
        text: "Zach, thanks for contacting me. I'm not interested at this time, but let's keep in touch.",
        date: "Mar 17, 2025",
      },
      {
        sender: "You",
        text: "Understood, Jeremy. Will do.",
        date: "Mar 17, 2025",
      },
    ],
  },
];

export default function ChatPage() {
  // Retrieve the conversationId from the query string
  const searchParams = useSearchParams();
  const conversationId = searchParams.get("conversationId") || "";

  // Keep conversations in local state for ephemeral updates
  const [conversations, setConversations] = useState(initialConversations);

  // Find the selected conversation in state
  const selectedConversation = conversations.find((c) => c.id === conversationId);

  // Chat input
  const [newMessage, setNewMessage] = useState("");

  // Handle sending a new message
  const handleSendMessage = () => {
    if (!selectedConversation || !newMessage.trim()) return;

    // Update the messages array for the selected conversation
    const updatedConversations = conversations.map((conv) => {
      if (conv.id === conversationId) {
        return {
          ...conv,
          messages: [
            ...conv.messages,
            {
              sender: "You",
              text: newMessage.trim(),
              date: new Date().toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              }),
            },
          ],
        };
      }
      return conv;
    });

    setConversations(updatedConversations);
    setNewMessage(""); // Clear the chat box
  };

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* LEFT SIDEBAR (Icons) */}
      <aside className="hidden sm:flex flex-col items-center bg-white border-r w-16 py-4">
        <div className="mb-6 font-bold text-blue-600 text-sm">Unibox</div>
        <button className="mb-6 text-gray-500 hover:text-blue-500">
          <Search size={20} />
        </button>
        <button className="mb-6 text-gray-500 hover:text-blue-500">
          <Zap size={20} />
        </button>
        <button className="mb-6 text-gray-500 hover:text-blue-500">
          <Rocket size={20} />
        </button>
        <button className="text-gray-500 hover:text-blue-500">
          <Menu size={20} />
        </button>
      </aside>

      {/* MIDDLE SIDEBAR (Inbox Navigation) */}
      <nav className="flex flex-col bg-white border-r w-60 max-w-xs">
        <div className="px-4 py-4 border-b flex items-center">
          <span className="text-lg font-bold">Unibox</span>
        </div>

        {/* Nav Links */}
        <div className="flex flex-col p-4 space-y-2">
          <a href="#" className="text-sm text-gray-600 hover:text-black">
            Status
          </a>
          <a href="#" className="text-sm text-gray-600 hover:text-black">
            All Campaigns
          </a>
          <a href="#" className="text-sm text-gray-600 hover:text-black">
            All Inboxes
          </a>
          <a href="#" className="text-sm text-gray-600 hover:text-black">
            More
          </a>
        </div>

        {/* Divider */}
        <div className="mt-2 border-t" />

        {/* Tabs (Primary / Others) + Search */}
        <div className="p-4 flex flex-col gap-4">
          <div className="flex gap-4 text-sm">
            <a href="#" className="border-b-2 border-black pb-1 text-black font-medium">
              Primary
            </a>
            <a href="#" className="text-gray-500 pb-1">
              Others
            </a>
          </div>
          <div>
            <input
              type="search"
              placeholder="Search mail"
              className="w-full border rounded p-2 text-sm"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="overflow-auto">
          {conversations.map((conv) => (
            <a
              key={conv.id}
              href={`?conversationId=${conv.id}`}
              className={`block px-4 py-3 border-b hover:bg-gray-50 ${
                conv.id === conversationId ? "bg-gray-100" : ""
              }`}
            >
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{conv.from}</span>
                <span>{conv.date}</span>
              </div>
              <div className="text-sm font-medium text-gray-800 line-clamp-1">
                {conv.subject}
              </div>
              <div className="text-xs text-gray-500 truncate">{conv.preview}</div>
            </a>
          ))}
        </div>
      </nav>

      {/* MAIN CONTENT (Selected Conversation or Placeholder) */}
      <main className="flex-1 bg-gray-50 flex flex-col">
        {!selectedConversation && (
          <div className="flex-1 flex flex-col justify-center items-center text-gray-300">
            <Inbox size={64} />
            <p className="mt-2 text-gray-500">Select a conversation</p>
          </div>
        )}

        {selectedConversation && (
          <>
            <div className="p-4 border-b bg-white">
              <h2 className="text-lg font-semibold text-gray-800">
                {selectedConversation.subject}
              </h2>
              <p className="text-sm text-gray-500">From: {selectedConversation.from}</p>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-4">
              {selectedConversation.messages.map((msg, idx) => (
                <div key={idx} className="bg-white p-3 rounded shadow-sm">
                  <div className="text-xs text-gray-500">
                    {msg.sender} – {msg.date}
                  </div>
                  <p className="text-sm text-gray-800">{msg.text}</p>
                </div>
              ))}
            </div>
            {/* Chat box at the bottom */}
            <div className="border-t bg-white p-3 flex">
              <input
                type="text"
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 border rounded p-2 text-sm mr-2"
              />
              <button
                onClick={handleSendMessage}
                className="bg-blue-600 text-white text-sm py-2 px-4 rounded hover:bg-blue-700"
              >
                Send
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
