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

/* ============================================================
   Режим scene — «Візуалізувати»: задача → код інтерактивної сцени.

   Кабінет надсилає умову словами (prompt) і/або картинку виділеного на
   дошці (image), а для правки — ще й попередній код (code) і помилку,
   якщо сцена не побудувалась (error). Відповідь — { title, code }: код
   виконується в ізольованому вікні сцени (scene.html) з командами S.
   Лише Claude: Gemini такого коду надійно не пише.
   ============================================================ */

const SCENE_SYSTEM = `You write short JavaScript programs that visualise a school or olympiad maths problem for a Ukrainian maths tutor's live lesson. The tutor and the student both see the scene; the tutor rotates it, moves sliders and steps through it while explaining.

Your code runs inside a sandboxed page with two globals: S (the scene API below) and THREE (three.js r159). There is no network, no DOM access except through S, no imports. Do not use fetch, XMLHttpRequest, import, require, eval, localStorage, alert, document or window.

Coordinate system: right-handed, z axis points UP in 3D (like a school textbook). Units are the problem's own units.

API (all points are arrays [x, y, z]; z may be omitted in 2D):
- S.view3d({ camera: [x, y, z], target: [x, y, z] })   3D view, orbiting camera. Default camera [7, 6, 5].
- S.view2d({ x: [xmin, xmax], y: [ymin, ymax] })        flat 2D view (pan/zoom, no rotation). Use for plane geometry and graphs of y = f(x).
- S.caption(text)                                       one short line at the top (Ukrainian).
- S.param(name, { min, max, value, step, label })      a slider; returns its initial value. Declare all params before S.build.
- S.steps([title1, title2, ...])                        step-by-step explanation; p.step is the 0-based current step. Titles are short Ukrainian phrases.
- S.animate(true | 'play')                              enables time; p.t is seconds since start ('play' starts it immediately).
- S.build(function (p) { ... })                         draws the scene. Called again after every slider/step/time change, so build everything inside it. p.<param>, p.step, p.t.
Inside build:
- S.axes(size, { names: ['x','y','z'], labels: true })  axes from -size to size.
- S.grid(size, { step })                                grid in the plane z = 0.
- S.point(p, { color, label, size })
- S.line(a, b, { color, dashed })                       dashed for hidden or auxiliary lines.
- S.polyline(points, { color, dashed })
- S.vector(a, b, { color, label })                      arrow from a to b.
- S.curve(function (t) { return [x, y, z]; }, { t: [a, b], n, color, dashed })
- S.graph(function (x) { return y; }, { x: [a, b], color, dashed })   2D graph in the plane z = 0, breaks at discontinuities.
- S.surface(function (x, y) { return z; }, { x: [a, b], y: [a, b], n, color, opacity, wire })
- S.parametric(function (u, v) { return [x, y, z]; }, { u: [a, b], v: [a, b], n, color, opacity })
- S.polygon(points, { color, opacity, edges, edgeColor })
- S.polyhedron(vertices, faces, { color, opacity, labels: ['A', 'B', ...] })   faces are arrays of vertex indices; semi-transparent by default so hidden edges stay visible.
- S.sphere(center, r, { color, opacity })
- S.label(text, p, { color, size })                    text anchored at a point (use for vertex names, values, angles).
- S.add(object3D)                                       any custom three.js object if the API lacks something.

Colours: main #4B3FDB, accent #E5484D, green #17B26A, orange #F79009, ink #17163A, grey #7E90AE.

How to make a good scene:
- Show exactly what the problem is about: the solid, section, graph, locus, transformation or construction. Mathematically correct coordinates — compute them in code (Math.sqrt, Math.cos...), never eyeball.
- If the problem has a parameter or a moving element, make it a slider. If the solution has natural stages (given → construction → key idea → answer), use S.steps and reveal objects step by step inside build (if (p.step >= 1) ...).
- Do NOT write the full solution text or the final numeric answer in labels unless the request asks for it; the tutor explains. Name points as in the problem.
- All visible text (caption, labels, step titles, slider labels) in Ukrainian, short.
- Keep the code under about 150 lines, plain ES5-style JavaScript (var, function).

Answer format, exactly:
TITLE: <short Ukrainian title of the scene, max 60 characters>
\`\`\`javascript
<the code>
\`\`\``;

