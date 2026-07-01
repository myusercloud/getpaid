import { db } from "./db";
import { fetchRandomYouTubeVideos } from "./youtube";

export async function refreshVideos(count = 15) {
  const videos = await fetchRandomYouTubeVideos(count);

  await db.video.updateMany({ where: { isActive: true }, data: { isActive: false } });

  const upserted = await Promise.all(
    videos.map((v) => {
      const minWatchPercent = v.duration < 300 ? 80 : v.duration < 600 ? 70 : 60;
      const reward = v.duration < 300 ? 15 : v.duration < 600 ? 20 : 25;
      return db.video.upsert({
        where: { youtubeId: v.youtubeId },
        update: { title: v.title, description: v.description, thumbnail: v.thumbnail, duration: v.duration, minWatchPercent, reward, isActive: true },
        create: { title: v.title, description: v.description, youtubeId: v.youtubeId, thumbnail: v.thumbnail, duration: v.duration, minWatchPercent, reward, isActive: true },
      });
    })
  );

  return { refreshed: upserted.length, videos: upserted };
}
