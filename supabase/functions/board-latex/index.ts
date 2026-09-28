// Рукопис на дошці → друкований слайд LaTeX Beamer.
//
// Кабінет надсилає сюди картинку виділеного на дошці (PNG), розпізнавач
// читає рукописне й повертає зміст слайда: заголовок і блоки (текст,
// формули, пункти). Сам слайд — картинку й файл .tex — збирає вже браузер.
//
// Розпізнавач обирається за тим, який ключ лежить у секретах Supabase:
//   ANTHROPIC_API_KEY — Claude (платно, найточніше читає почерк);
//   GEMINI_API_KEY    — Gemini Flash від Google (безкоштовний рівень із
//                       лімітами; Google може використовувати надіслане
//                       для покращення своїх продуктів).
// Лежать обидва — працює Claude, а якщо він не відповів (скажімо,
// скінчились кошти), виручає Gemini.
//
// Ключі лежать лише тут і в браузер не потрапляють ніколи. Викликати
// функцію може тільки той, хто увійшов у кабінет: токен входу перевіряємо
// самі, навіть якщо шлюз Supabase перевірку JWT уже зробив.

import Anthropic from "npm:@anthropic-ai/sdk";

const ALLOWED_ORIGINS = [
  "https://mathhub-7dw.pages.dev",
  "http://localhost:8765",
];

function cors(origin: string | null): Record<string, string> {
  const allow = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(body: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(origin), "Content-Type": "application/json; charset=utf-8" },
  });
}

const SYSTEM = `You transcribe a photo of a maths tutor's whiteboard into the content of one LaTeX Beamer slide.

The image shows a selection from a digital whiteboard: handwritten text and mathematics (mostly Ukrainian, sometimes English or Russian), possibly with hand-drawn diagrams.

Transcribe faithfully:
- Keep the original language, wording, order and line structure. Do not translate, summarise, solve, complete or correct anything — if the handwriting contains a mistake, keep the mistake.
- Write every formula in standard LaTeX that MathJax understands (amsmath, amssymb). Use Ukrainian school notation as written (tg, ctg, lg): write \\tg, \\ctg, \\lg.
- If a symbol is truly illegible, write your best reading; never invent extra content.

Return only a JSON object, no prose and no code fences, with this shape:
{
  "lang": "uk" | "en" | "ru",
  "title": string,
  "blocks": [ { "kind": "text" | "math" | "item" | "figure", "tex": string } ],
  "drawings": boolean
}

- "title": a short slide title only if the board clearly has a heading; otherwise "".
- "text": a line of prose; inline mathematics goes inside $...$.
- "math": one displayed formula or a chain of equalities, LaTeX without $ delimiters. For several aligned lines use \\begin{aligned} ... \\end{aligned} with \\\\ between lines.
- "item": one bullet or numbered point; inline mathematics inside $...$.
- "figure": a hand-drawn graph, diagram or geometric drawing that cannot be written as text; "tex" is a short description of it in the board's language.
- "drawings": true if there is at least one "figure" block.`;

const PROMPT = "Transcribe this board selection into the slide JSON.";

type Block = { kind: string; tex: string };
type Slide = { lang: string; title: string; blocks: Block[]; drawings: boolean };

function parseSlide(text: string): Slide | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const raw = JSON.parse(text.slice(start, end + 1));
    const kinds = ["text", "math", "item", "figure"];
    const blocks: Block[] = Array.isArray(raw.blocks)
      ? raw.blocks
        .filter((b: Block) => b && kinds.includes(b.kind) && typeof b.tex === "string" && b.tex.trim())
        .map((b: Block) => ({ kind: b.kind, tex: b.tex.trim() }))
      : [];
    return {
      lang: ["uk", "en", "ru"].includes(raw.lang) ? raw.lang : "uk",
      title: typeof raw.title === "string" ? raw.title.trim() : "",
      blocks,
      drawings: !!raw.drawings || blocks.some((b) => b.kind === "figure"),
    };
  } catch {
    return null;
  }
}

// Помилка розпізнавача з кодом, який кабінет перекладає людською мовою.
// detail — що саме сказав постачальник: кабінет показує це в повідомленні,
// щоб причину було видно одразу, без журналів Supabase.
class RecognizerError extends Error {
  constructor(public code: string, public status: number, public detail = "") {
    super(code);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function viaClaude(image: string): Promise<string> {
  const client = new Anthropic(); // ANTHROPIC_API_KEY — із секретів функції
  try {
    const response = await client.beta.messages.create({
      model: "claude-opus-5",
      max_tokens: 16000,
      // відмову безпеки (дуже малоймовірну тут) сервер переграє на запасній моделі
      betas: ["server-side-fallback-2026-06-01"],
      fallbacks: [{ model: "claude-opus-4-8" }],
      // посеред уроку чекати хвилину не можна: для переписування рукопису
      // середнього рівня міркувань досить
      output_config: { effort: "medium" },
      system: SYSTEM,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: "image/png", data: image } },
          { type: "text", text: PROMPT },
        ],
      }],
    });
    if (response.stop_reason === "refusal") throw new RecognizerError("refusal", 422);
    return response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("\n");
  } catch (error) {
    if (error instanceof RecognizerError) throw error;
    if (error instanceof Anthropic.AuthenticationError) throw new RecognizerError("bad-key", 503, "Claude");
    if (error instanceof Anthropic.RateLimitError) throw new RecognizerError("busy", 429, "Claude");
    if (error instanceof Anthropic.APIError) {
      console.error("anthropic", error.status, error.message);
      throw new RecognizerError("api", 502, `Claude ${error.status}: ${error.message}`.slice(0, 300));
    }
    throw error;
  }
}

