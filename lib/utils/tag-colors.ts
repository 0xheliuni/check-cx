export const parseTagList = (tags?: string | null): string[] => {
  if (!tags) {
    return [];
  }

  return tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
};

// NieR 哑色系：苔绿 / 哑金 / 锈红 / 灰蓝 / 橄榄 / 赭石 / 灰紫 / 暖灰
const TAG_COLOR_CLASSES = [
  "bg-[#75824f]/20 text-[#4c5533] dark:bg-[#75824f]/25 dark:text-[#aab581]",
  "bg-[#a8863d]/20 text-[#6b5526] dark:bg-[#a8863d]/25 dark:text-[#c9a86a]",
  "bg-[#b05c4b]/20 text-[#733a2e] dark:bg-[#b05c4b]/25 dark:text-[#cd8a77]",
  "bg-[#5e7c8b]/20 text-[#3c505a] dark:bg-[#5e7c8b]/25 dark:text-[#8fa9b5]",
  "bg-[#6e6a45]/20 text-[#47442c] dark:bg-[#6e6a45]/25 dark:text-[#a09b6e]", // "商业"
  "bg-[#96683f]/20 text-[#5f4228] dark:bg-[#96683f]/25 dark:text-[#bd9268]",
  "bg-[#7a6d80]/20 text-[#4e4552] dark:bg-[#7a6d80]/25 dark:text-[#a99bb0]", // "公益"
  "bg-[#7d7866]/20 text-[#4f4c40] dark:bg-[#7d7866]/25 dark:text-[#a8a390]",
];

const hashTag = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
};

export const getTagColorClass = (tag: string) => {
  if (!tag) {
    return TAG_COLOR_CLASSES[0];
  }
  const index = hashTag(tag) % TAG_COLOR_CLASSES.length;
  return TAG_COLOR_CLASSES[index];
};
