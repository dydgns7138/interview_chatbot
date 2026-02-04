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
    startDate: z.string(),
    endDate: z.string(),
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
  
  // 실습 기간 문자열 생성 (startDate와 endDate가 있으면)
  let careerPeriodStr = "";
  if (body.career.startDate && body.career.endDate) {
    const start = new Date(body.career.startDate);
    const end = new Date(body.career.endDate);
    const startStr = `${start.getFullYear()}.${String(start.getMonth() + 1).padStart(2, '0')}.${String(start.getDate()).padStart(2, '0')}`;
    const endStr = `${end.getFullYear()}.${String(end.getMonth() + 1).padStart(2, '0')}.${String(end.getDate()).padStart(2, '0')}`;
    careerPeriodStr = `${startStr} ~ ${endStr}`;
  }

  // 강점/약점이 비어있거나 단순한 입력인지 확인
  const strengthsIsEmpty = !body.strengths.trim() || body.strengths.trim().length < 5;
  const weaknessesIsEmpty = !body.weaknesses.trim() || body.weaknesses.trim().length < 5;
  
  const prompt = `다음 기본 정보를 바탕으로 특수교육 대상자를 위한 쉬운 이력서 초안을 작성해주세요. JSON 형식으로 응답해주세요.

[중요: 문장 작성 규칙]
- 쉬운 한국어 단어만 사용 (전문용어, 추상어 금지)
- 적당한 길이의 문장 (한 문장에 15~25자 정도)
- 단순한 문장 구조 (복문 지양)
- 구체적인 예시 사용
- 특수교육 대상자가 이해하기 쉬운 표현

기본 정보:
- 이름: ${body.name}
- 성별: ${body.gender}
- 나이: ${body.age}세
- 거주지: ${address}
- 희망 직종: ${desiredJob}
- 강점 입력: ${body.strengths || "(입력 없음)"}
- 약점 입력: ${body.weaknesses || "(입력 없음)"}

응답 형식 (JSON):
{
  "introduction": "자기소개 (2~3문장, 쉬운 단어, 짧은 문장. 예: '저는 성실하게 일합니다. 약속을 잘 지킵니다.')",
  "strengths": ${strengthsIsEmpty 
    ? `"${desiredJob} 직무에 적합한 강점을 정확히 5문장으로 작성. 쉬운 단어 사용하되 문장은 15~25자 정도로 적당한 길이로 작성. 구체적인 예시와 상황을 포함하여 풍부하게 표현. 예시: '저는 일을 꼼꼼하게 하는 것을 좋아합니다. 약속한 시간을 반드시 지키려고 노력합니다. 다른 사람들과 함께 일하는 것을 즐깁니다. 새로운 일을 배울 때도 열심히 듣고 따라합니다. 실수하지 않도록 여러 번 확인하는 습관이 있습니다.'"`
    : `"사용자 입력('${body.strengths}')을 바탕으로 정확히 5문장으로 확장하여 작성. 입력 내용을 발전시켜 더 구체적이고 풍부하게 표현. 문장은 15~25자 정도로 적당한 길이로 작성. 구체적인 예시와 상황을 포함"`},
  "weaknesses": ${weaknessesIsEmpty 
    ? `"${desiredJob} 직무에서 개선할 점과 노력하는 자세를 정확히 5문장으로 작성. 약점을 인정하되 긍정적으로 표현. 문장은 15~25자 정도로 적당한 길이로 작성. 구체적인 예시와 보완 방안 포함. 예시: '처음에는 새로운 일이 조금 어려울 수 있습니다. 하지만 선배님들께 물어보면서 배우려고 합니다. 실수를 두려워하지 않고 도전하는 용기가 있습니다. 계속 연습하면 점점 더 잘할 수 있다고 생각합니다. 꾸준히 노력하는 것이 중요하다고 믿습니다.'"`
    : `"사용자 입력('${body.weaknesses}')을 바탕으로 정확히 5문장으로 확장하여 작성. 약점을 인정하고 보완하려는 노력과 긍정적인 태도를 표현. 문장은 15~25자 정도로 적당한 길이로 작성. 구체적인 예시와 보완 방안 포함"`},
  "career": ${body.career.organization.trim() && body.career.startDate && body.career.endDate ? `[
    {
      "organization": "${body.career.organization}",
      "period": "${careerPeriodStr}",
      "duties": "${body.career.duties || '실습 업무'}"
    }
  ]` : `[]`}
}

**중요 규칙**:
1. 강점(strengths)과 약점(weaknesses)은 반드시 정확히 5문장으로 작성해야 합니다.
2. ${strengthsIsEmpty ? "강점 입력이 없거나 단순하므로, " + desiredJob + " 직무에 적합한 구체적이고 풍부한 강점을 정확히 5문장으로 생성해주세요." : "강점 입력이 있으므로, 이를 바탕으로 정확히 5문장으로 확장하여 작성해주세요."}
3. ${weaknessesIsEmpty ? "약점 입력이 없거나 단순하므로, " + desiredJob + " 직무에서 개선할 점과 노력하는 자세를 정확히 5문장으로 생성해주세요." : "약점 입력이 있으므로, 이를 바탕으로 정확히 5문장으로 확장하여 작성해주세요."}
4. 모든 문장은 쉬운 단어로, 한 문장당 15~25자 정도로 적당한 길이로 작성해주세요.
5. 구체적인 예시와 상황을 포함하여 풍부하고 의미있게 작성해주세요.`;

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
        max_tokens: 1500,
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
    const defaultStrengths = strengthsIsEmpty 
      ? "저는 일을 꼼꼼하게 하는 것을 좋아합니다. 약속한 시간을 반드시 지키려고 노력합니다. 다른 사람들과 함께 일하는 것을 즐깁니다. 새로운 일을 배울 때도 열심히 듣고 따라합니다. 실수하지 않도록 여러 번 확인하는 습관이 있습니다."
      : body.strengths;
    const defaultWeaknesses = weaknessesIsEmpty
      ? "처음에는 새로운 일이 조금 어려울 수 있습니다. 하지만 선배님들께 물어보면서 배우려고 합니다. 실수를 두려워하지 않고 도전하는 용기가 있습니다. 계속 연습하면 점점 더 잘할 수 있다고 생각합니다. 꾸준히 노력하는 것이 중요하다고 믿습니다."
      : body.weaknesses;
    
    return Response.json({
      introduction: `${body.name}입니다. ${desiredJob} 분야에서 일하고 싶습니다.`,
      strengths: defaultStrengths,
      weaknesses: defaultWeaknesses,
      career: body.career.organization.trim() && body.career.startDate && body.career.endDate ? [{
        organization: body.career.organization,
        period: careerPeriodStr,
        duties: body.career.duties || "실습 업무",
      }] : [],
    });
  } catch (error) {
    console.error("Resume generation error:", error);
    return Response.json({ error: "Generation failed" }, { status: 500 });
  }
}
