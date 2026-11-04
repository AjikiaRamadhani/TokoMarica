import { getVideoEmbedUrl } from "@/lib/video-embed";

export default function VideoEmbed({
  videoUrl,
  videoProvider,
  title,
}: {
  videoUrl: string | null | undefined;
  videoProvider?: string | null;
  title: string;
}) {
  const embed = getVideoEmbedUrl(videoUrl, videoProvider);
  if (!embed) return null;

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-[0_18px_40px_rgba(30,20,10,0.16)]">
      <iframe
        src={embed.url}
        title={title}
        className="absolute inset-0 h-full w-full"
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  );
}
