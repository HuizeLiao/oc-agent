"use client";

import { useEffect, useState } from "react";
import type {
  CharacterHistoryItem,
  GenerateCharacterEvent,
  PublicCharacterProfile,
} from "@/types/character";

const HISTORY_STORAGE_KEY = "oc-agent-character-history";

function createHistoryId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalizePersonality(value: string) {
  return value
    .split(/[、,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function loadHistory() {
  if (typeof window === "undefined") {
    return [];
  }

  const savedHistory = window.localStorage.getItem(HISTORY_STORAGE_KEY);

  if (!savedHistory) {
    return [];
  }

  try {
    return JSON.parse(savedHistory) as CharacterHistoryItem[];
  } catch {
    window.localStorage.removeItem(HISTORY_STORAGE_KEY);
    return [];
  }
}

export default function HomePage() {
  const [userIdea, setUserIdea] = useState("");
  const [character, setCharacter] = useState<PublicCharacterProfile | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [history, setHistory] = useState<CharacterHistoryItem[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState("");
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [regeneratingImage, setRegeneratingImage] = useState(false);
  const [generationStatus, setGenerationStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setHistory(loadHistory());
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  function saveHistory(nextHistory: CharacterHistoryItem[]) {
    const limitedHistory = nextHistory.slice(0, 20);

    setHistory(limitedHistory);
    window.localStorage.setItem(
      HISTORY_STORAGE_KEY,
      JSON.stringify(limitedHistory)
    );
  }

  function saveCharacterToHistory(
    nextCharacter: PublicCharacterProfile,
    nextImageUrl: string,
    nextUserIdea = userIdea
  ) {
    if (activeHistoryId) {
      const nextHistory = history.map((item) =>
        item.id === activeHistoryId
          ? {
              ...item,
              userIdea: nextUserIdea,
              character: nextCharacter,
              imageUrl: nextImageUrl,
            }
          : item
      );

      saveHistory(nextHistory);
      return activeHistoryId;
    }

    const historyItem: CharacterHistoryItem = {
      id: createHistoryId(),
      createdAt: new Date().toISOString(),
      userIdea: nextUserIdea,
      character: nextCharacter,
      imageUrl: nextImageUrl,
    };

    saveHistory([historyItem, ...history]);
    setActiveHistoryId(historyItem.id);

    return historyItem.id;
  }

  function handleGenerateEvent(event: GenerateCharacterEvent) {
    if (event.type === "status") {
      setGenerationStatus(
        event.status === "character"
          ? "正在生成角色设定..."
          : "正在生成角色形象..."
      );

      return;
    }

    if (event.type === "complete") {
      setCharacter(event.character);
      setImageUrl(event.imageUrl);
      setEditing(false);
      setGenerationStatus("生成完成");
      saveCharacterToHistory(event.character, event.imageUrl);

      return;
    }

    throw new Error(event.error);
  }

  async function handleGenerate() {
    if (!userIdea.trim()) {
      setError("先输入一个角色灵感");
      return;
    }

    setLoading(true);
    setError("");
    setCharacter(null);
    setImageUrl("");
    setActiveHistoryId("");
    setEditing(false);
    setGenerationStatus("正在准备生成...");

    const statusTimers = [
      setTimeout(() => {
        setGenerationStatus("正在生成角色设定...");
      }, 600),
      setTimeout(() => {
        setGenerationStatus("正在生成角色形象...");
      }, 6000),
      setTimeout(() => {
        setGenerationStatus("正在等待图片返回...");
      }, 16000),
    ];

    try {
      const res = await fetch("/api/generate-character", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userIdea,
        }),
      });

      if (!res.ok) {
        const data = await res.json();

        throw new Error(data.error || "生成失败");
      }

      if (!res.body) {
        throw new Error("没有收到生成结果");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) {
            continue;
          }

          handleGenerateEvent(JSON.parse(line) as GenerateCharacterEvent);
        }
      }

      if (buffer.trim()) {
        handleGenerateEvent(JSON.parse(buffer) as GenerateCharacterEvent);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成失败");
      setGenerationStatus("");
    } finally {
      for (const timer of statusTimers) {
        clearTimeout(timer);
      }

      setLoading(false);
    }
  }

  function updateCharacterField(
    field: keyof PublicCharacterProfile,
    value: string
  ) {
    setCharacter((current) => {
      if (!current) {
        return current;
      }

      if (field === "personality") {
        return {
          ...current,
          personality: normalizePersonality(value),
        };
      }

      if (field === "ability" || field === "weakness") {
        return {
          ...current,
          [field]: value.trim() || undefined,
        };
      }

      return {
        ...current,
        [field]: value,
      };
    });
  }

  function updateAppearanceField(
    field: keyof PublicCharacterProfile["appearance"],
    value: string
  ) {
    setCharacter((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        appearance: {
          ...current.appearance,
          [field]: value,
        },
      };
    });
  }

  function handleSelectHistory(item: CharacterHistoryItem) {
    setCharacter(item.character);
    setImageUrl(item.imageUrl);
    setUserIdea(item.userIdea);
    setActiveHistoryId(item.id);
    setEditing(false);
    setError("");
    setGenerationStatus("");
  }

  function handleDeleteHistory(id: string) {
    const nextHistory = history.filter((item) => item.id !== id);

    saveHistory(nextHistory);

    if (activeHistoryId === id) {
      setActiveHistoryId("");
    }
  }

  function handleSaveCurrentCharacter() {
    if (!character) {
      return;
    }

    const savedId = saveCharacterToHistory(character, imageUrl);

    setActiveHistoryId(savedId);
    setEditing(false);
    setGenerationStatus("已保存到历史");
  }

  async function handleRegenerateImage() {
    if (!character) {
      return;
    }

    setRegeneratingImage(true);
    setError("");
    setGenerationStatus("正在根据当前设定重新生成角色形象...");

    try {
      const res = await fetch("/api/regenerate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          character,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "重新生成图片失败");
      }

      setImageUrl(data.imageUrl);
      saveCharacterToHistory(character, data.imageUrl);
      setGenerationStatus("图片已重新生成");
    } catch (err) {
      setError(err instanceof Error ? err.message : "重新生成图片失败");
      setGenerationStatus("");
    } finally {
      setRegeneratingImage(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <section className="mb-10 text-center">
          <h1 className="text-4xl font-bold mb-4">
            Anime / Game OC Creator Agent
          </h1>
          <p className="text-zinc-400">
            输入你的灵感，生成原创角色设定和角色形象。
          </p>
        </section>

        <section className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <label className="block mb-3 text-sm text-zinc-300">
            角色灵感
          </label>

          <textarea
            value={userIdea}
            onChange={(e) => setUserIdea(e.target.value)}
            placeholder="比如：生成一个日漫风格的魔法少女角色，性格开朗有活力。"
            className="h-32 w-full resize-none rounded-xl border border-zinc-700 bg-zinc-950 p-4 text-white outline-none focus:border-purple-500"
          />

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="mt-4 rounded-xl bg-purple-600 px-6 py-3 font-medium hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "生成中..." : "生成角色"}
          </button>

          {generationStatus && (
            <p className="mt-4 text-sm text-zinc-400">
              {generationStatus}
            </p>
          )}

          {error && (
            <p className="mt-4 text-sm text-red-400">
              {error}
            </p>
          )}
        </section>

        {character && (
          <section className="grid gap-8 lg:grid-cols-2">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-2xl font-bold">
                  {character.name}
                </h2>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing((current) => !current)}
                    className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:border-zinc-500"
                  >
                    {editing ? "完成编辑" : "编辑角色"}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveCurrentCharacter}
                    className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:border-zinc-500"
                  >
                    保存修改
                  </button>
                </div>
              </div>

              {editing ? (
                <div className="space-y-4 text-sm">
                  <label className="block">
                    <span className="mb-2 block text-zinc-300">角色名</span>
                    <input
                      value={character.name}
                      onChange={(e) => updateCharacterField("name", e.target.value)}
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-white outline-none focus:border-purple-500"
                    />
                  </label>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-zinc-300">定位</span>
                      <input
                        value={character.role}
                        onChange={(e) => updateCharacterField("role", e.target.value)}
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-white outline-none focus:border-purple-500"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-zinc-300">年龄</span>
                      <input
                        value={character.age}
                        onChange={(e) => updateCharacterField("age", e.target.value)}
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-white outline-none focus:border-purple-500"
                      />
                    </label>
                  </div>

                  <label className="block">
                    <span className="mb-2 block text-zinc-300">世界观</span>
                    <input
                      value={character.world}
                      onChange={(e) => updateCharacterField("world", e.target.value)}
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-white outline-none focus:border-purple-500"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-zinc-300">性格</span>
                    <input
                      value={character.personality.join("、")}
                      onChange={(e) => updateCharacterField("personality", e.target.value)}
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-white outline-none focus:border-purple-500"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-zinc-300">背景</span>
                    <textarea
                      value={character.background}
                      onChange={(e) => updateCharacterField("background", e.target.value)}
                      className="h-24 w-full resize-none rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-white outline-none focus:border-purple-500"
                    />
                  </label>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-zinc-300">能力</span>
                      <input
                        value={character.ability || ""}
                        onChange={(e) => updateCharacterField("ability", e.target.value)}
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-white outline-none focus:border-purple-500"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-zinc-300">弱点</span>
                      <input
                        value={character.weakness || ""}
                        onChange={(e) => updateCharacterField("weakness", e.target.value)}
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-white outline-none focus:border-purple-500"
                      />
                    </label>
                  </div>

                  <label className="block">
                    <span className="mb-2 block text-zinc-300">剧情</span>
                    <textarea
                      value={character.storyHook}
                      onChange={(e) => updateCharacterField("storyHook", e.target.value)}
                      className="h-20 w-full resize-none rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-white outline-none focus:border-purple-500"
                    />
                  </label>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-zinc-300">发型</span>
                      <input
                        value={character.appearance.hair}
                        onChange={(e) => updateAppearanceField("hair", e.target.value)}
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-white outline-none focus:border-purple-500"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-zinc-300">眼睛</span>
                      <input
                        value={character.appearance.eyes}
                        onChange={(e) => updateAppearanceField("eyes", e.target.value)}
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-white outline-none focus:border-purple-500"
                      />
                    </label>
                  </div>

                  <label className="block">
                    <span className="mb-2 block text-zinc-300">服装</span>
                    <input
                      value={character.appearance.outfit}
                      onChange={(e) => updateAppearanceField("outfit", e.target.value)}
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-white outline-none focus:border-purple-500"
                    />
                  </label>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-zinc-300">饰品</span>
                      <input
                        value={character.appearance.accessories}
                        onChange={(e) => updateAppearanceField("accessories", e.target.value)}
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-white outline-none focus:border-purple-500"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-zinc-300">气质</span>
                      <input
                        value={character.appearance.vibe}
                        onChange={(e) => updateAppearanceField("vibe", e.target.value)}
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-white outline-none focus:border-purple-500"
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-3 text-sm leading-7 text-zinc-300">
                    <p>
                      <span className="text-zinc-100">定位：</span>
                      {character.role}
                    </p>
                    <p>
                      <span className="text-zinc-100">年龄：</span>
                      {character.age}
                    </p>
                    <p>
                      <span className="text-zinc-100">世界观：</span>
                      {character.world}
                    </p>
                    <p>
                      <span className="text-zinc-100">性格：</span>
                      {character.personality.join("、")}
                    </p>
                    <p>
                      <span className="text-zinc-100">背景：</span>
                      {character.background}
                    </p>
                    {character.ability && (
                      <p>
                        <span className="text-zinc-100">能力：</span>
                        {character.ability}
                      </p>
                    )}
                    {character.weakness && (
                      <p>
                        <span className="text-zinc-100">弱点：</span>
                        {character.weakness}
                      </p>
                    )}
                    <p>
                      <span className="text-zinc-100">剧情：</span>
                      {character.storyHook}
                    </p>
                  </div>

                  <div className="mt-6 rounded-xl bg-zinc-950 p-4 text-sm text-zinc-400">
                    <p className="mb-2 text-zinc-200">外观设定</p>
                    <p>发型：{character.appearance.hair}</p>
                    <p>眼睛：{character.appearance.eyes}</p>
                    <p>服装：{character.appearance.outfit}</p>
                    <p>饰品：{character.appearance.accessories}</p>
                    <p>气质：{character.appearance.vibe}</p>
                  </div>
                </>
              )}
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-2xl font-bold">
                  角色形象
                </h2>
                <button
                  type="button"
                  onClick={handleRegenerateImage}
                  disabled={regeneratingImage}
                  className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {regeneratingImage ? "再生成中..." : "重新生成图片"}
                </button>
              </div>

              {imageUrl && (
                <img
                  src={imageUrl}
                  alt={character.name}
                  className="w-full rounded-xl border border-zinc-800"
                />
              )}
            </div>
          </section>
        )}

        {history.length > 0 && (
          <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="mb-4 text-xl font-bold">历史角色</h2>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {history.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-xl border p-4 ${
                    item.id === activeHistoryId
                      ? "border-purple-500 bg-zinc-950"
                      : "border-zinc-800 bg-zinc-950"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleSelectHistory(item)}
                    className="block w-full text-left"
                  >
                    <p className="font-medium text-zinc-100">
                      {item.character.name}
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      {item.character.role} · {item.character.age}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteHistory(item.id)}
                    className="mt-3 text-sm text-red-400 hover:text-red-300"
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
