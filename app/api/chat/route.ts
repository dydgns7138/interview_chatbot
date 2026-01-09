// 스트리밍 챗 컴플리션 API (Edge 런타임)
// - Zod로 요청 바디 검증
// - OpenAI Chat Completions(gpt-4o-mini)을 stream: true 로 호출
// - SSE 라인을 파싱해 토큰을 텍스트 스트림으로 클라이언트에 전달
// - 환경 변수: OPENAI_API_KEY 필요
import { NextRequest } from "next/server";
import { z } from "zod";
import { JobId, DEFAULT_JOB, INTERVIEWER_PROMPTS } from "@/lib/prompts/interviewers";

// JobId 타입 가드
function isJobId(value: string | null | undefined): value is JobId {
  if (!value) return false;
  return Object.keys(INTERVIEWER_PROMPTS).includes(value);
}

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
  const rawJobId = body.jobId;
  const jobId: JobId = isJobId(rawJobId) ? rawJobId : DEFAULT_JOB;
  const systemPrompt = INTERVIEWER_PROMPTS[jobId];

  // 개발 환경에서만 jobId 로그 출력
  if (process.env.NODE_ENV !== "production") {
    console.log(`[Interview API] jobId: ${jobId}${rawJobId !== jobId ? ` (fallback from: ${rawJobId})` : ""}`);
  }

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
          { role: "system", content: systemPrompt },
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