const MANIM_SYSTEM = `You write one Manim Community Edition (v0.19+) scene that explains a school or olympiad maths problem for a Ukrainian maths tutor. It is rendered offline on the tutor's Windows laptop (Python 3.12, MiKTeX LaTeX) and played on the lesson whiteboard.

Rules:
- Exactly one scene class named Main. Use ThreeDScene for solids/surfaces, otherwise Scene (or MovingCameraScene).
- from manim import * ; numpy as np allowed; nothing else, no files, no network, no images.
- Ukrainian text: Text(..., font="Segoe UI"). Formulas: MathTex/Tex (LaTeX available). Never put Cyrillic inside MathTex.
- Mathematically exact: compute coordinates in code. Dark background is fine (Manim default).
- Structure the video like a good explainer: the problem, the key construction or idea step by step with self.play and short self.wait, then the conclusion. Do not just show the final answer.
- Length 20-60 seconds. Keep the code under about 200 lines.

Answer format, exactly:
TITLE: <short Ukrainian title, max 60 characters>
\`\`\`python
<the code>
\`\`\``;

function parseScene(text: string): { title: string; code: string } | null {
  const t = text.match(/TITLE:\s*(.+)/);
  const c = text.match(/```(?:javascript|js|python|py)?\s*\n([\s\S]*?)```/);
  if (!c || !c[1].trim()) return null;
  return { title: (t ? t[1] : "Сцена").trim().slice(0, 80), code: c[1].trim() };
}

async function sceneViaClaude(prompt: string, image: string, code: string, error: string, system = SCENE_SYSTEM): Promise<string> {
  const client = new Anthropic();
  // deno-lint-ignore no-explicit-any
  const content: any[] = [];
  if (image) content.push({ type: "image", source: { type: "base64", media_type: "image/png", data: image } });
  let ask = "";
  if (code) {
    ask += "Here is the current scene code:\n```\n" + code + "\n```\n";
    if (error) ask += "It failed with this error: " + error + "\nFix it.\n";
    ask += prompt ? "Change it as the tutor asks: " + prompt : "Return the corrected code.";
  } else {
    ask += image
      ? "Visualise the problem from this picture of the whiteboard." + (prompt ? " Tutor's note: " + prompt : "")
      : "Visualise this problem: " + prompt;
  }
  content.push({ type: "text", text: ask });
  try {
    const response = await client.beta.messages.create({
      model: "claude-opus-5",
      max_tokens: 12000,
      betas: ["server-side-fallback-2026-06-01"],
      fallbacks: [{ model: "claude-opus-4-8" }],
      // сцену чекають посеред уроку: точність геометрії важить, але не хвилина роздумів
      output_config: { effort: "medium" },
      system,
      messages: [{ role: "user", content }],
    });
    if (response.stop_reason === "refusal") throw new RecognizerError("refusal", 422);
    return response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("\n");
  } catch (err) {
    if (err instanceof RecognizerError) throw err;
    if (err instanceof Anthropic.AuthenticationError) throw new RecognizerError("bad-key", 503, "Claude");
    if (err instanceof Anthropic.RateLimitError) throw new RecognizerError("busy", 429, "Claude");
    if (err instanceof Anthropic.APIError) {
      console.error("anthropic scene", err.status, err.message);
      throw new RecognizerError("api", 502, `Claude ${err.status}: ${err.message}`.slice(0, 300));
    }
    throw err;
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

  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (!anthropicKey && !geminiKey) return json({ error: "no-key" }, 503, origin);

  let image = "";
  // deno-lint-ignore no-explicit-any
  let body: any = {};
  try {
    body = await req.json();
    image = String(body.image || "");
  } catch {
    return json({ error: "body" }, 400, origin);
  }

  // «Візуалізувати»: окрема гілка, лише Claude
  if (body.mode === "scene" || body.mode === "manim") {
    if (!anthropicKey) return json({ error: "no-key" }, 503, origin);
    const prompt = String(body.prompt || "").slice(0, 4000);
    const code = String(body.code || "").slice(0, 40000);
    const error = String(body.error || "").slice(0, 1000);
    if (image && (image.length > 8_000_000 || !/^[A-Za-z0-9+/=]+$/.test(image))) {
      return json({ error: "image" }, 400, origin);
    }
    if (!prompt && !image && !code) return json({ error: "empty" }, 400, origin);
    try {
      const scene = parseScene(await sceneViaClaude(prompt, image, code, error,
        body.mode === "manim" ? MANIM_SYSTEM : SCENE_SYSTEM));
      if (!scene) return json({ error: "empty" }, 422, origin);
      return json(scene, 200, origin);
    } catch (err) {
      if (err instanceof RecognizerError) {
        return json({ error: err.code, detail: err.detail || undefined }, err.status, origin);
      }
      console.error(err);
      return json({ error: "server", detail: String(err).slice(0, 240) }, 500, origin);
    }
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
