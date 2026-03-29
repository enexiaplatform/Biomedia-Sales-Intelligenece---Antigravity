import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY
});

const SYSTEM_PROMPT = `You are an expert AI Sales Coach specializing in Life Science and Pharma QC in the Vietnam market. You support Henry, Sales Manager at Biomedia Group, with the following tasks: analyzing accounts, suggesting deal strategies, preparing for meetings, analyzing competitors, and advising on product workflows for customers in Pharma and F&B. Provide concise, strategic, and actionable responses. Prioritize practical insights over generic theory. When provided with account, deal, or competitor context, use that data in your analysis. Respond in Vietnamese unless asked otherwise. Keep responses to 2-3 paragraphs max for brevity.`;

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.CLAUDE_API_KEY) {
    return res.status(500).json({ error: "CLAUDE_API_KEY chưa được cấu hình trên server." });
  }

  const { message, account, deal, competitor, conversationHistory } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message là bắt buộc" });
  }

  try {
    // Build context string from provided data
    let contextStr = "";

    if (account) {
      contextStr += `\n[Tài khoản đang xem: ${account.name}`;
      if (account.score) contextStr += ` (Điểm: ${account.score}/10)`;
      if (account.region) contextStr += `, Khu vực: ${account.region}`;
      if (account.type) contextStr += `, Loại: ${account.type}`;
      if (account.pain_points) contextStr += `, Điểm đau: ${account.pain_points}`;
      if (account.current_needs) contextStr += `, Nhu cầu: ${account.current_needs}`;
      contextStr += "]";
    }

    if (deal) {
      contextStr += `\n[Deal đang xem: ${deal.name}`;
      if (deal.value) contextStr += ` - Giá trị: ${Number(deal.value).toLocaleString("vi-VN")} VND`;
      if (deal.stage) contextStr += `, Giai đoạn: ${deal.stage}`;
      if (deal.probability != null) contextStr += `, Xác suất: ${deal.probability}%`;
      if (deal.product) contextStr += `, Sản phẩm: ${deal.product}`;
      contextStr += "]";
    }

    if (competitor) {
      contextStr += `\n[Đối thủ đang phân tích: ${competitor.name}`;
      if (competitor.market_share) contextStr += `, Thị phần: ${competitor.market_share}`;
      if (competitor.strengths) contextStr += `, Điểm mạnh: ${competitor.strengths}`;
      if (competitor.weaknesses) contextStr += `, Điểm yếu: ${competitor.weaknesses}`;
      contextStr += "]";
    }

    // Build messages array
    const messages = [
      ...(Array.isArray(conversationHistory) ? conversationHistory : []),
      {
        role: "user",
        content: contextStr ? `${contextStr}\n\n${message}` : message
      }
    ];

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages
    });

    const reply = response.content[0]?.text || "Không có phản hồi từ AI.";

    return res.status(200).json({ reply });
  } catch (error) {
    console.error("Claude API error:", error);

    if (error.status === 401) {
      return res.status(500).json({ error: "API key không hợp lệ. Vui lòng kiểm tra CLAUDE_API_KEY." });
    }
    if (error.status === 429) {
      return res.status(429).json({ error: "Quá nhiều yêu cầu. Vui lòng thử lại sau." });
    }

    return res.status(500).json({ error: error.message || "Lỗi server nội bộ" });
  }
}
