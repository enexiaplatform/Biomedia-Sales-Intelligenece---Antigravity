import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY
});

const SYSTEM_PROMPT = `You are a data parser for a B2B sales CRM used in Vietnam's pharma and F&B manufacturing industry.
Analyze the input and return a JSON object with:
{
  "detected_type": one of ["contact", "account", "deal", "interaction", "competitor", "market_segment"],
  "confidence": "high" | "medium" | "low",
  "suggested_module": one of ["Contacts", "Accounts", "Pipeline", "Interactions", "Competitors", "Market Map"],
  "suggested_route": one of ["/accounts", "/pipeline", "/competitors", "/market-map"],
  "reason": "short Vietnamese explanation of why",
  "extracted_data": {
    // For contact: { name, email, title, phone, account_id (null if unknown) }
    // For account: { name, type, region, address, phone }
    // For deal: { name, account_id (null), value, stage, notes }
    // For interaction: { type, title, notes, date }
    // For competitor: { name, strengths, weaknesses, market_share }
  }
}
Return ONLY valid JSON. No markdown, no explanation outside the JSON.`;

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

  const { content } = req.body; // content can be string or an array for multimodal

  if (!content) {
    return res.status(400).json({ error: "Content là bắt buộc" });
  }

  try {
    const response = await client.messages.create({
      model: "claude-3-5-sonnet-20240620", // using 3.5 sonnet for better json extraction
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: content
        }
      ]
    });

    let reply = response.content[0]?.text || "";
    
    // Attempt to sanitize if Claude includes markdown formatting
    if (reply.startsWith("```json")) {
      reply = reply.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (reply.startsWith("```")) {
      reply = reply.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    let parsedResult = null;
    try {
      parsedResult = JSON.parse(reply);
    } catch (e) {
      console.error("Failed to parse JSON from Claude:", reply);
      return res.status(500).json({ error: "Không thể nhận dạng JSON hợp lệ từ AI.", raw: reply });
    }

    return res.status(200).json({ result: parsedResult });
  } catch (error) {
    console.error("Claude API error:", error);

    if (error.status === 401) {
      return res.status(500).json({ error: "API key không hợp lệ." });
    }
    if (error.status === 429) {
      return res.status(429).json({ error: "Quá nhiều yêu cầu. Vui lòng thử lại sau." });
    }

    return res.status(500).json({ error: error.message || "Lỗi server nội bộ" });
  }
}
