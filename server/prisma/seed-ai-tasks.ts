/**
 * Seed script for AI task categories.
 * Run with: npx ts-node prisma/seed-ai-tasks.ts
 * Uses upsert on title so re-running is safe.
 * All tasks are prefixed [SEED] to distinguish them from production content.
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const tasks = [
  // ── RESPONSE_COMPARISON ────────────────────────────────────────────────────
  {
    title: "[SEED] Compare: Python list comprehension explanations",
    description: "Pick the clearer explanation and justify your choice.",
    category: "RESPONSE_COMPARISON" as const,
    prompt: "A student asked: 'What is a list comprehension in Python and when should I use it?' Read both responses below and decide which one explains the concept more clearly for a beginner.",
    rubric: "Consider: accuracy, clarity for a beginner, use of examples, and conciseness. State which response (A or B) is better and explain why in 2–3 sentences.",
    options: {
      a: "A list comprehension lets you build a list from an existing sequence in one line. For example: `[x*2 for x in range(5)]` gives `[0, 2, 4, 6, 8]`. Use it when the logic is simple and readability matters.",
      b: "List comprehensions are syntactic sugar over a for-loop with .append(). They evaluate an expression for each item in an iterable and collect results into a list. They're Pythonic and often faster than explicit loops for simple transformations.",
    },
    reward: 5,
  },
  {
    title: "[SEED] Compare: Explanations of HTTP vs HTTPS",
    description: "Evaluate which response better explains the security difference.",
    category: "RESPONSE_COMPARISON" as const,
    prompt: "A user asked: 'What is the difference between HTTP and HTTPS, and does it matter for a personal blog?' Evaluate both AI-generated responses.",
    rubric: "Which response is more accurate and appropriate for a non-technical user? Cite a specific strength and weakness of each before stating your choice.",
    options: {
      a: "HTTP transfers data in plain text — anyone on the network could read it. HTTPS encrypts the connection using TLS so data stays private. For a personal blog, HTTPS still matters: modern browsers mark HTTP sites as 'Not Secure', which may deter visitors.",
      b: "HTTPS is the secure version of HTTP. It uses SSL certificates to encrypt data between the browser and server. While a personal blog may not handle sensitive data, using HTTPS improves SEO rankings and builds reader trust. Most hosting providers offer free certificates via Let's Encrypt.",
    },
    reward: 5,
  },
  {
    title: "[SEED] Compare: Advice on handling merge conflicts in Git",
    description: "Identify which response gives safer, more actionable guidance.",
    category: "RESPONSE_COMPARISON" as const,
    prompt: "A developer asked: 'I have a merge conflict in Git. How do I resolve it without losing my changes?' Compare the two AI responses.",
    rubric: "Which response is more accurate and less likely to cause data loss? Flag any risky or incorrect advice.",
    options: {
      a: "Open the conflicting file and look for the markers: `<<<<<<< HEAD`, `=======`, and `>>>>>>> branch-name`. The top section is your current branch, the bottom is the incoming branch. Edit the file to keep the correct content, then run `git add <file>` and `git commit`.",
      b: "The easiest way to fix a merge conflict is to run `git checkout --theirs <file>` which automatically accepts the incoming changes. Then stage and commit. If you want to keep your changes instead, use `git checkout --ours <file>`.",
    },
    reward: 5,
  },

  // ── DATA_ANNOTATION ────────────────────────────────────────────────────────
  {
    title: "[SEED] Annotate: Classify customer feedback sentiment",
    description: "Label each sentence as Positive, Negative, or Neutral.",
    category: "DATA_ANNOTATION" as const,
    prompt: "Classify the sentiment of each customer feedback sentence below. Label each as Positive, Negative, or Neutral, and briefly note the key signal word or phrase.\n\n1. \"The delivery was fast but the packaging was completely crushed.\"\n2. \"Honestly, this is exactly what I needed — works perfectly.\"\n3. \"I received my order yesterday.\"\n4. \"Customer support took three days to respond and never solved my issue.\"\n5. \"The product is fine, nothing special.\"",
    rubric: "Format your answer as a numbered list matching the sentences. Example: '1. Negative — completely crushed signals damage dissatisfaction'. Be concise — one line per sentence.",
    reward: 5,
  },
  {
    title: "[SEED] Annotate: Tag named entities in news excerpt",
    description: "Identify and label PERSON, ORGANIZATION, LOCATION, and DATE entities.",
    category: "DATA_ANNOTATION" as const,
    prompt: "Read the following excerpt and annotate every named entity with its type in square brackets. Use these tags: [PERSON], [ORG], [LOC], [DATE].\n\n\"On March 15, 2024, Amara Osei, CEO of NovaBridge Technologies, announced a new partnership with the University of Nairobi to develop AI tools for smallholder farmers across East Africa. The initiative is funded by the Gates Foundation and is expected to launch by Q4 2025.\"",
    rubric: "List every tagged entity on a separate line in the format: entity → [TYPE]. Include the exact text as it appears in the excerpt. Do not skip entities.",
    reward: 5,
  },
  {
    title: "[SEED] Annotate: Rate instruction-following quality",
    description: "Score an AI response on how well it followed the original instruction.",
    category: "DATA_ANNOTATION" as const,
    prompt: "Instruction given to the AI: 'Write a haiku about rain. Do not use the word rain.'\n\nAI response:\n\"Drops kiss the rooftop,\nSilver rivers trace the glass,\nEarth breathes out again.\"\n\nScore this response on a 1–5 scale for instruction-following quality, where 1 = ignored the instruction completely and 5 = followed all constraints perfectly.",
    rubric: "Give a score (1–5) and a 1–2 sentence justification. Check: (1) Is it a haiku (5-7-5 syllables)? (2) Does it avoid the word 'rain'?",
    reward: 5,
  },

  // ── TRANSCRIPTION ──────────────────────────────────────────────────────────
  {
    title: "[SEED] Transcription: Correct an AI-generated transcript",
    description: "Fix errors in a simulated auto-transcribed passage.",
    category: "TRANSCRIPTION" as const,
    prompt: "The following text is an auto-transcription of a short voice recording. It contains approximately 5–8 errors (wrong words, missing punctuation, incorrect capitalization). Correct the transcript.\n\nAuto-transcription:\n\"the quarterly results where better then expected thanks two strong performance in are east africa devision. revenue grew buy twelve percent year over year. the c-e-o emphasized that this reflected improvments in are supply chain not one-time factors\"",
    rubric: "Produce the corrected transcript as a clean paragraph. Do not list the errors separately — just provide the corrected version. Ensure proper punctuation and capitalization.",
    reward: 5,
  },
  {
    title: "[SEED] Transcription: Format a raw spoken-word transcript",
    description: "Clean and format an unstructured transcript into readable paragraphs.",
    category: "TRANSCRIPTION" as const,
    prompt: "Below is a raw transcript of a podcast segment. It lacks punctuation, has filler words, and is unformatted. Rewrite it as clean, readable prose — remove filler words (um, uh, like, you know), add punctuation, and break it into 2–3 short paragraphs.\n\nRaw: \"so um the thing about machine learning is like you need data right a lot of data and you know people underestimate this um you can have the best model architecture but if your data is bad or biased then like the model is gonna be bad too and uh that's why data collection and cleaning is honestly like eighty percent of the work you know\"",
    rubric: "Output clean paragraphs only — no bullet points. Preserve the speaker's meaning. Remove all filler words.",
    reward: 5,
  },
  {
    title: "[SEED] Transcription: Identify speaker turns in a dialogue",
    description: "Label each line of a two-person conversation with Speaker A or Speaker B.",
    category: "TRANSCRIPTION" as const,
    prompt: "The following is a mixed-up transcript of a two-person customer support call. Using context clues, label each line as either Speaker A (the customer) or Speaker B (the support agent).\n\n1. \"Hello, thank you for calling. How can I help you today?\"\n2. \"Hi, I ordered something last week and it still hasn't arrived.\"\n3. \"I'm sorry to hear that. Can I get your order number?\"\n4. \"Sure, it's 9 9 4 7 dash B.\"\n5. \"Got it. I can see your package is in transit and should arrive by Friday.\"\n6. \"Okay that's a relief. Can you send me an email confirmation?\"\n7. \"Absolutely, I'll send that right now. Is there anything else I can help with?\"\n8. \"No, that's all. Thanks.\"",
    rubric: "Format as a numbered list: '1. Speaker B', '2. Speaker A', etc. No explanation needed.",
    reward: 5,
  },

  // ── PROMPT_WRITING ─────────────────────────────────────────────────────────
  {
    title: "[SEED] Write a prompt: Generate creative product names",
    description: "Write an LLM prompt that reliably produces creative product name ideas.",
    category: "PROMPT_WRITING" as const,
    prompt: "Write a prompt that, when given to an AI assistant, will produce a list of 5 creative product names for a new brand of reusable bamboo water bottles targeting young professionals. The prompt should: (1) specify the target audience, (2) request a short tagline for each name, (3) ask for names that feel modern and eco-conscious without being clichéd.",
    rubric: "Your response should be the prompt itself — not a list of product names. The prompt should be 3–8 sentences and could be copy-pasted directly into an AI chat. Include all three requirements listed above.",
    reward: 5,
  },
  {
    title: "[SEED] Write a prompt: Extract structured data from unstructured text",
    description: "Write a prompt that instructs an AI to extract fields from free-text and return JSON.",
    category: "PROMPT_WRITING" as const,
    prompt: "Write a system-level prompt for an AI assistant that will receive free-text job descriptions and must extract the following fields into a JSON object: job_title, company_name, location (city + country), salary_range (or null if not mentioned), and required_years_experience (or null). The prompt should: handle missing fields gracefully, output valid JSON only (no surrounding text), and work for job descriptions in any format.",
    rubric: "Output the prompt only. It should be usable as a system prompt. Include explicit handling for missing fields and a JSON-only output instruction.",
    reward: 5,
  },
  {
    title: "[SEED] Write a prompt: Teach a concept via Socratic questioning",
    description: "Write a prompt that makes an AI teach through questions rather than direct explanation.",
    category: "PROMPT_WRITING" as const,
    prompt: "Write a prompt that instructs an AI to teach the concept of 'compound interest' to a high school student using only Socratic questioning — it should ask questions to guide the student toward understanding, not explain the concept directly. The prompt should: tell the AI to never give a direct definition, use real-world relatable examples in its questions, and stop after the student demonstrates understanding.",
    rubric: "Output the prompt only, written in second person addressing the AI ('You are...' or 'When the user...'). The prompt should make the Socratic method unambiguous to the AI.",
    reward: 5,
  },
];

async function main() {
  console.log(`Seeding ${tasks.length} AI tasks…`);

  for (const task of tasks) {
    const existing = await db.aiTask.findFirst({ where: { title: task.title } });
    if (existing) {
      await db.aiTask.update({ where: { id: existing.id }, data: task });
      console.log(`  updated: ${task.title}`);
    } else {
      await db.aiTask.create({ data: task });
      console.log(`  created: ${task.title}`);
    }
  }

  console.log("Done.");
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