// Найновіша стабільна Flash, а якщо Google її вже прибрав чи перейменував —
// старша, що точно є на безкоштовному рівні. GEMINI_MODEL у секретах
// дозволяє задати свою, не чіпаючи коду.
const GEMINI_MODELS = [Deno.env.get("GEMINI_MODEL") || "gemini-3.8-flash", "gemini-2.5-flash"];
const GEMINI_BLOCKED = ["SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST", "SPII", "IMAGE_SAFETY", "RECITATION"];

type GeminiPart = { text?: string; thought?: boolean };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function googleMessage(body: any): string {
  const e = body && body.error;
  return String((e && (e.message || e.status)) || JSON.stringify(body)).slice(0, 240);
}

/* Google часто відповідає «модель перевантажена» (503) — тоді ще раз за
   мить, а далі запасна модель. Вичерпаний ліміт однієї моделі (429) — теж
   привід спробувати іншу: квоти в них окремі. Що саме сказав Google,
   повертаємо кабінету, щоб причину було видно одразу. */
async function viaGemini(image: string, key: string): Promise<string> {
  const tried: Record<string, string> = {};    // остання відповідь кожної моделі
  let limited = false;
  for (const model of GEMINI_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM }] },
            contents: [{
              role: "user",
              parts: [
                { inlineData: { mimeType: "image/png", data: image } },
                { text: PROMPT },
              ],
            }],
            generationConfig: { responseMimeType: "application/json" },
          }),
        },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = googleMessage(body);
        console.error("gemini", model, res.status, msg);
        tried[model] = `${model} ${res.status}: ${msg}`;
        if (res.status >= 500 && attempt === 0) { await sleep(1500); continue; }
        if (res.status >= 500 || res.status === 404) break;          // до наступної моделі
        if (res.status === 429) { limited = true; break; }
        if (/API[_ ]key/i.test(msg)) throw new RecognizerError("bad-key", 503, `Gemini: ${msg}`);
        throw new RecognizerError("api", 502, `Gemini ${res.status}: ${msg}`);
      }
      if (body.promptFeedback?.blockReason) throw new RecognizerError("refusal", 422);
      const cand = body.candidates?.[0];
      if (!cand) throw new RecognizerError("empty", 422);
      if (GEMINI_BLOCKED.includes(cand.finishReason)) throw new RecognizerError("refusal", 422);
      return ((cand.content?.parts || []) as GeminiPart[])
        .filter((p) => p.text && !p.thought)     // міркування моделі — не відповідь
        .map((p) => p.text)
        .join("\n");
    }
  }
  const detail = Object.values(tried).join(" · ").slice(0, 400);
  if (limited) throw new RecognizerError("busy", 429, detail);
  throw new RecognizerError("api", 502, detail);
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (req.method !== "POST") return json({ error: "method" }, 405, origin);

  // хто питає: лише той, хто увійшов у кабінет
  const auth = req.headers.get("authorization") || "";
  const apikey = req.headers.get("apikey") || Deno.env.get("SUPABASE_ANON_KEY") || "";
  const who = await fetch(`${Deno.env.get("SUPABASE_URL")}/auth/v1/user`, {
    headers: { Authorization: auth, apikey },
  });
  if (!who.ok) return json({ error: "auth" }, 401, origin);

  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (!anthropicKey && !geminiKey) return json({ error: "no-key" }, 503, origin);

  let image = "";
  try {
    const body = await req.json();
    image = String(body.image || "");
  } catch {
    return json({ error: "body" }, 400, origin);
  }
  // PNG у base64 без префікса data:, не більше ~6 МБ
  if (!image || image.length > 8_000_000 || !/^[A-Za-z0-9+/=]+$/.test(image)) {
    return json({ error: "image" }, 400, origin);
  }

  try {
    let text: string;
    if (anthropicKey) {
      try {
        text = await viaClaude(image);
      } catch (error) {
        if (!geminiKey) throw error;
        console.error("claude failed, trying gemini", error);
        text = await viaGemini(image, geminiKey);
      }
    } else {
      text = await viaGemini(image, geminiKey!);
    }
    const slide = parseSlide(text);
    if (!slide || !slide.blocks.length) return json({ error: "empty" }, 422, origin);
    return json(slide, 200, origin);
  } catch (error) {
    if (error instanceof RecognizerError) {
      return json({ error: error.code, detail: error.detail || undefined }, error.status, origin);
    }
    console.error(error);
    return json({ error: "server", detail: String(error).slice(0, 240) }, 500, origin);
  }
});
