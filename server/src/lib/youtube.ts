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
}

export async function fetchRandomYouTubeVideos(count = 5): Promise<YTVideo[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error("YOUTUBE_API_KEY is not configured");

  const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];

  const params = new URLSearchParams({
    part: "snippet",
    q: topic,
    type: "video",
    videoEmbeddable: "true",
    videoDuration: "medium",
    relevanceLanguage: "en",
    safeSearch: "strict",
    maxResults: "25",
    key: apiKey,
  });

  const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(`YouTube API ${res.status}: ${body?.error?.message ?? res.statusText}`);
  }

  const data = await res.json() as {
    items: Array<{
      id: { videoId: string };
      snippet: {
        title: string;
        description: string;
        thumbnails: { high?: { url: string }; medium?: { url: string } };
      };
    }>;
  };

  const items = (data.items ?? []).filter((i) => i.id?.videoId);

  return items
    .sort(() => Math.random() - 0.5)
    .slice(0, count)
    .map((item) => ({
      youtubeId: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description.slice(0, 300),
      thumbnail:
        item.snippet.thumbnails.high?.url ??
        item.snippet.thumbnails.medium?.url ??
        `https://img.youtube.com/vi/${item.id.videoId}/maxresdefault.jpg`,
    }));
}
