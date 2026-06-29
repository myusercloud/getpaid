const TOPICS = [
  "fintech explained for beginners",
  "digital banking technology",
  "decentralized finance DeFi basics",
  "mobile payment systems how they work",
  "financial technology innovation",
  "how digital wallets work",
  "investment basics explained",
  "blockchain technology explained simply",
  "cryptocurrency for beginners",
  "personal finance money management",
  "referral marketing growth strategy",
  "gamification in apps psychology",
];

export interface YTVideo {
  youtubeId: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: number; // seconds, from contentDetails
}

// Parse ISO 8601 duration (e.g. "PT10M30S") → seconds
function parseDuration(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 600;
  return (parseInt(m[1] ?? "0") * 3600) + (parseInt(m[2] ?? "0") * 60) + parseInt(m[3] ?? "0");
}

function ytFetch(url: string): Promise<Response> {
  return fetch(url);
}

async function checkApi(res: Response, label: string) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(`YouTube ${label} ${res.status}: ${body?.error?.message ?? res.statusText}`);
  }
}

export async function fetchRandomYouTubeVideos(count = 5): Promise<YTVideo[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error("YOUTUBE_API_KEY is not configured");

  // ── Step 1: Search ────────────────────────────────────────────────────────
  // Cost: 100 units. Fetch more candidates than needed so step 2 filtering
  // still leaves us with enough.
  const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];

  const searchParams = new URLSearchParams({
    part: "id",
    q: topic,
    type: "video",
    videoEmbeddable: "true",
    videoDuration: "medium",       // 4–20 min — good for educational content
    relevanceLanguage: "en",
    safeSearch: "strict",
    maxResults: "25",
    key: apiKey,
  });

  const searchRes = await ytFetch(`https://www.googleapis.com/youtube/v3/search?${searchParams}`);
  await checkApi(searchRes, "Search");

  const searchData = await searchRes.json() as {
    items: Array<{ id: { videoId: string } }>;
  };

  const candidateIds = (searchData.items ?? [])
    .map((i) => i.id?.videoId)
    .filter(Boolean);

  if (candidateIds.length === 0) throw new Error("YouTube search returned no results");

  // ── Step 2: Verify embeddability + get real duration ──────────────────────
  // Cost: 1 unit per video. status.embeddable is the definitive check —
  // some videos have embedding disabled per-region even if searchable.
  const videoParams = new URLSearchParams({
    part: "snippet,status,contentDetails",
    id: candidateIds.join(","),
    key: apiKey,
  });

  const videoRes = await ytFetch(`https://www.googleapis.com/youtube/v3/videos?${videoParams}`);
  await checkApi(videoRes, "Videos");

  const videoData = await videoRes.json() as {
    items: Array<{
      id: string;
      snippet: {
        title: string;
        description: string;
        thumbnails: { high?: { url: string }; medium?: { url: string }; default?: { url: string } };
      };
      status: { embeddable: boolean };
      contentDetails: { duration: string };
    }>;
  };

  const embeddable = (videoData.items ?? []).filter((v) => v.status?.embeddable === true);

  if (embeddable.length === 0) throw new Error("No embeddable videos found for this topic — try refreshing");

  // Shuffle and take `count`
  return embeddable
    .sort(() => Math.random() - 0.5)
    .slice(0, count)
    .map((v) => ({
      youtubeId: v.id,
      title: v.snippet.title,
      description: (v.snippet.description ?? "").slice(0, 300),
      thumbnail:
        v.snippet.thumbnails.high?.url ??
        v.snippet.thumbnails.medium?.url ??
        v.snippet.thumbnails.default?.url ??
        `https://img.youtube.com/vi/${v.id}/maxresdefault.jpg`,
      duration: parseDuration(v.contentDetails.duration),
    }));
}
