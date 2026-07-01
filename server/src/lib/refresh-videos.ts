import { fetchRandomYouTubeVideos } from "./youtube";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  console.log("Fetching videos from YouTube API…");
  const videos = await fetchRandomYouTubeVideos(15);
  console.log(`Got ${videos.length} embeddable videos:`);
  videos.forEach((v) => console.log(`  • ${v.youtubeId} — ${v.title} (${Math.round(v.duration / 60)}m)`));

  await db.video.updateMany({ where: { isActive: true }, data: { isActive: false } });

  const upserted = await Promise.all(
    videos.map((v) => {
      const minWatchPercent = v.duration < 300 ? 80 : v.duration < 600 ? 70 : 60;
      const reward = 5;
      return db.video.upsert({
        where: { youtubeId: v.youtubeId },
        update: { title: v.title, description: v.description, thumbnail: v.thumbnail, duration: v.duration, minWatchPercent, reward, isActive: true },
        create: { title: v.title, description: v.description, youtubeId: v.youtubeId, thumbnail: v.thumbnail, duration: v.duration, minWatchPercent, reward, isActive: true },
      });
    })
  );

  console.log(`✅ ${upserted.length} videos saved to database`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
