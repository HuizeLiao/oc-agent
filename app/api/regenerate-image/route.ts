import { NextRequest, NextResponse } from "next/server";
import { callOpenRouterImage } from "@/lib/openrouter";
import type { PublicCharacterProfile } from "@/types/character";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validateCharacter(value: unknown): PublicCharacterProfile {
  if (!isRecord(value)) {
    throw new Error("角色资料格式不正确");
  }

  const requiredFields = [
    "name",
    "role",
    "age",
    "world",
    "background",
    "storyHook",
  ] as const;

  for (const field of requiredFields) {
    if (!isNonEmptyString(value[field])) {
      throw new Error("角色资料缺少必要字段");
    }
  }

  if (
    !Array.isArray(value.personality) ||
    value.personality.length === 0 ||
    !value.personality.every(isNonEmptyString)
  ) {
    throw new Error("角色性格格式不正确");
  }

  if (!isRecord(value.appearance)) {
    throw new Error("角色外观资料格式不正确");
  }

  const appearanceFields = [
    "hair",
    "eyes",
    "outfit",
    "accessories",
    "vibe",
  ] as const;

  for (const field of appearanceFields) {
    if (!isNonEmptyString(value.appearance[field])) {
      throw new Error("角色外观资料缺少必要字段");
    }
  }

  return value as PublicCharacterProfile;
}

function buildImagePrompt(character: PublicCharacterProfile) {
  const abilityText = character.ability
    ? `Ability or specialty: ${character.ability}.`
    : "";
  const weaknessText = character.weakness
    ? `Limitation or weakness: ${character.weakness}.`
    : "";

  return `
High quality Japanese anime game character key visual, full body character design.
Create one original character based on this profile:
Name: ${character.name}.
Role: ${character.role}.
Age or age vibe: ${character.age}.
World setting: ${character.world}.
Personality: ${character.personality.join(", ")}.
Background: ${character.background}.
${abilityText}
${weaknessText}
Hair: ${character.appearance.hair}.
Eyes: ${character.appearance.eyes}.
Outfit: ${character.appearance.outfit}.
Accessories: ${character.appearance.accessories}.
Overall vibe: ${character.appearance.vibe}.
Story hook: ${character.storyHook}.

refined 2D anime illustration, flat graphic style, delicate clean line art,
polished cel shading, soft but crisp color blocks, minimal gradients,
expressive eyes, clean composition, centered full body, plain light background,
highly detailed outfit design, refined accessories,
anime visual novel / gacha game character art style,
sharp edges, smooth linework, polished finish, professional 2D character sheet quality,
well-balanced full body anime proportions, natural head-to-body ratio,
small-to-normal head size, long well-proportioned legs, feet fully visible,
avoid realistic rendering, avoid 3D look, avoid western comic style,
avoid oversized head, avoid short legs, avoid childlike proportions,
avoid chibi proportions, avoid cropped feet, avoid hidden hands,
avoid extra fingers, avoid distorted hands, avoid distorted face,
avoid blurry, avoid low quality, avoid messy lines, avoid noisy background.
`.trim();
}

function extractImageFromOpenRouter(data: unknown): string {
  const first = isRecord(data) && Array.isArray(data.data)
    ? data.data[0]
    : undefined;

  if (!isRecord(first)) {
    console.error("Raw image response:", JSON.stringify(data, null, 2));
    throw new Error("图片接口没有返回结果");
  }

  if (isNonEmptyString(first.url)) {
    return first.url;
  }

  if (isNonEmptyString(first.b64_json)) {
    return `data:image/png;base64,${first.b64_json}`;
  }

  if (
    isRecord(first.image_url) &&
    isNonEmptyString(first.image_url.url)
  ) {
    return first.image_url.url;
  }

  console.error("Raw image response:", JSON.stringify(data, null, 2));
  throw new Error("没有从图片返回结果里找到图片");
}

function getUserFacingError(error: unknown) {
  if (!(error instanceof Error)) {
    return "重新生成图片失败，请稍后再试。";
  }

  if (error.message === "Missing OPENROUTER_API_KEY") {
    return "还没有配置 OpenRouter API Key，请先检查本地环境变量。";
  }

  if (error.message.startsWith("OpenRouter image error:")) {
    return "角色图片重新生成失败，请稍后再试，或检查 OpenRouter 图片模型是否可用。";
  }

  return error.message || "重新生成图片失败，请稍后再试。";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const character = validateCharacter(
      isRecord(body) ? body.character : undefined
    );
    const imageData = await callOpenRouterImage(buildImagePrompt(character));

    return NextResponse.json({
      imageUrl: extractImageFromOpenRouter(imageData),
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: getUserFacingError(error) },
      { status: 500 }
    );
  }
}
