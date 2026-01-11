// 이력서 초안 생성 API
import { NextRequest } from "next/server";
import { z } from "zod";

export const runtime = "edge";

const BodySchema = z.object({
  name: z.string(),
  gender: z.string(),
  age: z.string(),
  address: z.object({
    sido: z.string(),
    gugun: z.string(),
    detailAddress: z.string(),
  }),
  desiredJob: z.object({
    selected: z.string(),
    custom: z.string(),
  }),
  career: z.object({
    organization: z.string(),
    period: z.string(),
    periodUnit: z.string(),
    duties: z.string(),
  }),
  strengths: z.string(),
  weaknesses: z.string(),
});

export async function POST(req: NextRequest) {
  const apiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey) {
    return Response.json(
      { error: "OPENAI_API_KEY missing" },
      { status: 500 }
    );
  }

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch (error) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const address = `${body.address.sido} ${body.address.gugun} ${body.address.detailAddress}`.trim();
  const desiredJob = body.desiredJob.selected === "기타" ? body.desiredJob.custom : body.desiredJob.selected;

  const prompt = `다음 기본 정보를 바탕으로 특수교육 대상자를 위한 쉬운 이력서 초안을 작성해주세요. JSON 형식으로 응답해주세요.

[중요: 문장 작성 규칙]
- 쉬운 한국어 단어만 사용 (전문용어, 추상어 금지)
- 짧은 문장 (한 문장에 10~15자 정도)
- 단순한 문장 구조 (복문 지양)
- 구체적인 예시 사용
- 특수교육 대상자가 이해하기 쉬운 표현

기본 정보:
- 이름: ${body.name}
- 성별: ${body.gender}
- 나이: ${body.age}세
- 거주지: ${address}
- 희망 직종: ${desiredJob}
- 강점: ${body.strengths}
- 약점: ${body.weaknesses}

응답 형식 (JSON):
{
  "introduction": "자기소개 (2~3문장, 쉬운 단어, 짧은 문장. 예: '저는 성실하게 일합니다. 약속을 잘 지킵니다.')",
  "strengths": "강점을 2~4문장으로 정리 (사용자 입력: '${body.strengths}'를 바탕으로 더 풍부하게 덧붙이되, 쉬운 단어와 짧은 문장 유지)",
  "weaknesses": "약점과 보완 방안을 2~4문장으로 정리 (사용자 입력: '${body.weaknesses}'를 바탕으로 더 풍부하게 덧붙이되, 쉬운 단어와 짧은 문장 유지)",
  "career": [
    {
      "organization": "기관명 (예: OO 사회복지관)",
      "period": "기간 (예: 2023.03 - 2024.12)",
      "duties": "주요 직무 (간단히, 쉬운 단어)"
    }
  ]
}

쉬운 단어로, 짧은 문장으로 작성해주세요.`;

  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!resp.ok) {
      return Response.json({ error: "API error" }, { status: 502 });
    }

    const data = await resp.json();
    const content = data.choices[0]?.message?.content || "";

    // JSON 파싱 시도
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const resumeData = JSON.parse(jsonMatch[0]);
        return Response.json(resumeData);
      }
    } catch (e) {
      console.error("JSON parse error:", e);
    }

    // JSON 파싱 실패 시 기본 구조 반환
    return Response.json({
      introduction: `${body.name}입니다. ${desiredJob} 분야에서 일하고 싶습니다.`,
      strengths: body.strengths || "꼼꼼하고 책임감이 강합니다.",
      weaknesses: body.weaknesses || "새로운 환경에 적응하는 데 시간이 필요합니다.",
      career: [],
    });
  } catch (error) {
    console.error("Resume generation error:", error);
    return Response.json({ error: "Generation failed" }, { status: 500 });
  }
}
