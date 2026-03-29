export async function callAISalesCoach(message, context = {}) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      account: context.account || null,
      deal: context.deal || null,
      competitor: context.competitor || null,
      conversationHistory: context.history || []
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.reply;
}
