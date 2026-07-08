/**
 * Vegasphere local chat lexicon.
 *
 * This is deliberately small and hand-curated: common chat phrases, slang,
 * Syrian/Levantine Arabic forms, and app-style messages that dictionary data
 * often translates too literally.
 */

function normalizeText(value) {
  return String(value || "")
    .replace(/[’`]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeKey(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

const PHRASES = {
  "en:ar": {
    "what do you mean": "شو قصدك؟",
    "what do u mean": "شو قصدك؟",
    "explain it": "اشرحها",
    "explain this": "اشرح هذا",
    "tell me more": "احكيلي أكثر",
    "next step": "الخطوة التالية",
    "what next": "شو بعدين؟",
    "after that": "بعدها",
    "i don't know": "ما بعرف",
    "i dont know": "ما بعرف",
    "i can't": "ما بقدر",
    "i cant": "ما بقدر",
    "i can": "بقدر",
    "i want": "بدي",
    "i need": "بحتاج",
    "i need help": "بحتاج مساعدة",
    "i need something free": "بدي شي مجاني",
    "free and reliable": "مجاني وموثوق",
    "fast and reliable": "سريع وموثوق",
    "the app has a bug": "التطبيق فيه مشكلة",
    "the app has an issue": "التطبيق فيه مشكلة",
    "the app has a problem": "التطبيق فيه مشكلة",
    "has a bug": "فيه مشكلة",
    "has an issue": "فيه مشكلة",
    "not working": "ما يشتغل",
    "it is not working": "ما يشتغل",
    "it does not work": "ما يشتغل",
    "it didn't work": "ما زبط",
    "it didnt work": "ما زبط",
    "still connected": "لسا متصل",
    "stuck connected": "عالق على متصل",
    "stuck connecting": "عالق على الاتصال",
    "caller stays connecting": "المتصل يضل عالق على الاتصال",
    "callee stays connected": "المستقبل يضل متصل",
    "black screen": "شاشة سوداء",
    "camera is not working": "الكاميرا ما تشتغل",
    "microphone is not working": "الميكروفون ما يشتغل",
    "mic is not working": "الميكروفون ما يشتغل",
    "message is not sending": "الرسالة ما تنرسل",
    "notification did not arrive": "الإشعار ما وصل",
    "i can't hear you": "ما بقدر أسمعك",
    "i cant hear you": "ما بقدر أسمعك",
    "i can't see you": "ما بقدر أشوفك",
    "i cant see you": "ما بقدر أشوفك",
    "after i answer": "بعد ما أرد",
    "after i join": "بعد ما أنضم",
    "can you help me": "ممكن تساعدني؟",
    "please help me": "من فضلك ساعدني",
    "let me check": "خليني أتأكد",
    "i will check": "بتأكد",
    "i will fix it": "بصلحها",
    "i fixed it": "صلحتها",
    "one moment": "لحظة",
    "give me a second": "عطيني ثانية",
    "no worries": "ولا يهمك",
    "no problem": "ما في مشكلة",
    "all good": "كله تمام",
    "sounds good": "تمام، مناسب",
    "that makes sense": "هذا منطقي",
    "you are right": "معك حق",
    "you were right": "كان معك حق",
    "i understand": "فهمت",
    "i get it": "فاهم",
    "tell me more": "احكيلي أكثر",
    "what happened": "شو صار؟",
    "what is wrong": "شو المشكلة؟",
    "where are you": "وينك؟",
    "where is it": "وينه؟",
    "on my way": "بالطريق",
    "i am on my way": "أنا بالطريق",
    "running late": "متأخر",
    "i am running late": "أنا متأخر",
    "see you soon": "بشوفك قريب",
    "talk to you later": "نحكي بعدين",
    "call me": "رن علي",
    "video call": "مكالمة فيديو",
    "voice call": "مكالمة صوتية",
    "good luck": "بالتوفيق",
    "good job": "شغل ممتاز",
    "well done": "أحسنت",
    "happy for you": "فرحان لك",
    "i am sorry": "آسف",
    "sorry to hear that": "آسف أسمع هيك",
    "i miss you": "اشتقتلك",
    "i love you": "بحبك",
    "take care": "دير بالك على حالك",
    "good morning": "صباح الخير",
    "good evening": "مساء الخير",
    "good night": "تصبح على خير",
    "do not worry": "لا تقلق",
    "don't worry": "لا تقلق",
    "i am with you": "أنا معك",
    "step by step": "خطوة خطوة",
  },
  "ar:en": {
    "شو قصدك": "what do you mean?",
    "اشرحها": "explain it",
    "اشرح هذا": "explain this",
    "وضح": "clarify",
    "وضحلي": "clarify for me",
    "ما بعرف": "I don't know",
    "ما بعرف شو صار": "I don't know what happened",
    "ما بعرف ايش صار": "I don't know what happened",
    "ما بعرف إيش صار": "I don't know what happened",
    "ما بقدر": "I can't",
    "بقدر": "I can",
    "بدي": "I want",
    "عايز": "I want",
    "بدك": "do you want",
    "بحتاج": "I need",
    "بدي شي مجاني": "I need something free",
    "مجاني وموثوق": "free and reliable",
    "سريع وموثوق": "fast and reliable",
    "محتاج": "I need",
    "ممكن تساعدني": "can you help me?",
    "ساعدني": "help me",
    "ما يشتغل": "it does not work",
    "ما زبط": "it didn't work",
    "لسا متصل": "still connected",
    "عالق على متصل": "stuck connected",
    "عالق على الاتصال": "stuck connecting",
    "المتصل يضل عالق على الاتصال": "caller stays connecting",
    "المستقبل يضل متصل": "callee stays connected",
    "شاشة سوداء": "black screen",
    "الكاميرا ما تشتغل": "the camera does not work",
    "الميكروفون ما يشتغل": "the microphone does not work",
    "الرسالة ما تنرسل": "the message is not sending",
    "الإشعار ما وصل": "the notification did not arrive",
    "الاشعار ما وصل": "the notification did not arrive",
    "ما بقدر اسمعك": "I can't hear you",
    "ما بقدر أسمعك": "I can't hear you",
    "ما بقدر اشوفك": "I can't see you",
    "ما بقدر أشوفك": "I can't see you",
    "بعد ما ارد": "after I answer",
    "بعد ما أرد": "after I answer",
    "بعد ما انضم": "after I join",
    "بعد ما أنضم": "after I join",
    "خليني اتأكد": "let me check",
    "خليني أتأكد": "let me check",
    "لحظة": "one moment",
    "ثانية": "one second",
    "بتأكد": "I will check",
    "بصلحها": "I will fix it",
    "صلحتها": "I fixed it",
    "ولا يهمك": "no worries",
    "ما في مشكلة": "no problem",
    "كله تمام": "all good",
    "معك حق": "you are right",
    "كان معك حق": "you were right",
    "فهمت": "I understand",
    "فاهم": "I get it",
    "احكيلي اكثر": "tell me more",
    "احكيلي أكثر": "tell me more",
    "شو صار": "what happened?",
    "شو المشكلة": "what is wrong?",
    "وينك": "where are you?",
    "وينك هلق": "where are you now?",
    "وينك هلأ": "where are you now?",
    "وينك الآن": "where are you now?",
    "وينه": "where is it?",
    "بالطريق": "on my way",
    "انا بالطريق": "I am on my way",
    "أنا بالطريق": "I am on my way",
    "متأخر": "running late",
    "بشوفك قريب": "see you soon",
    "نحكي بعدين": "talk to you later",
    "رن علي": "call me",
    "مكالمة فيديو": "video call",
    "مكالمة صوتية": "voice call",
    "بالتوفيق": "good luck",
    "شغل ممتاز": "good job",
    "احسنت": "well done",
    "أحسنت": "well done",
    "آسف أسمع هيك": "sorry to hear that",
    "اشتقتلك": "I miss you",
    "بحبك": "I love you",
    "دير بالك على حالك": "take care",
    "لا تقلق": "don't worry",
    "أنا معك": "I am with you",
    "خطوة خطوة": "step by step",
  },
};

const WORDS = {
  "en:ar": {
    app: "تطبيق",
    bug: "مشكلة",
    issue: "مشكلة",
    error: "خطأ",
    deploy: "نشر",
    push: "دفع",
    commit: "كومِت",
    branch: "فرع",
    call: "مكالمة",
    caller: "المتصل",
    callee: "المستقبل",
    video: "فيديو",
    voice: "صوت",
    chat: "محادثة",
    message: "رسالة",
    notification: "إشعار",
    camera: "كاميرا",
    microphone: "ميكروفون",
    mic: "ميكروفون",
    reply: "رد",
    replies: "ردود",
    translate: "ترجم",
    translation: "ترجمة",
    tomorrow: "غداً",
    today: "اليوم",
    later: "بعدين",
    soon: "قريباً",
    now: "هلق",
    free: "مجاني",
    reliable: "موثوق",
    fast: "سريع",
    stuck: "عالق",
    connected: "متصل",
    connecting: "يتصل",
    loading: "تحميل",
    sending: "إرسال",
    arrived: "وصل",
    answer: "أرد",
    join: "أنضم",
    hear: "أسمع",
    see: "أشوف",
    screen: "شاشة",
    black: "سوداء",
    explain: "اشرح",
    clarify: "وضح",
    fix: "أصلح",
    check: "تحقق",
    test: "اختبر",
    verify: "تحقق",
    improve: "حسن",
    stronger: "أقوى",
    better: "أفضل",
    logs: "اللوجز",
    console: "الكونسول",
  },
  "ar:en": {
    تطبيق: "app",
    مشكلة: "issue",
    خطأ: "error",
    نشر: "deploy",
    دفع: "push",
    فرع: "branch",
    مكالمة: "call",
    المتصل: "caller",
    المستقبل: "callee",
    فيديو: "video",
    صوت: "voice",
    محادثة: "chat",
    رسالة: "message",
    الرسالة: "message",
    إشعار: "notification",
    الاشعار: "notification",
    الإشعار: "notification",
    كاميرا: "camera",
    الكاميرا: "camera",
    ميكروفون: "microphone",
    الميكروفون: "microphone",
    رد: "reply",
    ردود: "replies",
    ترجم: "translate",
    ترجمة: "translation",
    غدا: "tomorrow",
    غداً: "tomorrow",
    اليوم: "today",
    بعدين: "later",
    قريبا: "soon",
    قريباً: "soon",
    هلق: "now",
    هلأ: "now",
    مجاني: "free",
    موثوق: "reliable",
    سريع: "fast",
    عالق: "stuck",
    متصل: "connected",
    يتصل: "connecting",
    تحميل: "loading",
    إرسال: "sending",
    ارسال: "sending",
    وصل: "arrived",
    ارد: "answer",
    أرد: "answer",
    انضم: "join",
    أنضم: "join",
    اسمع: "hear",
    أسمع: "hear",
    اشوف: "see",
    أشوف: "see",
    شاشة: "screen",
    سوداء: "black",
    اشرح: "explain",
    وضح: "clarify",
    أصلح: "fix",
    اصلح: "fix",
    تحقق: "check",
    اختبر: "test",
    حسن: "improve",
    أقوى: "stronger",
    افضل: "better",
    أفضل: "better",
    اللوجز: "logs",
    الكونسول: "console",
  },
};

function cleanDynamicTail(value) {
  return normalizeText(value)
    .replace(/[?.!؟،,]+$/g, "")
    .trim();
}

function translateTailWords(src, tgt, value) {
  const text = cleanDynamicTail(value);
  if (!text) return "";
  return text
    .split(/(\s+)/)
    .map((part) => {
      if (!normalizeKey(part)) return part;
      return lookupChatWord(src, tgt, part) || part;
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

const EN_AR_NOUNS = {
  app: { bare: "تطبيق", definite: "التطبيق" },
  application: { bare: "تطبيق", definite: "التطبيق" },
  call: { bare: "مكالمة", definite: "المكالمة" },
  video: { bare: "فيديو", definite: "الفيديو" },
  voice: { bare: "صوت", definite: "الصوت" },
  chat: { bare: "محادثة", definite: "المحادثة" },
  message: { bare: "رسالة", definite: "الرسالة" },
  reply: { bare: "رد", definite: "الرد" },
  translation: { bare: "ترجمة", definite: "الترجمة" },
  screen: { bare: "شاشة", definite: "الشاشة" },
  login: { bare: "تسجيل الدخول", definite: "تسجيل الدخول" },
  account: { bare: "حساب", definite: "الحساب" },
  caller: { bare: "متصل", definite: "المتصل" },
  callee: { bare: "مستقبل", definite: "المستقبل" },
  camera: { bare: "كاميرا", definite: "الكاميرا" },
  microphone: { bare: "ميكروفون", definite: "الميكروفون" },
  mic: { bare: "ميكروفون", definite: "الميكروفون" },
  notification: { bare: "إشعار", definite: "الإشعار" },
  bug: { bare: "مشكلة", definite: "المشكلة" },
  issue: { bare: "مشكلة", definite: "المشكلة" },
  problem: { bare: "مشكلة", definite: "المشكلة" },
  error: { bare: "خطأ", definite: "الخطأ" },
  logs: { bare: "اللوجز", definite: "اللوجز" },
  console: { bare: "الكونسول", definite: "الكونسول" },
};

const AR_EN_NOUNS = {
  تطبيق: { bare: "app", definite: "the app" },
  التطبيق: { bare: "app", definite: "the app" },
  مكالمة: { bare: "call", definite: "the call" },
  المكالمة: { bare: "call", definite: "the call" },
  فيديو: { bare: "video", definite: "the video" },
  الفيديو: { bare: "video", definite: "the video" },
  صوت: { bare: "voice", definite: "the voice" },
  الصوت: { bare: "voice", definite: "the voice" },
  محادثة: { bare: "chat", definite: "the chat" },
  المحادثة: { bare: "chat", definite: "the chat" },
  رسالة: { bare: "message", definite: "the message" },
  الرسالة: { bare: "message", definite: "the message" },
  رد: { bare: "reply", definite: "the reply" },
  الرد: { bare: "reply", definite: "the reply" },
  شاشة: { bare: "screen", definite: "the screen" },
  الشاشة: { bare: "screen", definite: "the screen" },
  حساب: { bare: "account", definite: "the account" },
  الحساب: { bare: "account", definite: "the account" },
  المتصل: { bare: "caller", definite: "the caller" },
  المستقبل: { bare: "callee", definite: "the callee" },
  الكاميرا: { bare: "camera", definite: "the camera" },
  الميكروفون: { bare: "microphone", definite: "the microphone" },
  الإشعار: { bare: "notification", definite: "the notification" },
  الاشعار: { bare: "notification", definite: "the notification" },
  مشكلة: { bare: "issue", definite: "the issue" },
  المشكلة: { bare: "issue", definite: "the issue" },
  خطأ: { bare: "error", definite: "the error" },
  الخطأ: { bare: "error", definite: "the error" },
  اللوجز: { bare: "logs", definite: "the logs" },
  الكونسول: { bare: "console", definite: "the console" },
};

function translateEnglishNounPhrase(value, options = {}) {
  const key = normalizeKey(value).replace(/^(the|a|an)\s+/, "");
  const hit = EN_AR_NOUNS[key];
  if (hit) return options.definite === false ? hit.bare : hit.definite;
  return translateTailWords("en", "ar", value);
}

function translateArabicNounPhrase(value, options = {}) {
  const key = normalizeKey(value);
  const hit = AR_EN_NOUNS[key];
  if (hit) return options.definite === false ? hit.bare : hit.definite;
  return translateTailWords("ar", "en", value);
}

function translateEnglishActionToArabic(value, options = {}) {
  const key = normalizeKey(value);
  let m = key.match(/^(fix|repair|solve) (.+)$/);
  if (m) return `${options.secondPerson ? "تصلح" : "أصلح"} ${translateEnglishNounPhrase(m[2])}`;

  m = key.match(/^(check|inspect) (.+)$/);
  if (m) return `${options.secondPerson ? "تتحقق من" : "أتحقق من"} ${translateEnglishNounPhrase(m[2])}`;

  m = key.match(/^(test|retest) (.+)$/);
  if (m) return `${options.secondPerson ? "تختبر" : "أختبر"} ${translateEnglishNounPhrase(m[2])}`;

  m = key.match(/^verify (.+)$/);
  if (m) return `${options.secondPerson ? "تتأكد من" : "أتأكد من"} ${translateEnglishNounPhrase(m[1])}`;

  m = key.match(/^improve (.+)$/);
  if (m) return `${options.secondPerson ? "تحسن" : "أحسن"} ${translateEnglishNounPhrase(m[1])}`;

  m = key.match(/^explain (.+)$/);
  if (m) return `${options.secondPerson ? "تشرح" : "أشرح"} ${translateEnglishNounPhrase(m[1])}`;

  return translateTailWords("en", "ar", value);
}

function translateArabicActionToEnglish(value, options = {}) {
  const key = normalizeKey(value);
  let m = key.match(/^(تصلح|اصلح|أصلح) (.+)$/);
  if (m) return `${options.secondPerson ? "fix" : "fix"} ${translateArabicNounPhrase(m[2])}`;

  m = key.match(/^(تتحقق من|تحقق من|اتحقق من|أتحقق من) (.+)$/);
  if (m) return `check ${translateArabicNounPhrase(m[2])}`;

  m = key.match(/^(تفحص|افحص|أفحص) (.+)$/);
  if (m) return `check ${translateArabicNounPhrase(m[2])}`;

  m = key.match(/^(تختبر|اختبر|أختبر) (.+)$/);
  if (m) return `test ${translateArabicNounPhrase(m[2])}`;

  m = key.match(/^(تشرح|اشرح|أشرح) (.+)$/);
  if (m) return `explain ${translateArabicNounPhrase(m[2])}`;

  m = key.match(/^(تحسن|حسن|أحسن) (.+)$/);
  if (m) return `improve ${translateArabicNounPhrase(m[2])}`;

  return translateTailWords("ar", "en", value);
}

function translateEnglishStateToArabic(value) {
  const key = normalizeKey(value);
  if (key === "connected") return "متصل";
  if (key === "connecting") return "عالق على الاتصال";
  if (key === "loading") return "عالق على التحميل";
  if (key === "sending") return "عالق على الإرسال";
  return translateTailWords("en", "ar", value);
}

function translateArabicStateToEnglish(value) {
  const key = normalizeKey(value);
  if (key === "متصل") return "connected";
  if (key === "يتصل" || key === "عالق على الاتصال") return "connecting";
  if (key === "تحميل" || key === "عالق على التحميل") return "loading";
  if (key === "إرسال" || key === "ارسال" || key === "عالق على الإرسال") return "sending";
  return translateTailWords("ar", "en", value);
}

function lookupDynamicPhrase(src, tgt, text) {
  const key = normalizeKey(text);
  if (!key) return null;

  if (src === "en" && tgt === "ar") {
    let m = key.match(/^can you (.+)$/);
    if (m) return `ممكن ${translateEnglishActionToArabic(m[1], { secondPerson: true })}?`;

    m = key.match(/^could you (.+)$/);
    if (m) return `ممكن ${translateEnglishActionToArabic(m[1], { secondPerson: true })}?`;

    m = key.match(/^please help me(?: (.+))?$/);
    if (m) {
      const tail = translateTailWords(src, tgt, m[1] || "");
      return tail ? `من فضلك ساعدني ${tail}` : "من فضلك ساعدني";
    }

    m = key.match(/^please (.+)$/);
    if (m) return `من فضلك أن ${translateEnglishActionToArabic(m[1], { secondPerson: true })}`;

    m = key.match(/^after i (answer|join) (.+)$/);
    if (m) {
      const action = m[1] === "answer" ? "أرد" : "أنضم";
      return `بعد ما ${action} ${lookupDynamicPhrase(src, tgt, m[2]) || translateTailWords(src, tgt, m[2])}`;
    }

    m = key.match(/^i can(?:'|no)?t (hear|see) you$/);
    if (m) return m[1] === "hear" ? "ما بقدر أسمعك" : "ما بقدر أشوفك";

    m = key.match(/^i need (.+)$/);
    if (m) return `بحتاج ${translateTailWords(src, tgt, m[1])}`;

    m = key.match(/^i want (.+)$/);
    if (m) return `بدي ${translateTailWords(src, tgt, m[1])}`;

    m = key.match(/^i will (.+)$/);
    if (m) return `رح ${translateTailWords(src, tgt, m[1])}`;

    m = key.match(/^where is (.+)$/);
    if (m) return `وين ${translateEnglishNounPhrase(m[1])}؟`;

    m = key.match(/^where are (.+)$/);
    if (m) return `وين ${translateEnglishNounPhrase(m[1])}؟`;

    m = key.match(/^why is (.+)$/);
    if (m) return `ليش ${translateEnglishNounPhrase(m[1])}؟`;

    m = key.match(/^what is (.+)$/);
    if (m) return `شو ${translateEnglishNounPhrase(m[1])}؟`;

    m = key.match(/^(.+) is not working$/);
    if (m) return `${translateEnglishNounPhrase(m[1])} ما تشتغل`;

    m = key.match(/^(.+) is not (sending|loading)$/);
    if (m) return `${translateEnglishNounPhrase(m[1])} ما ${m[2] === "sending" ? "تنرسل" : "تحمل"}`;

    m = key.match(/^(.+) did not (arrive|load|send)$/);
    if (m) {
      const verb = m[2] === "arrive" ? "وصل" : m[2] === "load" ? "حمل" : "انرسل";
      return `${translateEnglishNounPhrase(m[1])} ما ${verb}`;
    }

    m = key.match(/^(.+) stays (connected|connecting|loading|sending)$/);
    if (m) return `${translateEnglishNounPhrase(m[1])} يضل ${translateEnglishStateToArabic(m[2])}`;

    m = key.match(/^(.+) has (?:a |an )?(bug|issue|problem|error)$/);
    if (m) return `${translateEnglishNounPhrase(m[1])} فيه ${translateEnglishNounPhrase(m[2], { definite: false })}`;
  }

  if (src === "ar" && tgt === "en") {
    let m = key.match(/^ممكن (.+)$/);
    if (m) return `can you ${translateArabicActionToEnglish(m[1], { secondPerson: true })}?`;

    m = key.match(/^بعد ما (ارد|أرد|اجاوب|أجاوب|انضم|أنضم) (.+)$/);
    if (m) {
      const action = /انضم|أنضم/.test(m[1]) ? "join" : "answer";
      return `after I ${action} ${lookupDynamicPhrase(src, tgt, m[2]) || translateTailWords(src, tgt, m[2])}`;
    }

    m = key.match(/^ما بقدر (اسمعك|أسمعك|اشوفك|أشوفك)$/);
    if (m) return /سمع/.test(m[1]) ? "I can't hear you" : "I can't see you";

    m = key.match(/^بدي (.+)$/);
    if (m) return `I want ${translateTailWords(src, tgt, m[1])}`;

    m = key.match(/^بحتاج (.+)$/);
    if (m) return `I need ${translateTailWords(src, tgt, m[1])}`;

    m = key.match(/^وين (.+)$/);
    if (m) return `where is ${translateArabicNounPhrase(m[1])}?`;

    m = key.match(/^ليش (.+)$/);
    if (m) return `why is ${translateArabicNounPhrase(m[1])}?`;

    m = key.match(/^شو (.+)$/);
    if (m) return `what is ${translateArabicNounPhrase(m[1])}?`;

    m = key.match(/^(.+) ما (?:يشتغل|تشتغل)$/);
    if (m) return `${translateArabicNounPhrase(m[1])} does not work`;

    m = key.match(/^(.+) ما (?:تنرسل|ينرسل)$/);
    if (m) return `${translateArabicNounPhrase(m[1])} is not sending`;

    m = key.match(/^(.+) ما وصل$/);
    if (m) return `${translateArabicNounPhrase(m[1])} did not arrive`;

    m = key.match(/^(.+) (?:بيضل|بتضل|يضل|تضل) (متصل|يتصل|تحميل|إرسال|ارسال|عالق على الاتصال|عالق على التحميل|عالق على الإرسال)$/);
    if (m) return `${translateArabicNounPhrase(m[1])} stays ${translateArabicStateToEnglish(m[2])}`;

    m = key.match(/^(.+) فيه مشكلة$/);
    if (m) return `${translateArabicNounPhrase(m[1])} has an issue`;
  }

  return null;
}

function pairKey(src, tgt) {
  return `${String(src || "").toLowerCase()}:${String(tgt || "").toLowerCase()}`;
}

function lookupChatPhrase(src, tgt, text) {
  const map = PHRASES[pairKey(src, tgt)];
  const key = normalizeKey(text);
  if (!key) return null;
  return map?.[key] || lookupDynamicPhrase(src, tgt, text) || null;
}

function lookupChatWord(src, tgt, token) {
  const map = WORDS[pairKey(src, tgt)];
  if (!map) return null;
  const key = normalizeKey(token);
  if (!key) return null;
  return map[key] || null;
}

module.exports = {
  lookupChatPhrase,
  lookupChatWord,
};
