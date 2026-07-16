const assert = require("node:assert/strict");

const {
  generateSmartReplies,
  translateTextLocal,
} = require("../services/ai-local-engine.js");

function smartCase(name, messages, language, expectedIntentPart, expectedAny) {
  const result = generateSmartReplies({ messages, language });
  assert.equal(Array.isArray(result.replies), true, `${name}: replies array`);
  assert.equal(result.replies.length, 3, `${name}: exactly 3 replies`);
  assert.equal(new Set(result.replies).size, 3, `${name}: unique replies`);
  assert.match(
    String(result.intent || ""),
    new RegExp(expectedIntentPart),
    `${name}: intent ${expectedIntentPart}`,
  );
  const joined = result.replies.join(" ");
  assert.match(joined, new RegExp(expectedAny, "i"), `${name}: useful reply`);
  assert.doesNotMatch(joined, /undefined|null|\[object object\]/i, `${name}: no garbage`);
  return result;
}

function translateCase(text, targetLanguage, expected) {
  const result = translateTextLocal(text, "auto", targetLanguage);
  assert.equal(
    result.translatedText,
    expected,
    `translate ${JSON.stringify(text)} -> ${targetLanguage}`,
  );
  return result;
}

function translateChatCase(text, uiLanguage, expected) {
  const result = translateTextLocal(text, "auto", uiLanguage, {
    uiLanguage,
  });
  assert.equal(
    result.translatedText,
    expected,
    `chat translate ${JSON.stringify(text)} ui=${uiLanguage}`,
  );
  return result;
}

const smartResults = [
  smartCase(
    "stress",
    [{ sender: "them", text: "I am so stressed with this deadline and I dont know what to do?" }],
    "en",
    "vegasphere-mind:empathy",
    "breath|step|urgent|priorit",
  ),
  smartCase(
    "technical",
    [{ sender: "them", text: "the app has a build error after deploy can you fix it?" }],
    "en",
    "technical_problem",
    "error|logs|debug|failing|changed",
  ),
  smartCase(
    "arabic technical call",
    [{ sender: "them", text: "في مشكلة بالمكالمة بعد ما ارد بتضل متصل" }],
    "ar",
    "technical_problem",
    "لوجز|تفشل|الخطأ|المشكلة",
  ),
  smartCase(
    "money free",
    [{ sender: "them", text: "i need something free fast reliable and not paid" }],
    "en",
    "money",
    "free|cost|monthly|reliable|stable",
  ),
  smartCase(
    "security",
    [{ sender: "them", text: "my account login looks hacked what should I do?" }],
    "en",
    "security",
    "password|sessions|secure|logs|secrets",
  ),
  smartCase(
    "clarification",
    [{ sender: "them", text: "what do you mean by that?" }],
    "en",
    "clarification",
    "explain|clarified|clear|confused",
  ),
  smartCase(
    "follow up",
    [{ sender: "me", text: "I fixed the first issue" }, { sender: "them", text: "what next?" }],
    "en",
    "follow_up",
    "next|after|verify|logs|test",
  ),
  smartCase(
    "arabic clarification",
    [{ sender: "them", text: "شو قصدك؟ وضحلي" }],
    "ar",
    "clarification",
    "ببساطة|قصدي|توضيح|لخبطك",
  ),
  smartCase(
    "testing workflow",
    [{ sender: "them", text: "test it again and check the console" }],
    "en",
    "testing",
    "test|verify|logs|console|flow",
  ),
  smartCase(
    "completion workflow",
    [{ sender: "them", text: "done it works now" }],
    "en",
    "completion",
    "verify|refresh|edge|done|confirm",
  ),
  smartCase(
    "improve request",
    [{ sender: "them", text: "not good enough make it stronger" }],
    "en",
    "improve_request",
    "stronger|coverage|ranking|regression|weak",
  ),
];

const translationResults = [
  translateCase("what do you mean", "ar", "شو قصدك؟"),
  translateCase("the app has a bug", "ar", "التطبيق فيه مشكلة"),
  translateCase("please help me tomorrow", "ar", "من فضلك ساعدني غداً"),
  translateCase("ما بعرف شو صار", "en", "I don't know what happened"),
  translateCase("وينك هلق", "en", "where are you now?"),
  translateCase("ممكن تساعدني", "en", "can you help me?"),
  translateCase("it didn't work", "ar", "ما زبط"),
  translateCase("stuck connected", "ar", "عالق على متصل"),
  translateCase("black screen", "ar", "شاشة سوداء"),
  translateCase("ما يشتغل", "en", "it does not work"),
  translateCase("عالق على متصل", "en", "stuck connected"),
  translateCase("can you fix bug", "ar", "ممكن تصلح المشكلة؟"),
  translateCase("where is call", "ar", "وين المكالمة؟"),
  translateCase("call is not working", "ar", "المكالمة ما تشتغل"),
  translateCase("ممكن تصلح المشكلة", "en", "can you fix the issue?"),
  translateCase("وين مكالمة", "en", "where is the call?"),
  translateCase("please check logs", "ar", "من فضلك أن تتحقق من اللوجز"),
  translateCase("please test call", "ar", "من فضلك أن تختبر المكالمة"),
  translateCase("التطبيق فيه مشكلة", "en", "the app has an issue"),
  translateCase("المكالمة ما تشتغل", "en", "the call does not work"),
  translateCase("after i answer caller stays connecting", "ar", "بعد ما أرد المتصل يضل عالق على الاتصال"),
  translateCase("بعد ما ارد المتصل بيضل يتصل", "en", "after I answer the caller stays connecting"),
  translateCase("i can't hear you", "ar", "ما بقدر أسمعك"),
  translateCase("ما بقدر اشوفك", "en", "I can't see you"),
  translateCase("message is not sending", "ar", "الرسالة ما تنرسل"),
  translateCase("الرسالة ما تنرسل", "en", "the message is not sending"),
  translateCase("notification did not arrive", "ar", "الإشعار ما وصل"),
  translateCase("الاشعار ما وصل", "en", "the notification did not arrive"),
  translateCase("camera is not working", "ar", "الكاميرا ما تشتغل"),
  translateCase("الميكروفون ما يشتغل", "en", "the microphone does not work"),
  translateChatCase("the app has a bug", "ar", "التطبيق فيه مشكلة"),
  translateChatCase("التطبيق فيه مشكلة", "ar", "the app has an issue"),
  translateChatCase("what do you mean", "ar", "شو قصدك؟"),
  translateChatCase("ما بعرف شو صار", "en", "I don't know what happened"),
];

console.log(
  JSON.stringify(
    {
      ok: true,
      smartCases: smartResults.map((r) => ({
        intent: r.intent,
        replies: r.replies,
      })),
      translationCases: translationResults.map((r) => ({
        method: r.method,
        detectedSource: r.detectedSource,
        targetLanguage: r.targetLanguage,
        translatedText: r.translatedText,
      })),
    },
    null,
    2,
  ),
);
