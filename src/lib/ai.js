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

export async function getDealCoaching(deal) {
  const prompt = `Hãy đóng vai một chuyên gia tư vấn sales chiến lược cấp cao. 
Phân tích deal sau đây và đưa ra lời khuyên thực tế để tăng xác suất chốt sales:
- Deal: ${deal.name}
- Tài khoản: ${deal.accounts?.name || 'Chưa xác định'}
- Sản phẩm: ${deal.product || 'Chưa xác định'}
- Giá trị: ${deal.value} VND
- Giai đoạn: ${deal.stage}
- Xác suất hiện tại: ${deal.probability}%
- Ngày đóng dự kiến: ${deal.expected_close || 'Chưa xác định'}
- Ghi chú: ${deal.notes || 'Không có'}

Hãy đưa ra 3 hành động cụ thể và một nhận xét về rủi ro tiềm ẩn. Trả lời bằng tiếng Việt, súc tích, chuyên nghiệp.`;

  return callAISalesCoach(prompt, { deal });
}

export const chatWithCoach = callAISalesCoach;
