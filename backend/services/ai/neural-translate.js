/**
 * Local neural EN↔AR translation (OPUS-MT via Transformers.js).
 * Lazy-loaded; used when lookup misses or returns partial English/Arabic mix.
 */
const path = require("path");

const MODELS = {
  "en:ar": "Xenova/opus-mt-en-ar",
  "ar:en": "Xenova/opus-mt-ar-en",
};

const MAX_NEURAL_CHARS = 1200;
const NEURAL_CACHE_MAX = 500;

const disabled = String(process.env.AI_NEURAL_TRANSLATE || "1").trim() === "0";

let pipelineFactory = null;
let envConfig = null;
const pipelines = new Map();
let loadPromise = null;
const neuralCache = new Map();

function configureEnv() {
  if (envConfig) return;
  const { env } = require("@xenova/transformers");
  env.cacheDir = path.join(__dirname, "..", "..", ".cache", "transformers");
  env.allowLocalModels = false;
  env.useBrowserCache = false;
  envConfig = env;
}

async function loadTransformers() {
  if (pipelineFactory) return pipelineFactory;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    configureEnv();
    const { pipeline } = require("@xenova/transformers");
    pipelineFactory = pipeline;
    return pipeline;
  })();
  return loadPromise;
}

async function getPipeline(src, tgt) {
  const key = `${src}:${tgt}`;
  const modelId = MODELS[key];
  if (!modelId) return null;
  if (pipelines.has(key)) return pipelines.get(key);

  const pipeline = await loadTransformers();
  console.log(`[ai-neural] loading ${modelId}…`);
  const instance = await pipeline("translation", modelId, {
    quantized: true,
  });
  pipelines.set(key, instance);
  console.log(`[ai-neural] ready ${modelId}`);
  return instance;
}

function cacheKey(text, src, tgt) {
  return `${src}:${tgt}:${text.toLowerCase().trim()}`;
}

async function translateNeural(text, src, tgt) {
  if (disabled) return null;
  const trimmed = String(text || "").trim();
  if (!trimmed || trimmed.length > MAX_NEURAL_CHARS) return null;
  if (src !== "en" && src !== "ar") return null;
  if (tgt !== "en" && tgt !== "ar") return null;
  if (src === tgt) return null;

  const ck = cacheKey(trimmed, src, tgt);
  if (neuralCache.has(ck)) return neuralCache.get(ck);

  try {
    const translator = await getPipeline(src, tgt);
    if (!translator) return null;

    const out = await translator(trimmed, {
      max_new_tokens: 256,
    });

    const translated =
      out?.[0]?.translation_text ||
      out?.translation_text ||
      (Array.isArray(out) ? out[0]?.translation_text : null);

    const result = String(translated || "").trim();
    if (!result) return null;

    if (neuralCache.size >= NEURAL_CACHE_MAX) {
      const first = neuralCache.keys().next().value;
      if (first) neuralCache.delete(first);
    }
    neuralCache.set(ck, result);
    return result;
  } catch (err) {
    console.warn("[ai-neural] translate failed:", err?.message || err);
    return null;
  }
}

async function warmNeuralModels() {
  if (disabled) {
    console.log("[ai-neural] disabled (AI_NEURAL_TRANSLATE=0)");
    return { ready: false, disabled: true };
  }
  try {
    await getPipeline("en", "ar");
    return { ready: true, models: [MODELS["en:ar"]] };
  } catch (err) {
    console.warn("[ai-neural] warm-up failed:", err?.message || err);
    return { ready: false, error: err?.message || String(err) };
  }
}

function getNeuralStatus() {
  return {
    enabled: !disabled,
    ready: pipelines.has("en:ar") || pipelines.has("ar:en"),
    models: Object.values(MODELS),
    loaded: [...pipelines.keys()],
  };
}

module.exports = {
  translateNeural,
  warmNeuralModels,
  getNeuralStatus,
  MAX_NEURAL_CHARS,
};
