const DASHSCOPE_CHAT_URL =
  "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
const DASHSCOPE_IMAGE_URL =
  "https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis";
const DASHSCOPE_TASK_URL = "https://dashscope.aliyuncs.com/api/v1/tasks";

function getDashScopeApiKey() {
  const apiKey = process.env.DASHSCOPE_API_KEY;

  if (!apiKey) {
    throw new Error("Missing DASHSCOPE_API_KEY");
  }

  return apiKey;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function getImageUrlFromTask(data: unknown) {
  if (!isRecord(data) || !isRecord(data.output)) {
    return "";
  }

  const results = data.output.results;

  if (!Array.isArray(results)) {
    return "";
  }

  const first = results[0];

  if (!isRecord(first)) {
    return "";
  }

  return isNonEmptyString(first.url) ? first.url : "";
}

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForImageTask(apiKey: string, taskId: string) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const res = await fetch(`${DASHSCOPE_TASK_URL}/${taskId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`DashScope image task error: ${errorText}`);
    }

    const data = await res.json();
    const status = isRecord(data.output)
      ? data.output.task_status
      : undefined;

    if (status === "SUCCEEDED") {
      const imageUrl = getImageUrlFromTask(data);

      if (!imageUrl) {
        throw new Error("DashScope image task did not return image url");
      }

      return imageUrl;
    }

    if (status === "FAILED" || status === "CANCELED") {
      throw new Error(`DashScope image task failed: ${JSON.stringify(data)}`);
    }

    await wait(2000);
  }

  throw new Error("DashScope image task timed out");
}

export async function callQwenText(prompt: string) {
  const apiKey = getDashScopeApiKey();
  const model = process.env.DASHSCOPE_TEXT_MODEL || "qwen-plus";

  const res = await fetch(DASHSCOPE_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.8,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`DashScope text error: ${errorText}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error("DashScope did not return text");
  }

  return text;
}

export async function callQwenImage(prompt: string) {
  const apiKey = getDashScopeApiKey();
  const model = process.env.DASHSCOPE_IMAGE_MODEL || "wanx2.1-t2i-plus";

  const res = await fetch(DASHSCOPE_IMAGE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-DashScope-Async": "enable",
    },
    body: JSON.stringify({
      model,
      input: {
        prompt,
      },
      parameters: {
        size: "768*1152",
        n: 1,
      },
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`DashScope image error: ${errorText}`);
  }

  const data = await res.json();
  const taskId = data.output?.task_id;

  if (!taskId) {
    throw new Error("DashScope image task was not created");
  }

  return waitForImageTask(apiKey, taskId);
}
