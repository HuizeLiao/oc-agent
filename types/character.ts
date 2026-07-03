export type CharacterProfile = {
  name: string;
  role: string;
  age: string;
  world: string;
  personality: string[];
  background: string;
  ability?: string;
  weakness?: string;
  appearance: {
    hair: string;
    eyes: string;
    outfit: string;
    accessories: string;
    vibe: string;
  };
  storyHook: string;
  imagePrompt: string;
};

export type GenerateCharacterResponse = {
  character: PublicCharacterProfile;
  imageUrl: string;
};

export type PublicCharacterProfile = Omit<CharacterProfile, "imagePrompt">;

export type CharacterHistoryItem = {
  id: string;
  createdAt: string;
  userIdea: string;
  character: PublicCharacterProfile;
  imageUrl: string;
};

export type GenerateCharacterEvent =
  | {
      type: "status";
      status: "character" | "image";
    }
  | {
      type: "complete";
      character: PublicCharacterProfile;
      imageUrl: string;
    }
  | {
      type: "error";
      error: string;
    };
