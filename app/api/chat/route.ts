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
  message: z.string().min(1).max(2000).regex(/^[^<>]*$/, "HTML 태그는 허용되지 않습니다"),
  jobId: z.string().optional().nullable(),
});

// Rate limiting을 위한 간단한 메모리 캐시 (Edge runtime에서는 Redis 사용 불가)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10; // 10 requests per minute
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute

export async function POST(req: NextRequest) {
  // CORS 헤더 설정
  const corsHeaders = {
    'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production' 
      ? 'https://your-domain.vercel.app' 
      : '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // OPTIONS 요청 처리 (CORS preflight)
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // Rate limiting 체크
  const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const now = Date.now();
  const userLimit = rateLimitMap.get(clientIP);

  if (userLimit) {
    if (now < userLimit.resetTime) {
      if (userLimit.count >= RATE_LIMIT) {
        return new Response("Too many requests", { 
          status: 429, 
          headers: { ...corsHeaders, 'Retry-After': '60' }
        });
      }
      userLimit.count++;
    } else {
      rateLimitMap.set(clientIP, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    }
  } else {
    rateLimitMap.set(clientIP, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
  }

  const apiKey = process.env['OPENAI_API_KEY'];
  console.log('API Key loaded:', apiKey ? 'YES' : 'NO');
  if (!apiKey) {
    console.log('API Key is missing!');
    return new Response("OPENAI_API_KEY missing", { status: 500, headers: corsHeaders });
  }
  
  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch (error) {
    console.error('Request validation error:', error);
    return new Response("잘못된 요청", { status: 400, headers: corsHeaders });
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

4. 언어 설정:
   - 지원자가 영어로 질문하거나 답변해도 반드시 한국어로만 응답합니다
   - 모든 대화는 한국어로 진행됩니다
   - 영어 입력에 대해서도 한국어로 답변하세요

답변은 친근하면서도 전문적이며, 지원자가 성장할 수 있도록 격려와 조언을 균형있게 제공하세요.`;

  let resp: Response;
  try {
    resp = await fetch("https://api.openai.com/v1/chat/completions", {
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
        max_tokens: 1000, // 토큰 제한으로 비용 관리
        temperature: 0.7, // 일관성 있는 응답을 위한 온도 설정
      }),
    });

    if (!resp.ok) {
      console.error('OpenAI API error:', resp.status, await resp.text());
      return new Response("AI 서비스 오류", { status: 502, headers: corsHeaders });
    }

    if (!resp.body) {
      return new Response("응답 스트림 오류", { status: 502, headers: corsHeaders });
    }
  } catch (error) {
    console.error('OpenAI API request failed:', error);
    return new Response("네트워크 오류", { status: 503, headers: corsHeaders });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let tokenCount = 0;
      const MAX_TOKENS = 1000; // 안전장치
      
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
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
              
              if (token) {
                tokenCount++;
                if (tokenCount > MAX_TOKENS) {
                  controller.enqueue(new TextEncoder().encode("\n\n[응답이 너무 길어서 잘렸습니다]"));
                  controller.close();
                  return;
                }
                controller.enqueue(new TextEncoder().encode(token));
              }
            } catch (parseError) {
              console.error('JSON parse error:', parseError);
              // 개별 토큰 파싱 실패는 무시하고 계속 진행
            }
          }
        }
      } catch (streamError) {
        console.error('Stream error:', streamError);
        controller.enqueue(new TextEncoder().encode("\n\n[스트림 오류가 발생했습니다]"));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      ...corsHeaders,
    },
  });
}


