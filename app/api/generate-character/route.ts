import { NextRequest, NextResponse } from "next/server";
import { buildCharacterPrompt } from "@/lib/prompts";
import { callQwenText, callQwenImage } from "@/lib/qwen";
import type {
  CharacterProfile,
  GenerateCharacterEvent,
  PublicCharacterProfile,
} from "@/types/character";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function extractJson(text: string) {
  const cleaned = text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  return cleaned;
}

function normalizeSingleRole(role: string) {
  return role
    .split(/[\/、,，;；]/)[0]
    .replace(/^(和|兼|并且)/, "")
    .trim();
}

function validateCharacterProfile(value: unknown): CharacterProfile {
  if (!isRecord(value)) {
    throw new Error("AI 返回的角色设定不是 JSON 对象");
  }

  const invalidFields: string[] = [];
  const stringFields = [
    "name",
    "role",
    "age",
    "world",
    "background",
    "storyHook",
    "imagePrompt",
  ] as const;

  for (const field of stringFields) {
    if (!isNonEmptyString(value[field])) {
      invalidFields.push(field);
    }
  }

  for (const field of ["ability", "weakness"] as const) {
    if (field in value && value[field] !== undefined && value[field] !== "") {
      if (!isNonEmptyString(value[field])) {
        invalidFields.push(field);
      }
    }
  }

  if (
    !Array.isArray(value.personality) ||
    value.personality.length === 0 ||
    !value.personality.every(isNonEmptyString)
  ) {
    invalidFields.push("personality");
  }

  if (!isRecord(value.appearance)) {
    invalidFields.push("appearance");
  } else {
    const appearanceFields = [
      "hair",
      "eyes",
      "outfit",
      "accessories",
      "vibe",
    ] as const;

    for (const field of appearanceFields) {
      if (!isNonEmptyString(value.appearance[field])) {
        invalidFields.push(`appearance.${field}`);
      }
    }
  }

  if (invalidFields.length > 0) {
    console.error("Invalid AI character JSON:", value);
    throw new Error(
      `AI 返回的角色设定字段缺失或格式错误：${invalidFields.join("、")}`
    );
  }

  const character = { ...value };

  character.role = normalizeSingleRole(character.role as string);

  for (const field of ["ability", "weakness"] as const) {
    if (!isNonEmptyString(character[field])) {
      delete character[field];
    }
  }

  return character as CharacterProfile;
}

function safeJsonParse(text: string): CharacterProfile {
  let parsed: unknown;

  try {
    parsed = JSON.parse(extractJson(text)) as unknown;
  } catch {
    console.error("Raw AI text:", text);
    throw new Error("AI 返回的角色设定不是合法 JSON");
  }

  return validateCharacterProfile(parsed);
}

function toPublicCharacter(
  character: CharacterProfile
): PublicCharacterProfile {
  const { imagePrompt, ...publicCharacter } = character;
  void imagePrompt;

  return publicCharacter;
}

function serializeEvent(event: GenerateCharacterEvent) {
  return `${JSON.stringify(event)}\n`;
}

function getUserFacingError(error: unknown) {
  if (!(error instanceof Error)) {
    return "生成失败，请稍后再试。";
  }

  const message = error.message;

  if (message === "Missing DASHSCOPE_API_KEY") {
    return "还没有配置 DashScope API Key，请先检查本地环境变量。";
  }

  if (message.startsWith("DashScope text error:")) {
    return "角色设定生成失败，请稍后再试，或检查通义千问文本模型是否可用。";
  }

  if (message.startsWith("DashScope image")) {
    return "角色图片生成失败，请稍后再试，或检查通义图像模型是否可用。";
  }

  if (message.startsWith("AI 返回的角色设定")) {
    return "AI 返回的角色设定格式不完整，请再试一次。";
  }

  return "生成失败，请稍后再试。";
}

export async function POST(req: NextRequest) {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "请求格式不正确，请重新提交。" },
      { status: 400 }
    );
  }

  const userIdea = isRecord(body) ? body.userIdea : undefined;

  if (!isNonEmptyString(userIdea)) {
    return NextResponse.json(
      { error: "请先输入一个角色灵感。" },
      { status: 400 }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: GenerateCharacterEvent) {
        controller.enqueue(encoder.encode(serializeEvent(event)));
      }

      try {
        send({ type: "status", status: "character" });

        const textOutput = await callQwenText(
          buildCharacterPrompt(userIdea)
        );

        const character = safeJsonParse(textOutput);

        send({ type: "status", status: "image" });

        const imageUrl = await callQwenImage(character.imagePrompt);

        send({
          type: "complete",
          character: toPublicCharacter(character),
          imageUrl,
        });
      } catch (error) {
        console.error(error);

        send({
          type: "error",
          error: getUserFacingError(error),
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache",
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "X-Accel-Buffering": "no",
    },
  });
}
