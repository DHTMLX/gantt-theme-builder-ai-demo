export const sessionMessagesByClient = new Map();
// saving user response history
export function getMessagesHistoryByClient(socketId, systemPrompt) {
   const existingHistory = sessionMessagesByClient.get(socketId);
   if(existingHistory) {
      trimHistory(existingHistory);
      return existingHistory;
   }

   const newHistory = [
    {
      role: "assistant",
      content: systemPrompt,
    },
  ];

  sessionMessagesByClient.set(socketId, newHistory);
  return newHistory;
}

function trimHistory(messageHistory, maxPairs = 20) {
  const maxLength = 1 + maxPairs * 2;
  if (messageHistory.length > maxLength) {
    const systemMessage = messageHistory[0];
    const lastMessages = messageHistory.slice(-maxPairs * 2);
    messageHistory.length = 0;
    messageHistory.push(systemMessage, ...lastMessages);
  }
}