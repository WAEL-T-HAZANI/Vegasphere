/**
 * Vegasphere Mind is a local, deterministic conversation planner.
 *
 * It does not call an LLM. Instead it builds a compact dialogue model
 * (act, emotion, urgency, topics, asks) and composes natural reply chips.
 */

const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;

const STOPWORDS = new Set([
  "the",
  "and",
  "you",
  "your",
  "that",
  "this",
  "with",
  "have",
  "from",
  "they",
  "what",
  "when",
  "where",
  "which",
  "about",
  "just",
  "like",
  "been",
  "were",
  "will",
  "would",
  "could",
  "should",
  "there",
  "their",
  "them",
  "then",
  "than",
  "into",
  "some",
  "very",
  "also",
  "still",
  "hello",
  "hey",
  "good",
  "how",
  "are",
  "was",
  "for",
  "not",
  "but",
  "all",
  "can",
  "did",
  "does",
  "doing",
  "going",
  "here",
  "right",
  "well",
  "yeah",
  "yes",
  "okay",
  "thanks",
  "thank",
  "من",
  "في",
  "على",
  "إلى",
  "الى",
  "هذا",
  "هذه",
  "ذلك",
  "كيف",
  "شو",
  "ايش",
  "إيش",
  "لي",
  "لك",
  "مع",
  "عن",
  "هل",
  "تمام",
  "مرحبا",
  "أهلا",
  "اهلا",
  "هلا",
]);

function normalizeText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeKey(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'؟?!.،,]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isMeSender(sender) {
  const role = String(sender || "").toLowerCase();
  return ["me", "user", "assistant"].includes(role);
}

function hashSeed(text) {
  let h = 0;
  const s = String(text || "");
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return h;
}

function rotatePick(items, seed) {
  if (!items.length) return [];
  const offset = Math.abs(seed) % items.length;
  return items.map((_, idx) => items[(offset + idx) % items.length]);
}

function preferredLanguage(lastText, fallbackLanguage = "en") {
  if (ARABIC_RE.test(lastText)) return "ar";
  const lang = String(fallbackLanguage || "en").split("-")[0].toLowerCase();
  return lang.startsWith("ar") ? "ar" : "en";
}

function tokenize(text) {
  return normalizeKey(text)
    .split(/\s+/)
    .map((token) => token.replace(/[؟?!.،,]/g, ""))
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token));
}

function uniq(items) {
  const out = [];
  const seen = new Set();
  for (const item of items) {
    const text = normalizeText(item);
    if (!text) continue;
    const key = normalizeKey(text);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}

function getLastIncoming(messages) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const item = messages[i] || {};
    if (isMeSender(item.sender || item.role)) continue;
    const text = normalizeText(item.text || item.content);
    if (text) return text;
  }
  return "";
}

function getLastOutgoing(messages) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const item = messages[i] || {};
    if (!isMeSender(item.sender || item.role)) continue;
    const text = normalizeText(item.text || item.content);
    if (text) return text;
  }
  return "";
}

