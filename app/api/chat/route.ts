// 스트리밍 챗 컴플리션 API (Edge 런타임)
// - Zod로 요청 바디 검증
// - OpenAI Chat Completions(gpt-4o-mini)을 stream: true 로 호출
// - SSE 라인을 파싱해 토큰을 텍스트 스트림으로 클라이언트에 전달
// - 환경 변수: OPENAI_API_KEY 필요
import { NextRequest } from "next/server";
import { z } from "zod";
import { JOB_INTERVIEW_PROMPTS } from "@/lib/job-interview-prompts";

export const runtime = "edge";

const BodySchema = z.object({
  message: z.string().min(1).max(2000),
  jobId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response("OPENAI_API_KEY missing", { status: 500 });
  }
  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    return new Response("잘못된 요청", { status: 400 });
  }

  // 직무별 시스템 프롬프트 선택
  const jobId = body.jobId as keyof typeof JOB_INTERVIEW_PROMPTS;
  const jobPrompt = jobId && JOB_INTERVIEW_PROMPTS[jobId] 
    ? JOB_INTERVIEW_PROMPTS[jobId].systemPrompt 
    : `당신은 전문적인 면접관이자 코치입니다. 다음과 같은 역할을 수행합니다:

1. 면접 진행자 역할:
   - 자연스럽고 친근한 한국어로 면접을 진행합니다
   - 지원자의 답변에 대해 적절한 후속 질문을 합니다
   - 면접 상황에 맞는 질문을 순차적으로 제시합니다

2. 피드백 제공자 역할:
   - 지원자의 답변에 대해 구체적이고 건설적인 피드백을 제공합니다
   - 강점을 인정하고 개선점을 제안합니다
   - 면접 스킬 향상을 위한 조언을 제공합니다

3. 면접 유형별 대응:
   - 기술 면접, 인성 면접, 상황 면접 등 다양한 유형에 대응
   - 지원자의 경험과 배경에 맞는 질문을 제시
   - 면접관의 관점에서 실무적인 질문을 합니다

답변은 친근하면서도 전문적이며, 지원자가 성장할 수 있도록 격려와 조언을 균형있게 제공하세요.`;

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      stream: true,
      messages: [
        { role: "system", content: jobPrompt },
        { role: "user", content: body.message },
      ],
    }),
  });

  if (!resp.ok || !resp.body) {
    return new Response("업스트림 오류", { status: 502 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const data = trimmed.replace(/^data:\s*/, "");
          if (data === "[DONE]") {
            controller.close();
            return;
          }
          try {
            const json = JSON.parse(data);
            const token: string | undefined = json.choices?.[0]?.delta?.content;
            if (token) controller.enqueue(new TextEncoder().encode(token));
          } catch {}
        }
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}


