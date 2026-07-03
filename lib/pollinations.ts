export async function generateImageWithPollinations(prompt: string) {
  const response = await fetch("https://gen.pollinations.ai/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.POLLINATIONS_API_KEY}`,
    },
    body: JSON.stringify({
      prompt,
      model: "flux",
      size: "1024x1024",
      response_format: "b64_json",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Pollinations 图片生成失败: ${response.status} ${errorText}`);
  }

  const data = await response.json();

  const imageUrl = data?.data?.[0]?.b64_json;

  if (!imageUrl) {
    throw new Error("Pollinations 没有返回图片数据");
  }

  return imageUrl;
}