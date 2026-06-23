export type AiPreviewSample = {
  id: string;
  labelKey: string;
  texts: { en: string[]; ar: string[] };
};

export const AI_PREVIEW_SAMPLES: AiPreviewSample[] = [
  {
    id: "how_are_you",
    labelKey: "aiContextHowAreYou",
    texts: {
      en: ["How are you doing?"],
      ar: ["كيف حالك؟"],
    },
  },
  {
    id: "thanks",
    labelKey: "aiContextThanks",
    texts: {
      en: ["Thanks for your help today!"],
      ar: ["شكراً على مساعدتك اليوم!"],
    },
  },
  {
    id: "greeting_morning",
    labelKey: "aiContextGoodMorning",
    texts: {
      en: ["Good morning! Ready for the day?"],
      ar: ["صباح الخير! جاهز لليوم؟"],
    },
  },
  {
    id: "meeting_schedule",
    labelKey: "aiContextMeeting",
    texts: {
      en: ["Can we meet tomorrow at 3pm?"],
      ar: ["ممكن نتقابل بكرة الساعة ٣؟"],
    },
  },
  {
    id: "running_late",
    labelKey: "aiContextRunningLate",
    texts: {
      en: ["Sorry, I'm running 10 minutes late."],
      ar: ["آسف، متأخر ١٠ دقائق."],
    },
  },
  {
    id: "help_request",
    labelKey: "aiContextHelp",
    texts: {
      en: ["Can you help me with this task?"],
      ar: ["ممكن تساعدني في المهمة دي؟"],
    },
  },
];

export const DEFAULT_PREVIEW_CONTEXT_ID = AI_PREVIEW_SAMPLES[0]?.id || "how_are_you";

export function getPreviewTexts(sampleId: string, isArabic: boolean) {
  const sample =
    AI_PREVIEW_SAMPLES.find((row) => row.id === sampleId) || AI_PREVIEW_SAMPLES[0];
  if (!sample) return [];
  return isArabic ? sample.texts.ar : sample.texts.en;
}
