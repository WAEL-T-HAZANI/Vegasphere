const { generateSmartReplies } = require("../services/ai-local-engine.js");

const msgs = [
  { sender: "them", text: "hi" },
  { sender: "me", text: "Hey! You made my notification sound happy 😄" },
  { sender: "them", text: "Hey!" },
  { sender: "me", text: "Sup! Living the dream… mostly" },
  { sender: "them", text: "Hello! How's it going?" },
];

const r = generateSmartReplies({ messages: msgs, language: "en" });
console.log(JSON.stringify(r, null, 2));
