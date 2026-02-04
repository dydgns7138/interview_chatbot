// 추가 피드백 생성 API
import { NextRequest } from "next/server";
import { z } from "zod";

export const runtime = "edge";

const BodySchema = z.object({
  evaluationText: z.string(),
  recentMessages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string(),
  })).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { evaluationText, recentMessages } = BodySchema.parse(body);

    const OPENAI_API_KEY = process.env['OPENAI_API_KEY'];
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "API key not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 전체 대화 로그에서 참여자(user) 답변만 추출
    const userMessages = recentMessages?.filter(m => m.role === "user").map(m => m.content) || [];
    
    // 최근 대화 로그 전체 (면접관 질문과 참여자 답변 쌍)
    const fullConversation = recentMessages?.map(m => 
      `${m.role === "assistant" ? "면접관" : "나"}: ${m.content}`
    ).join("\n\n") || "";

    const prompt = `면접 평가 결과와 참여자의 실제 답변을 바탕으로 친근한 반말 톤으로 상세하고 구체적인 추가 피드백을 작성해줘.

**요구사항:**
- 길이: 각 섹션당 2-4문장으로 충분히 자세하게 작성 (전체 6-12문장)
- 말투: 친근한 반말 ("~하게 답변했는데", "~라고 하면 더 면접관 앞에서 자신감이 있을 것 같아", "~해보자")
- 비난 금지, 격려와 실천 팁 중심
- **중요:** 참여자의 실제 답변 내용을 구체적으로 언급하며 피드백 작성
  - 각 질문에 대한 답변을 분석하여 구체적인 예시를 들어 설명
  - 예: "자기소개에서 '저는 ~~입니다'라고 답변했는데, '저는 ~~를 잘할 수 있어서 이 일에 지원했습니다'라고 하면 더 면접관 앞에서 자신감이 있을 것 같아"
  - 예: "'~~ 질문에 ~~라고 답한 점이 좋았어. 특히 ~~ 부분이 인상적이었어. 다음엔 ~~도 추가하면 더 완벽할 것 같아"
- 아래 형식으로 서식 적용 (각 섹션을 충분히 자세하게):
  - **좋았던 점:** (참여자 답변 구체적 언급, 2-4문장)
    - 어떤 질문에 어떻게 답했는지 구체적으로 언급
    - 그 답변이 왜 좋았는지 설명
  - **더 좋아질 점:** (참여자 답변 기반 개선 제안, 2-4문장)
    - 어떤 부분을 어떻게 개선하면 좋을지 구체적으로 제안
    - 예시 답변 포함
  - **다음엔 이렇게 해보자:** (참여자 답변 패턴 기반 실천 팁, 2-4문장)
    - 구체적인 실천 방법 제시
    - 면접에서 바로 적용할 수 있는 팁 제공

**면접 평가:**
${evaluationText}

**전체 대화 내역:**
${fullConversation || "대화 내역 없음"}

위 평가와 참여자의 실제 답변을 바탕으로, 각 질문에 대한 답변을 구체적으로 분석하고 언급하며 친근하고 실용적인 피드백을 마크다운 형식으로 작성해줘. 원문 평가를 반복하지 말고, 참여자의 답변 패턴과 내용을 상세히 분석하여 의미있고 구체적인 피드백을 제공해줘.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "당신은 면접 코치입니다. 친근한 반말 톤으로 실용적인 피드백을 제공합니다.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("OpenAI API error:", error);
      return new Response(JSON.stringify({ error: "Failed to generate feedback" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const feedbackText = data.choices[0]?.message?.content || "";

    return new Response(JSON.stringify({ feedback: feedbackText }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Feedback API error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
