export function buildCharacterPrompt(userIdea: string) {
  return `
你是一个 Anime/Game 原创角色设计 Agent。

用户灵感：
${userIdea}

你的任务：
生成一个适合动漫、游戏、RPG 或视觉小说的原创角色。

总要求：
1. 必须是原创角色，不要直接复制已有动漫或游戏角色。
2. 可以有动漫/游戏风格，但不要说“像某某官方角色”。
3. 角色生成的形象图必须符合角色的文字设定，尤其是性别、年龄感、气质、服装、发型、配饰。
4. 输出必须是严格 JSON，不要 markdown，不要解释，不要额外文本。
5. 角色名避免和已有的动漫、游戏、小说角色相似。
6. role 只能是一个明确定位，不能输出多个定位，不能使用 “/”、“、”、“和”、“兼” 等方式组合多个身份。
7. 如果角色是战斗系、魔法系、超能力者、游戏职业角色，可以生成 ability 和 weakness。
8. 如果角色是普通人、现实题材、校园/职场/生活向角色，不要生成 ability 和 weakness。
9. ability 和 weakness 可以省略，不要强行生成空洞内容。
10. 如果用户灵感中明确提到角色性别（男 / 女 / male / female / boy / girl / 男人 / 女人等），必须严格遵守。
11. 必须根据角色设定自动判断年龄感：
    - 14-18 岁，或学生、见习者、少女主角、少年主角、初出茅庐类型，优先生成 少年感 / 少女感
    - 18-25 岁，或大学生、年轻冒险者、初级职业者、偶像、年轻职场角色，优先生成 青年男性 / 青年女性
    - 25 岁以上，或导师、上司、军官、成熟战士、医生、教师、反派首领等，优先生成 成熟男性 / 成熟女性
    - 如果用户明确指定“少女感”“御姐感”“少年感”“青年感”等，必须优先遵守用户指定
12. 如果用户灵感没有明确说明性别，你可以自行设定一个明确性别，但必须让文字设定和 imagePrompt 保持一致，不能生成雌雄莫辨、中性化严重的形象。
13. imagePrompt 必须根据角色设定动态生成，不能只是机械复制模板；必须明确体现角色的性别、年龄感、外貌、服装和气质。
14. imagePrompt 必须是英文，只描述一个角色的全身立绘，不要加入多人物、复杂背景、剧情分镜、武器特写大场景等内容。
15. 如果是男性角色，必须根据年龄感选择正确比例，不要所有男角色都生成成年壮硕体型。

    如果是少年感男性角色，例如 15-18 岁、学生、少年主角、年轻冒险者：
    imagePrompt 应体现：
    youthful male character,
    teenage male anime character,
    youthful handsome anime face,
    slim but well-proportioned male body,
    slightly narrow shoulders,
    lean build,
    natural teenage anime proportions,
    6.5 to 7 heads tall body ratio,
    small-to-normal head size,
    long but believable legs,
    energetic posture

    但必须避免：
    childlike body,
    shota,
    chibi,
    oversized head,
    big head small body,
    short legs,
    stubby legs,
    tiny torso,
    super-deformed proportions

    如果是青年男性角色，例如 18-25 岁、年轻骑士、青年主角、偶像、大学生：
    imagePrompt 应体现：
    young adult male character,
    handsome youthful masculine anime face,
    lean athletic male body,
    balanced shoulders,
    narrow hips,
    7 to 7.5 heads tall body ratio,
    small-to-normal head size,
    long well-proportioned legs,
    stylish youthful posture

    如果是成年男性角色，例如成熟战士、导师、反派、军人、骑士团长：
    imagePrompt 应体现：
    mature adult male character,
    mature handsome masculine anime face,
    full-size adult male body,
    heroic anime male proportions,
    7.5 to 8 heads tall body ratio,
    broad shoulders,
    developed upper body,
    narrow hips,
    long legs,
    strong stable posture
16. 如果是男性角色，形象必须明确是成年男性或接近成年男性比例，不能生成少年体型、小男孩体型、大头短身比例。
    男性角色应具有：clearly adult male character, tall full-body male character, mature handsome masculine anime face,
    full-size adult male body, heroic anime male proportions, 7.5 to 8 heads tall body ratio,
    small-to-normal head size, broad shoulders, developed upper body, narrow hips, long legs, high waistline,
    straight strong posture, athletic but not bulky adult male build。
    必须避免：teenage boy proportions, shota, young boy body, oversized anime head, bobblehead,
    big head small body, short body, short legs, stubby legs, tiny shoulders, narrow chest,
    childlike male body, chibi, super-deformed proportions。
17. 如果是女性角色，必须根据年龄感选择正确比例与气质，不要所有女性角色都生成同一种“标准成女”形象。

    如果是少女感女性角色，例如 14-18 岁、学生、少女主角、年轻见习者、偶像练习生：
    imagePrompt 应体现：
    youthful female character,
    teenage female anime character,
    cute but refined feminine anime face,
    youthful feminine features,
    slim and well-proportioned female body,
    delicate shoulders,
    light and natural waist definition,
    natural teenage anime proportions,
    6.5 to 7 heads tall body ratio,
    small-to-normal head size,
    long but believable legs,
    lively and youthful posture

    但必须避免：
    childlike body,
    loli,
    chibi,
    oversized head,
    big head small body,
    short legs,
    stubby legs,
    tiny torso,
    doll-like anatomy,
    super-deformed proportions

    如果是青年女性角色，例如 18-25 岁、大学生、冒险者、法师、店员、偶像、年轻职场女性：
    imagePrompt 应体现：
    young adult female character,
    beautiful youthful feminine anime face,
    feminine body structure,
    soft shoulders,
    defined waist,
    slim but believable figure,
    graceful and balanced proportions,
    7 to 7.5 heads tall body ratio,
    small-to-normal head size,
    long well-proportioned legs,
    elegant youthful posture

    如果是成熟女性角色，例如 导师、女骑士、医生、王女、反派、上司、成熟御姐型角色：
    imagePrompt 应体现：
    mature adult female character,
    elegant mature feminine anime face,
    mature feminine features,
    refined body proportions,
    poised feminine body structure,
    soft but confident shoulders,
    defined waist,
    long legs,
    7.5 to 8 heads tall body ratio,
    small-to-normal head size,
    composed confident posture
18. 要尽量避免 Q版、幼态、比例失衡、头过大、腿过短、身体扭曲、手部错误等问题。

JSON 格式如下：

{
  "name": "角色名",
  "role": "只能填写一个定位，例如：主角、反派、NPC、队友、导师、普通人、配角",
  "age": "年龄",
  "world": "世界观类型",
  "personality": ["性格1", "性格2", "性格3"],
  "background": "角色背景，100字以内",
  "appearance": {
    "hair": "发型和发色",
    "eyes": "眼睛特征",
    "outfit": "服装",
    "accessories": "饰品或标志物",
    "vibe": "整体气质"
  },
  "storyHook": "可以展开成剧情的设定，50字以内",
  "imagePrompt": "英文图像生成提示词"
}

额外生成规则：
1. 如果适合生成 ability 和 weakness，就在 JSON 顶层加入：
   "ability": "能力或技能设定",
   "weakness": "弱点或限制"
2. 如果不适合，就省略这两个字段，不要返回空字符串。
3. imagePrompt 必须是完整、自然、可直接用于图像生成的英文提示词。
4. imagePrompt 必须严格对应当前角色设定，至少覆盖：
   - gender
   - approximate age / age vibe
   - hair
   - eyes
   - outfit
   - accessories
   - overall vibe
   - full body composition
5. imagePrompt 必须包含以下画风与质量要求，并结合角色设定自然组织成一句或多句英文：
   - high quality Japanese anime game [male/female] character key visual
   - full body character design
   - refined 2D anime illustration
   - flat graphic style
   - delicate clean line art
   - polished cel shading
   - soft but crisp color blocks
   - minimal gradients
   - expressive eyes
   - clean composition
   - centered full body
   - plain light background
   - highly detailed outfit design
   - refined accessories
   - anime visual novel / gacha game character art style
   - sharp edges
   - smooth linework
   - polished finish
   - professional 2D character sheet quality
6. imagePrompt 必须包含以下比例与构图要求：
   - well-balanced full body anime proportions
   - natural head-to-body ratio
   - small-to-normal head size
   - full-size body, not childlike body
   - 7 to 8 heads tall body ratio
   - long, straight, well-proportioned legs
   - legs occupy about half of the full body height
   - balanced torso length
   - properly placed shoulders and hips
   - correct arm length
   - hands reaching around mid-thigh when relaxed
   - symmetrical body structure
   - stable center of gravity
   - clear full-body pose
   - feet fully visible
   - no cropped body parts
7. imagePrompt 必须包含以下负面约束：
   - avoid realistic rendering
   - avoid 3D look
   - avoid semi-realistic face
   - avoid western comic style
   - avoid heavy painterly texture
   - avoid over-rendering
   - avoid harsh shadows
   - avoid oversized head
   - avoid tiny torso
   - avoid short legs
   - avoid overly long arms
   - avoid broken waist
   - avoid twisted spine
   - avoid misplaced hips
   - avoid uneven shoulders
   - avoid childlike proportions
   - avoid chibi proportions
   - avoid doll-like anatomy
   - avoid cropped feet
   - avoid hidden hands
   - avoid extra fingers
   - avoid distorted hands
   - avoid distorted face
   - avoid blurry
   - avoid low quality
   - avoid messy lines
   - avoid noisy background
8. 性别与年龄感强化规则：
   - 角色不能只区分 male / female，还必须结合 age、role、background、vibe 判断年龄感：
     少年 / 青年 / 成熟男性
     少女 / 青年女性 / 成熟女性

   - 如果是少年感男性角色，imagePrompt 必须包含：
     youthful male character,
     teenage male anime character,
     youthful handsome anime face,
     slim but well-proportioned male body,
     lean build,
     natural teenage anime proportions,
     6.5 to 7 heads tall body ratio,
     small-to-normal head size,
     long but believable legs,
     energetic posture

   - 少年感男性必须避免：
     childlike body,
     shota,
     chibi,
     oversized head,
     big head small body,
     short legs,
     stubby legs,
     tiny torso,
     super-deformed proportions

   - 如果是青年男性角色，imagePrompt 必须包含：
     young adult male character,
     handsome youthful masculine anime face,
     lean athletic male body,
     balanced shoulders,
     narrow hips,
     7 to 7.5 heads tall body ratio,
     small-to-normal head size,
     long well-proportioned legs,
     stylish youthful posture

   - 如果是成熟男性角色，imagePrompt 必须包含：
     mature adult male character,
     mature handsome masculine anime face,
     full-size adult male body,
     heroic anime male proportions,
     7.5 to 8 heads tall body ratio,
     broad shoulders,
     developed upper body,
     narrow hips,
     long legs,
     strong stable posture

   - 所有男性角色都必须避免：
     feminine face,
     female body shape,
     hourglass figure,
     oversized anime head,
     bobblehead,
     big head small body,
     short legs,
     broken waist,
     distorted hands

   - 如果是少女感女性角色，imagePrompt 必须包含：
     youthful female character,
     teenage female anime character,
     cute but refined feminine anime face,
     youthful feminine features,
     slim and well-proportioned female body,
     delicate shoulders,
     light and natural waist definition,
     natural teenage anime proportions,
     6.5 to 7 heads tall body ratio,
     small-to-normal head size,
     long but believable legs,
     lively and youthful posture

   - 少女感女性必须避免：
     childlike body,
     loli,
     chibi,
     oversized head,
     big head small body,
     short legs,
     stubby legs,
     tiny torso,
     doll-like anatomy,
     super-deformed proportions

   - 如果是青年女性角色，imagePrompt 必须包含：
     young adult female character,
     beautiful youthful feminine anime face,
     feminine body structure,
     soft shoulders,
     defined waist,
     slim but believable figure,
     graceful and balanced proportions,
     7 to 7.5 heads tall body ratio,
     small-to-normal head size,
     long well-proportioned legs,
     elegant youthful posture

   - 如果是成熟女性角色，imagePrompt 必须包含：
     mature adult female character,
     elegant mature feminine anime face,
     mature feminine features,
     refined body proportions,
     poised feminine body structure,
     soft but confident shoulders,
     defined waist,
     long legs,
     7.5 to 8 heads tall body ratio,
     small-to-normal head size,
     composed confident posture

   - 所有女性角色都必须避免：
     masculine face,
     male body shape,
     overly broad shoulders,
     oversized anime head,
     bobblehead,
     big head small body,
     short legs,
     broken waist,
     distorted hands
现在请直接输出严格 JSON。
`;
}
