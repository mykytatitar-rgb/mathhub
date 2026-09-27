// Рукопис на дошці → друкований слайд LaTeX Beamer.
//
// Кабінет надсилає сюди картинку виділеного на дошці (PNG), Claude читає
// рукописне й повертає зміст слайда: заголовок і блоки (текст, формули,
// пункти). Сам слайд — картинку й файл .tex — збирає вже браузер.
//
// Ключ Anthropic лежить лише тут, у секретах Supabase (ANTHROPIC_API_KEY),
// і в браузер не потрапляє ніколи. Викликати функцію може тільки той, хто
// увійшов у кабінет: токен входу перевіряємо самі, навіть якщо шлюз
// Supabase перевірку JWT уже зробив.

import Anthropic from "npm:@anthropic-ai/sdk";

const client = new Anthropic(); // ANTHROPIC_API_KEY — із секретів функції

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

  if (!Deno.env.get("ANTHROPIC_API_KEY")) return json({ error: "no-key" }, 503, origin);

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
          { type: "text", text: "Transcribe this board selection into the slide JSON." },
        ],
      }],
    });

    if (response.stop_reason === "refusal") return json({ error: "refusal" }, 422, origin);

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("\n");
    const slide = parseSlide(text);
    if (!slide || !slide.blocks.length) return json({ error: "empty" }, 422, origin);
    return json(slide, 200, origin);
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) return json({ error: "bad-key" }, 503, origin);
    if (error instanceof Anthropic.RateLimitError) return json({ error: "busy" }, 429, origin);
    if (error instanceof Anthropic.APIError) {
      console.error("anthropic", error.status, error.message);
      return json({ error: "api", status: error.status }, 502, origin);
    }
    console.error(error);
    return json({ error: "server" }, 500, origin);
  }
});
