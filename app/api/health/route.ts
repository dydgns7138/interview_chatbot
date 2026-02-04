// API 헬스체크 엔드포인트
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const apiKey = process.env['OPENAI_API_KEY'];
  
  if (!apiKey) {
    return new Response(
      JSON.stringify({ 
        status: "error", 
        message: "API 키가 설정되지 않았습니다.",
        openai: false 
      }), 
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }

  // OpenAI API 연결 테스트
  try {
    const testResponse = await fetch("https://api.openai.com/v1/models", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
    });

    if (testResponse.ok) {
      return new Response(
        JSON.stringify({ 
          status: "healthy", 
          message: "API 연결이 정상입니다.",
          openai: true 
        }), 
        { 
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );
    } else {
      return new Response(
        JSON.stringify({ 
          status: "error", 
          message: "OpenAI API 연결에 문제가 있습니다.",
          openai: false 
        }), 
        { 
          status: 502,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        status: "error", 
        message: "OpenAI API 연결 테스트 실패",
        openai: false 
      }), 
      { 
        status: 502,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}

