import { FileText } from "lucide-react";

export function PageThumbnail({
  title,
  initialUrl,
  version,
}: {
  title: string;
  initialUrl: string | null;
  version: number | null;
}) {
  const src = initialUrl ? `${initialUrl}?v=${version ?? 0}` : null;

  return (
    <div className="absolute inset-0 bg-[#fbfbfc]">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={title} className="h-full w-full object-cover object-top" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[#cdd2d8]">
          <FileText size={22} strokeWidth={1.5} />
        </div>
      )}
    </div>
  );
}
