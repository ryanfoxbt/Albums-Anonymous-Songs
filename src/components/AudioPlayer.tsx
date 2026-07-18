export function AudioPlayer({ src, title }: { src: string; title: string }) {
  return (
    <audio
      controls
      preload="none"
      className="w-full"
      aria-label={`Play ${title}`}
    >
      <source src={src} />
      Your browser does not support the audio element.
    </audio>
  );
}