function extractTopics(messages, lastText, maxTopics = 4) {
  const freq = new Map();
  const recent = [...(messages || []).slice(-12), { text: lastText }];
  for (const item of recent) {
    for (const token of tokenize(item?.text || item?.content || "")) {
      freq.set(token, (freq.get(token) || 0) + 1);
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, maxTopics)
    .map(([topic]) => topic);
}

function detectEmotion(text) {
  const key = normalizeKey(text);
  if (/works now|fixed|solved|done|finished|خلص|تم|انحلت|اشتغل هلق|زبطت/.test(key)) {
    return "happy";
  }
  if (
    /\b(urgent|asap|now|quick|hurry|emergency|immediately)\b|مستعجل|ضروري|هلق|بسرعة|فورا|فوراً/.test(
      key,
    )
  ) {
    return "urgent";
  }
  if (
    /sad|lonely|depress|cry|heartbroken|not okay|struggling|زعلان|حزين|وحيد|تعبان نفس|مكسور|عم ابكي/.test(
      key,
    )
  ) {
    return "sad";
  }
  if (
    /angry|mad|hate|ridiculous|annoying|fed up|frustrat|غاضب|مقهور|كرهت|مزعج|زهقت|ضغط/.test(
      key,
    )
  ) {
    return "frustrated";
  }
  if (
    /tired|exhausted|burnout|busy|deadline|overwhelmed|مرهق|تعب|مشغول|ديدلاين|شغل/.test(
      key,
    )
  ) {
    return "stressed";
  }
  if (/😂|🤣|😄|haha|lol|lmao|funny|هههه|ضحكت/.test(key)) return "playful";
  if (
    /great news|happy|finally|worked|passed|got the job|مبسوط|فرحان|نجحت|اشتغل|أخير/.test(
      key,
    )
  ) {
    return "happy";
  }
  if (/❤️|💕|love|miss you|بحبك|اشتقت/.test(key)) return "warm";
  return "neutral";
}

function detectAct(text) {
  const key = normalizeKey(text);
  const hasQuestion = /[?؟]/.test(text);

  if (/^(hi|hey|hello|yo|sup|good morning|good evening|مرحبا|أهلا|اهلا|هلا|سلام|صباح|مساء)\b/.test(key)) {
    return "greeting";
  }
  if (/bye|goodbye|talk later|see you|مع السلامة|باي|بشوفك|سلام$/.test(key)) return "goodbye";
  if (/thank|thanks|appreciate|شكرا|شكراً|مشكور|تسلم/.test(key)) return "gratitude";
  if (/sorry|apolog|my bad|آسف|اسف|معلش|سامح/.test(key)) return "apology";
  if (/translate|translation|meaning|what does .* mean|ترجم|ترجمة|شو معنى|معنى/.test(key)) return "translation_request";
  if (/bug|error|crash|not working|broken|failed|issue|fix|deploy|push|commit|build|مشكلة|خطأ|ما يشتغل|خربان|فشل|اصلح|نشر/.test(key)) return "technical_problem";
  if (/test|retest|verify|check again|try again|اختبر|جرب|تأكد|اعد الاختبار|عيد الاختبار/.test(key)) return "testing";
  if (/done|fixed|solved|works now|finished|خلص|تم|انحلت|اشتغل هلق|زبطت/.test(key)) return "completion";
  if (/not satisfied|not good enough|bad reply|weak|make it better|مش عاجب|مو كافي|ضعيف|حسنه|قويه|قويها/.test(key)) return "improve_request";
  if (/call me|video call|voice call|facetime|zoom|مكالمة|اتصل|رن|فيديو كول/.test(key)) return "call_request";
  if (/what do you mean|explain|clarify|tell me more|شو قصدك|اشرح|وضح|فهمني|احكيلي أكثر|احكيلي اكثر/.test(key)) return "clarification";
  if (/and then|what next|next step|after that|بعدين شو|الخطوة التالية|بعدها|شو بعدين/.test(key)) return "follow_up";
  if (/choose|pick|decide|better|which one|option|prefer|اختار|قرر|أفضل|افضل|أي واحد|اي واحد/.test(key)) return "decision";
  if (/remind|remember|don't forget|dont forget|later today|tomorrow|ذكرني|تذكر|لا تنسى|بكرة|غدا/.test(key)) return "reminder";
  if (/price|cost|money|paid|free|budget|expensive|cheap|سعر|تكلفة|مصاري|فلوس|مدفوع|مجاني|غالي|رخيص/.test(key)) return "money";
  if (/doctor|health|sick|pain|medicine|symptom|hospital|طبيب|دكتور|صحة|مريض|وجع|دواء|مشفى|مستشفى/.test(key)) return "health";
  if (/password|security|hack|login|account|privacy|كلمة السر|أمان|اختراق|تسجيل الدخول|حساب|خصوصية/.test(key)) return "security";
  if (/design|ui|color|style|layout|شكل|تصميم|واجهة|ألوان|الوان/.test(key)) return "design_feedback";
  if (/send pic|photo|picture|selfie|ابعث صورة|صورة|سيلفي|وريني/.test(key)) return "media_request";
  if (/where are you|where is|location|وينك|وين|موقع|أين/.test(key)) return "location";
  if (/what time|when|eta|how long|متى|إمتى|امتى|أي ساعة|كم الوقت/.test(key)) return "time";
  if (/meet|hang out|coffee|dinner|free tonight|نتقابل|نلتقي|قهوة|عشا|فاضي/.test(key)) return "planning";
  if (/help me|need help|can you help|could you|please help|ساعدني|مساعدة|ممكن تساعد/.test(key)) return "help_request";
  if (/can you|could you|please|ممكن|لو سمحت|بدي|عايز|اريد/.test(key)) return "request";
  if (hasQuestion && /why|how|what|شو|ليش|لماذا|كيف|ما |ماذا/.test(key)) return "info_question";
  if (hasQuestion) return "question";
  if (/congrats|congratulations|well done|مبروك|أحسنت|فخور/.test(key)) return "congrats";
  if (/bad news|failed|didn'?t work|terrible|خبر سيء|فشلت|ما زبط/.test(key)) return "bad_news";
  if (/yes|yeah|ok|okay|sure|تمام|أكيد|موافق|حاضر|صح/.test(key)) return "confirmation";
  if (/no|nope|nah|not now|لا|لأ|بعدين|ما بقدر/.test(key)) return "rejection";
  return "statement";
}

function detectNeed(act, emotion) {
  if (["sad", "frustrated", "stressed", "urgent"].includes(emotion)) return "empathy";
  if (
    [
      "help_request",
      "request",
      "info_question",
      "question",
      "translation_request",
      "clarification",
      "follow_up",
      "technical_problem",
      "testing",
      "completion",
      "improve_request",
      "decision",
      "money",
      "health",
      "security",
      "design_feedback",
    ].includes(act)
  ) {
    return "answer";
  }
  if (["planning", "location", "time", "call_request", "media_request", "reminder"].includes(act)) return "action";
  if (["gratitude", "apology", "congrats", "bad_news"].includes(act)) return "social";
  return "continue";
}

function styleByTone(tone, emotion) {
  if (tone === "formal") return "formal";
  if (tone === "short") return "short";
  if (tone === "funny" || emotion === "playful") return "playful";
  return "friendly";
}

function arTopic(topic) {
  return topic ? `موضوع ${topic}` : "الموضوع";
}

function enTopic(topic) {
  return topic ? `"${topic}"` : "that";
}

function detectDomain(topics, lastIncoming) {
  const text = `${topics.join(" ")} ${lastIncoming}`.toLowerCase();
  if (/bug|error|deploy|push|commit|build|code|api|server|frontend|backend|مشكلة|خطأ|نشر/.test(text)) return "technical";
  if (/design|ui|color|layout|button|screen|تصميم|واجهة|لون|ألوان|الوان/.test(text)) return "design";
  if (/call|video|voice|jitsi|مكالمة|فيديو|صوت/.test(text)) return "calls";
  if (/translate|translation|language|ترجم|ترجمة|لغة/.test(text)) return "translation";
  if (/money|price|cost|free|paid|مصاري|سعر|مجاني|مدفوع/.test(text)) return "money";
  if (/health|doctor|medicine|pain|صحة|دكتور|دواء|وجع/.test(text)) return "health";
  return "general";
}

function composeEnglish(plan) {
  const { act, emotion, topic, style, lastOutgoing, domain } = plan;
  const thing = enTopic(topic);
  const alreadyAsked = /what do you mean|explain|tell me more|وضح|اشرح/i.test(
    lastOutgoing || "",
  );

  if (style === "short") {
    const short = {
      greeting: ["Hey!", "Hi!", "What’s up?"],
      gratitude: ["Anytime!", "You’re welcome!", "Of course!"],
      apology: ["No worries", "All good", "It’s okay"],
      confirmation: ["Perfect", "Great", "Got it"],
      rejection: ["No worries", "That’s fine", "All good"],
      goodbye: ["Take care!", "Talk soon", "Bye!"],
    };
    if (short[act]) return short[act];
  }

  if (act === "testing") {
    return ["I’ll retest the exact flow and watch the logs.", "Let’s verify the fix with the same steps that failed.", "I’ll check the result, console, and visible UI state."];
  }
  if (act === "completion") {
    return ["Great. Let’s do one quick verification before calling it done.", "Good, now we should confirm it still works after refresh.", "Nice. I’d keep the change and test the edge case once."];
  }
  if (act === "improve_request") {
    return ["Understood. I’ll make it stronger and measure it with harder cases.", "Fair. Let’s tighten the weak spots instead of adding random rules.", "Got it. I’ll improve coverage, ranking, and regression tests."];
  }

  if (emotion === "sad") {
    return [
      "I’m really sorry you’re feeling that way. I’m here with you.",
      "That sounds heavy. Want to tell me what happened?",
      "You don’t have to carry it alone. I’m listening.",
    ];
  }
  if (emotion === "frustrated") {
    return [
      "I get why that would be frustrating. What part is blocking you most?",
      "Yeah, that sounds annoying. Let’s break it down one step at a time.",
      style === "playful"
        ? "That is villain behavior from the universe 😄 What happened exactly?"
        : "I hear you. Tell me the exact issue and we’ll sort it out.",
    ];
  }
  if (emotion === "stressed") {
    return [
      "That sounds like a lot. What’s the most urgent thing right now?",
      "Take a breath, you’ve got this. Want help prioritizing it?",
      "I’m with you. Let’s handle the next small step first.",
    ];
  }
  if (emotion === "urgent") {
    return [
      "Got it. What’s the fastest useful next step?",
      "I’m with you. Send the key detail and we’ll move fast.",
      "Understood. Let’s focus on the urgent part first.",
    ];
  }
  if (emotion === "happy") {
    return [
      "That’s amazing! I’m happy for you 🎉",
      "Love that. Tell me the full story!",
      "Finally! You deserve that win.",
    ];
  }

  switch (act) {
    case "greeting":
      return style === "playful"
        ? ["Hey! You summoned the Vegasphere energy 😄", "Hi! What chaos are we solving today?", "Yo! I’m listening."]
        : ["Hey! How’s your day going?", "Hi! Good to hear from you.", "Hey, what’s up?"];
    case "gratitude":
      return ["Anytime, happy to help.", "Of course. I’m glad it helped.", "You’re welcome!"];
    case "apology":
      return ["No worries at all.", "It’s okay, don’t stress about it.", "All good. Thanks for saying that."];
    case "call_request":
      return ["Sure, video or voice?", "Give me a second and I’ll call.", "Yes, let’s call now."];
    case "translation_request":
      return ["Sure, send the text and target language.", "I can translate it. Do you want it natural or literal?", "Send it here and I’ll make it sound natural."];
    case "clarification":
      return ["Sure, I’ll explain it simply.", "I mean this part specifically — send me the line you want clarified.", "Let’s make it clearer. Which part confused you?"];
    case "follow_up":
      return ["Next, we should verify the result before changing more.", "After that, I’d check the logs/output once.", "Then we can decide based on what the test shows."];
    case "technical_problem":
      return domain === "calls"
        ? ["Tell me exactly what both sides see after answer.", "Check the console once and send me the first error.", "Let’s verify the call state, room name, and iframe first."]
        : ["Send me the error and what changed before it broke.", "Let’s isolate it: expected result, actual result, and console/logs.", "I can help debug it. What’s the first failing step?"];
    case "decision":
      return ["I’d compare reliability, speed, and maintenance first.", "Give me the options and I’ll help pick the strongest one.", "Let’s choose based on what will still work later, not just today."];
    case "reminder":
      return ["Got it. When should I remind you?", "Sure, what time should I remember it for?", "I’ll keep that in mind. Give me the exact timing."];
    case "money":
      return ["If free and reliable matters, avoid anything with hidden limits.", "Let’s pick the option with no monthly cost and low maintenance.", "I’d optimize for free, stable, and simple to run."];
    case "health":
      return ["That sounds important. If it’s serious, please check with a doctor.", "Tell me the symptoms, but don’t ignore urgent medical signs.", "I can help you think it through, but medical care comes first if it’s severe."];
    case "security":
      return ["Treat that carefully. Change passwords and check active sessions first.", "Let’s secure the account before debugging anything else.", "First step: revoke sessions, rotate secrets, then inspect logs."];
    case "design_feedback":
      return ["I’d keep it clean, consistent, and close to the app palette.", "Send me what feels wrong: spacing, color, hierarchy, or motion?", "Let’s improve the visual hierarchy without touching behavior."];
    case "media_request":
      return ["Sure, one second.", "I’ll send it now.", "Let me find the right one."];
    case "location":
      return ["Let me check and send you the location.", "I’ll share my location in a second.", "One moment, I’ll confirm where it is."];
    case "time":
      return ["Let me check the time and confirm.", "I’ll tell you in a moment.", "Soon, but let me verify first."];
    case "planning":
      return ["I’m in. What time works for you?", "That sounds good. Where should we meet?", "Yes, let’s plan it properly."];
    case "help_request":
      return ["Sure. Tell me what you need help with.", "Of course, send me the details.", "I can help. What’s the goal?"];
    case "request":
      return ["Sure, I can do that.", "Yes, give me the details.", "Okay, what exactly do you need?"];
    case "info_question":
    case "question":
      return alreadyAsked
        ? ["I’ll explain it simply.", `For ${thing}, I need one more detail first.`, "Let me answer it step by step."]
        : ["Good question. Let me think for a second.", `Do you mean ${thing}, or something else?`, "I can explain. What part should I start with?"];
    case "congrats":
      return ["Thank you! That means a lot.", "I appreciate that, really.", "Thanks! I’m happy about it too."];
    case "bad_news":
      return ["I’m sorry to hear that. What happened?", "That’s rough. I’m here with you.", "Tell me more, maybe we can fix part of it."];
    case "confirmation":
      return ["Perfect, we’re aligned.", "Great, I’ll go with that.", "Got it. That works."];
    case "rejection":
      return ["No worries, we can do it another way.", "That’s fine. What works better?", "Okay, let’s adjust."];
    case "goodbye":
      return ["Take care. Talk soon!", "See you later!", "Bye, message me anytime."];
    default:
      return [
        domain === "technical" ? `I get the technical issue around ${thing}.` : `I get you about ${thing}.`,
        "Tell me more, I’m following.",
        style === "playful" ? "That’s a whole mood 😄" : "Yeah, I understand what you mean.",
      ];
  }
}

function composeArabic(plan) {
  const { act, emotion, topic, style, lastOutgoing, domain } = plan;
  const thing = arTopic(topic);
  const alreadyAsked = /what do you mean|explain|tell me more|وضح|اشرح/i.test(
    lastOutgoing || "",
  );

  if (style === "short") {
    const short = {
      greeting: ["أهلاً!", "هلا!", "شو الأخبار؟"],
      gratitude: ["العفو!", "أي وقت!", "ولا يهمك"],
      apology: ["ولا يهمك", "عادي", "ما في مشكلة"],
      confirmation: ["تمام", "ممتاز", "وصلت"],
      rejection: ["ولا يهمك", "عادي", "تمام"],
      goodbye: ["سلام!", "نحكي قريب", "الله معك"],
    };
    if (short[act]) return short[act];
  }

  if (act === "testing") {
    return ["بعيد اختبار نفس التدفق وبراقب اللوجز.", "خلينا نتأكد من الإصلاح بنفس الخطوات اللي فشلت.", "بفحص النتيجة، الكونسول، وحالة الواجهة الظاهرة."];
  }
  if (act === "completion") {
    return ["ممتاز. خلينا نعمل تحقق سريع قبل ما نعتبرها خلصت.", "حلو، لازم نتأكد إنها تضل شغالة بعد التحديث.", "تمام. بخلي التغيير وبختبر الحالة الطرفية مرة."];
  }
  if (act === "improve_request") {
    return ["فهمت. بقويها وبقيسها بحالات أصعب.", "معك حق. خلينا نشد نقاط الضعف بدل ما نضيف قواعد عشوائية.", "تمام. بقوي التغطية، الترتيب، واختبارات الرجوع."];
  }

  if (emotion === "sad") {
    return [
      "زعلت إنك حاسس هيك. أنا معك.",
      "واضح الموضوع ثقيل عليك. بدك تحكيلي شو صار؟",
      "مو لازم تشيلها لحالك. أنا سامعك.",
    ];
  }
  if (emotion === "frustrated") {
    return [
      "فاهم ليش الموضوع مزعج. وين العائق بالضبط؟",
      "إيه هذا بيقهر. خلينا نفكها خطوة خطوة.",
      style === "playful"
        ? "الكون عامل دور الشرير اليوم 😄 شو صار بالضبط؟"
        : "فاهمك. احكيلي المشكلة بالتحديد ومنحلها.",
    ];
  }
  if (emotion === "stressed") {
    return [
      "واضح الضغط كبير. شو أكثر شي مستعجل هلق؟",
      "خذ نفس، أنت قدها. بدك نرتب الأولويات؟",
      "أنا معك. خلينا نمسك أول خطوة صغيرة.",
    ];
  }
  if (emotion === "urgent") {
    return [
      "تمام. شو أسرع خطوة مفيدة هلق؟",
      "أنا معك. ابعت التفصيل الأساسي ومنتحرك بسرعة.",
      "مفهوم. خلينا نركز على المستعجل أولاً.",
    ];
  }
  if (emotion === "happy") {
    return [
      "خبر رائع! فرحتلك 🎉",
      "حبيت! احكيلي القصة كاملة.",
      "أخيراً! بتستاهل هالفوز.",
    ];
  }

  switch (act) {
    case "greeting":
      return style === "playful"
        ? ["هلا! طاقة فيغاسفير وصلت 😄", "أهلاً! شو الفوضى اللي بدنا نحلها اليوم؟", "هلا، سامعك."]
        : ["أهلاً! كيف يومك؟", "هلا! سعيد أسمع منك.", "شو الأخبار؟"];
    case "gratitude":
      return ["أي وقت، سعيد إني ساعدت.", "العفو، المهم إنه نفعك.", "ولا يهمك!"];
    case "apology":
      return ["ولا يهمك أبداً.", "عادي، لا تشيل هم.", "كل شي تمام، شكراً إنك قلت."];
    case "call_request":
      return ["أكيد، فيديو ولا صوت؟", "ثانية وبرن عليك.", "يلا نعمل مكالمة هلق."];
    case "translation_request":
      return ["أكيد، ابعت النص واللغة المطلوبة.", "بترجمه لك. بدك طبيعي ولا حرفي؟", "ابعته هون وبخليه طبيعي."];
    case "clarification":
      return ["أكيد، بشرحها ببساطة.", "قصدي هذا الجزء تحديداً — ابعت السطر اللي بدك توضيحه.", "خلينا نوضحها. أي جزء لخبطك؟"];
    case "follow_up":
      return ["الخطوة التالية نتأكد من النتيجة قبل أي تعديل جديد.", "بعدها بفحص اللوجز أو الخرج مرة.", "بعدين منقرر حسب نتيجة الاختبار."];
    case "technical_problem":
      return domain === "calls"
        ? ["احكيلي بالضبط شو ظاهر عند الطرفين بعد الرد.", "افتح الكونسول وابعت أول خطأ واضح.", "خلينا نتأكد من حالة المكالمة، اسم الغرفة، والـ iframe أولاً."]
        : ["ابعت الخطأ وشو تغير قبل ما تخرب.", "خلينا نعزلها: المتوقع، اللي صار، واللوجز.", "بساعدك نحلها. شو أول خطوة بتفشل؟"];
    case "decision":
      return ["بقارن أولاً بين الاعتمادية والسرعة وسهولة الصيانة.", "ابعت الخيارات وبساعدك نختار الأقوى.", "خلينا نختار اللي بيضل شغال لاحقاً، مو بس اليوم."];
    case "reminder":
      return ["تمام. إمتى أذكرك؟", "أكيد، أي وقت بالضبط؟", "بحطها ببالي. اعطيني التوقيت."];
    case "money":
      return ["إذا بدك مجاني وموثوق، تجنب أي شي حدوده مخفية.", "خلينا نختار شي بلا تكلفة شهرية وصيانته قليلة.", "بركز على مجاني، ثابت، وسهل التشغيل."];
    case "health":
      return ["الموضوع مهم. إذا شديد، الأفضل تكشف عند دكتور.", "احكيلي الأعراض، بس لا تهمل أي علامات خطيرة.", "بساعدك تفكر، بس الرعاية الطبية أولاً إذا الحالة قوية."];
    case "security":
      return ["تعامل معها بحذر. غيّر كلمة السر وتأكد من الجلسات أولاً.", "خلينا نأمّن الحساب قبل أي شي ثاني.", "أول خطوة: إلغاء الجلسات، تدوير الأسرار، ثم فحص اللوجز."];
    case "design_feedback":
      return ["بخليه نظيف ومتناسق وقريب من ألوان التطبيق.", "شو اللي حاسه غلط: المسافات، اللون، الترتيب، ولا الحركة؟", "خلينا نقوي الهرمية البصرية بدون لمس السلوك."];
    case "media_request":
      return ["أكيد، ثانية.", "ببعتها هلق.", "خليني ألاقي المناسبة."];
    case "location":
      return ["خليني أتأكد وببعتلك الموقع.", "بشارك موقعي بعد لحظة.", "ثانية، بتأكد وين هو."];
    case "time":
      return ["خليني أتأكد من الوقت.", "بخبرك بعد لحظة.", "قريب، بس خليني أتأكد أول."];
    case "planning":
      return ["أنا جاهز. أي وقت بناسبك؟", "فكرة حلوة. وين بدنا نتقابل؟", "أكيد، خلينا نرتبها صح."];
    case "help_request":
      return ["أكيد. احكيلي شو بدك بالضبط.", "طبعاً، ابعتلي التفاصيل.", "بساعدك. شو الهدف؟"];
    case "request":
      return ["أكيد بقدر.", "تمام، عطيني التفاصيل.", "أوكي، شو المطلوب بالضبط؟"];
    case "info_question":
    case "question":
      return alreadyAsked
        ? ["بشرحها ببساطة.", `بالنسبة لـ ${thing}، بحتاج تفصيل صغير.`, "خليني أجاوبك خطوة خطوة."]
        : ["سؤال جيد. خليني أفكر لحظة.", `تقصد ${thing} ولا شي ثاني؟`, "بقدر أشرح. من وين أبدأ؟"];
    case "congrats":
      return ["شكراً! كلامك يعني لي كثير.", "بقدّر هالشي فعلاً.", "يسلمو! أنا مبسوط كمان."];
    case "bad_news":
      return ["آسف أسمع هيك. شو صار؟", "صعب فعلاً. أنا معك.", "احكيلي أكثر، يمكن نقدر نصلح جزء منه."];
    case "confirmation":
      return ["ممتاز، هيك متفقين.", "تمام، بمشي على هالشي.", "وصلت، هيك مناسب."];
    case "rejection":
      return ["ولا يهمك، منلاقي طريقة ثانية.", "عادي. شو الأنسب؟", "تمام، خلينا نعدّل."];
    case "goodbye":
      return ["الله معك. نحكي قريب!", "بشوفك لاحقاً!", "سلام، ابعتلي بأي وقت."];
    default:
      return [
        domain === "technical" ? `فاهم المشكلة التقنية حول ${thing}.` : `فاهمك بخصوص ${thing}.`,
        "احكيلي أكثر، أنا متابع.",
        style === "playful" ? "هذا مود كامل 😄" : "إيه، فاهم قصدك.",
      ];
  }
}

function addToneVariants(replies, lang, style, act) {
  if (style !== "formal") return replies;
  if (lang === "ar") {
    return replies.map((reply) =>
      /[.!؟]$/.test(reply) ? reply : `${reply}.`,
    );
  }
  return replies.map((reply) => (/[.!?]$/.test(reply) ? reply : `${reply}.`));
}

function replyLooksLanguageSafe(reply, lang) {
  const text = String(reply || "");
  const hasArabic = ARABIC_RE.test(text);
  const hasLatin = /[A-Za-z]/.test(text);
  if (lang === "ar") {
    // Technical words such as iframe/API are acceptable, but mostly-English
    // Arabic replies are not useful as smart chips.
    return hasArabic || !hasLatin;
  }
  return hasLatin || !hasArabic;
}

function replyQualityScore(reply, plan) {
  const text = normalizeText(reply);
  if (!text) return -999;
  if (text.length < 2 || text.length > 150) return -999;
  if (!replyLooksLanguageSafe(text, plan.lang)) return -999;
  if (normalizeKey(text) === normalizeKey(plan.lastIncoming)) return -999;
  if (normalizeKey(text) === normalizeKey(plan.lastOutgoing)) return -999;
  if (/undefined|null|\[object object\]/i.test(text)) return -999;

  let score = 20;
  if (/[?؟]/.test(text)) score += 2;
  if (plan.need === "empathy" && /sorry|hear|with you|فاهم|معك|آسف|صعب|خذ نفس/i.test(text)) score += 8;
  if (plan.need === "answer" && /send|tell|check|explain|ابعت|احكي|تأكد|اشرح|خلينا/i.test(text)) score += 8;
  if (plan.need === "action" && /when|where|time|call|متى|وين|وقت|رن|مكالمة/i.test(text)) score += 8;
  if (plan.domain === "technical" && /error|logs|debug|failing|خطأ|لوجز|تفشل|المشكلة/i.test(text)) score += 8;
  if (plan.domain === "calls" && /call|room|iframe|console|مكالمة|الغرفة|الكونسول/i.test(text)) score += 8;
  if (plan.act === "money" && /free|cost|monthly|paid|reliable|stable|مجاني|تكلفة|شهرية|موثوق|ثابت/i.test(text)) score += 12;
  if (plan.act === "security" && /password|sessions|secrets|secure|logs|كلمة السر|الجلسات|أسرار|نؤمن|اللوجز/i.test(text)) score += 12;
  if (plan.act === "design_feedback" && /visual|palette|spacing|color|hierarchy|ألوان|اللون|المسافات|الهرمية|البصرية/i.test(text)) score += 12;
  if (plan.act === "decision" && /options|choose|compare|reliability|maintenance|الخيارات|نختار|بقارن|الصيانة|الاعتمادية/i.test(text)) score += 12;
  if (plan.act === "clarification" && /explain|clarif|mean|clear|اشرح|وضح|قصدي|ببساطة/i.test(text)) score += 12;
  if (plan.act === "follow_up" && /next|after|then|verify|logs|الخطوة|بعدها|بعدين|نتأكد|اللوجز/i.test(text)) score += 12;
  if (plan.act === "testing" && /test|verify|logs|console|flow|اختبار|نتأكد|اللوجز|الكونسول/i.test(text)) score += 12;
  if (plan.act === "completion" && /verify|refresh|edge|done|confirm|تحقق|التحديث|خلصت|نتأكد/i.test(text)) score += 12;
  if (plan.act === "improve_request" && /stronger|coverage|ranking|regression|weak|tighten|أقوى|التغطية|الترتيب|اختبارات|الضعف|نشد/i.test(text)) score += 12;
  if (plan.emotion === "stressed" && /breath|priorit|urgent|step|ضغط|نرتب|خطوة|مستعجل/i.test(text)) score += 10;
  if (plan.style === "short" && text.length <= 35) score += 4;
  return score;
}

function safeBackfillReplies(plan) {
  if (plan.lang === "ar") {
    const byNeed = {
      empathy: ["أنا معك. احكيلي شو صار.", "خلينا نمسكها خطوة خطوة.", "فاهمك، شو أهم جزء هلق؟"],
      answer: ["ابعتلي التفاصيل وبساعدك.", "خلينا نحدد المطلوب أولاً.", "بقدر أساعد، شو الخطوة اللي واقفة؟"],
      action: ["تمام، شو الوقت المناسب؟", "خلينا نرتبها بوضوح.", "أعطيني التفاصيل وبمشي معك."],
      social: ["تمام، وصلني.", "أكيد، ولا يهمك.", "يسلمو، فهمت عليك."],
      continue: ["فاهمك. احكيلي أكثر.", "تمام، كمّل.", "إيه، متابع معك."],
    };
    return byNeed[plan.need] || byNeed.continue;
  }

  const byNeed = {
    empathy: ["I’m with you. What happened?", "Let’s take it step by step.", "I hear you. What matters most right now?"],
    answer: ["Send me the details and I’ll help.", "Let’s define the exact problem first.", "I can help. What step is stuck?"],
    action: ["Sure, what time works?", "Let’s arrange it clearly.", "Give me the details and I’ll follow."],
    social: ["Got it.", "Of course, no worries.", "Thanks, I understand."],
    continue: ["I get you. Tell me more.", "Okay, go on.", "Yeah, I’m following."],
  };
  return byNeed[plan.need] || byNeed.continue;
}

function finalizeReplies(rawReplies, plan, seed) {
  const candidates = [
    ...rotatePick(uniq(rawReplies), seed),
    ...rotatePick(safeBackfillReplies(plan), seed + 17),
  ];

  return uniq(candidates)
    .map((reply) => ({ reply, score: replyQualityScore(reply, plan) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.reply)
    .slice(0, 3);
}

function composeVegasphereReplies({
  messages = [],
  language = "en",
  tone = "default",
  subject = "",
  conversationKind = "",
  variationSeed = 0,
}) {
  const safeMessages = Array.isArray(messages) ? messages : [];
  const lastIncoming = getLastIncoming(safeMessages);
  if (!lastIncoming) {
    return { replies: [], intent: null, confidence: 0, profile: null };
  }

  const lang = preferredLanguage(lastIncoming, language);
  const act = detectAct(lastIncoming);
  const emotion = detectEmotion(lastIncoming);
  const need = detectNeed(act, emotion);
  const topics = extractTopics(safeMessages, lastIncoming);
  const style = styleByTone(tone, emotion);
  const lastOutgoing = getLastOutgoing(safeMessages);
  const topic = topics[0] || String(subject || "").trim();
  const domain = detectDomain(topics, lastIncoming);
  const plan = {
    lang,
    act,
    emotion,
    need,
    topics,
    topic,
    style,
    lastIncoming,
    lastOutgoing,
    domain,
    subject,
    conversationKind,
  };

  const raw = lang === "ar" ? composeArabic(plan) : composeEnglish(plan);
  const seed = hashSeed(
    `${lastIncoming}::${lastOutgoing}::${tone}::${variationSeed}::${conversationKind}`,
  );
  const replies = finalizeReplies(
    addToneVariants(raw, lang, style, act),
    plan,
    seed,
  );

  const highConfidenceActs = new Set([
    "help_request",
    "request",
    "info_question",
    "question",
    "planning",
    "location",
    "time",
    "call_request",
    "media_request",
    "translation_request",
    "technical_problem",
    "decision",
    "reminder",
    "money",
    "health",
    "security",
    "design_feedback",
    "bad_news",
  ]);
  const confidence =
    ["sad", "frustrated", "stressed", "happy"].includes(emotion) ||
    highConfidenceActs.has(act)
      ? 0.92
      : act === "statement"
        ? 0.68
        : 0.82;

  return {
    replies,
    intent: `vegasphere-mind:${need}:${act}`,
    confidence,
    profile: plan,
  };
}

module.exports = {
  composeVegasphereReplies,
};
