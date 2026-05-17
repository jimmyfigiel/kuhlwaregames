// /src/games/famous-baseball/panels/ChatPanel.jsx

import React, { useState } from "react";

function getPlayerName(player) {
  return player?.displayName || player?.name || player?.id || "Player";
}

function formatTime(timestamp) {
  if (!timestamp) return "";

  try {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function ChatPanel({ room, player, updateRoomData }) {
  const [messageText, setMessageText] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const chatMessages = Array.isArray(room?.gameChat) ? room.gameChat : [];

  async function sendMessage(textToSend = messageText) {
    const cleanText = String(textToSend || "").trim();

    if (!cleanText) {
      return;
    }

    if (!updateRoomData) {
      setStatusMessage("Chat is not connected.");
      return;
    }

    const nextMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      playerId: player.id,
      playerName: getPlayerName(player),
      text: cleanText,
      createdAt: Date.now(),
    };

    const nextChatMessages = [...chatMessages, nextMessage].slice(-50);

    try {
      await updateRoomData({
        gameChat: nextChatMessages,
      });

      setMessageText("");
      setStatusMessage("");
    } catch (error) {
      console.error(error);
      setStatusMessage(`Could not send chat: ${error.message}`);
    }
  }

  const quickMessages = [
    "Need a minute.",
    "I'm ready.",
    "Nice play!",
    "You're going down.",
  ];

  return (
    <section className="fbb-card">
      <div className="fbb-log-title">Game Chat</div>

      <div className="fbb-button-row" style={{ marginBottom: "10px" }}>
        {quickMessages.map((quickMessage) => (
          <button
            key={quickMessage}
            type="button"
            onClick={() => sendMessage(quickMessage)}
          >
            {quickMessage}
          </button>
        ))}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          sendMessage();
        }}
      >
        <input
          className="fbb-input"
          type="text"
          placeholder="Send a message..."
          value={messageText}
          onChange={(event) => setMessageText(event.target.value)}
        />

        <button type="submit">Send Chat</button>
      </form>

      {statusMessage && <p className="message">{statusMessage}</p>}

      <div style={{ marginTop: "12px" }}>
        {chatMessages.length === 0 ? (
          <div>No chat messages yet.</div>
        ) : (
          chatMessages
            .slice()
            .reverse()
            .map((chatMessage) => (
              <div
                key={chatMessage.id}
                className="fbb-log-entry"
              >
                <div className="fbb-log-entry-title">
                  {chatMessage.playerName || "Player"}{" "}
                  <span style={{ fontWeight: "400", opacity: 0.7 }}>
                    {formatTime(chatMessage.createdAt)}
                  </span>
                </div>

                <div className="fbb-log-entry-detail">
                  {chatMessage.text}
                </div>
              </div>
            ))
        )}
      </div>
    </section>
  );
}