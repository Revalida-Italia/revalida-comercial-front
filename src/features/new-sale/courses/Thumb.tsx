import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  src: string | null;
  size: "course" | "module";
};

/** Decorative cover. A missing or broken file stays the book, never a broken image. */
export function Thumb({ src, size }: Props) {
  const [ready, setReady] = useState(false);
  const box = size === "course" ? "h-9 w-14" : "h-[26px] w-10";
  const icon = size === "course" ? "h-4 w-4" : "h-3.5 w-3.5";

  useEffect(() => {
    const url = src?.trim();
    if (!url) {
      setReady(false);
      return;
    }
    let live = true;
    const probe = new Image();
    probe.onload = () => { if (live) setReady(true); };
    probe.onerror = () => { if (live) setReady(false); };
    probe.src = url;
    return () => { live = false; };
  }, [src]);

  if (!ready) {
    return (
      <span aria-hidden="true" className={cn("grid shrink-0 place-items-center rounded-[0.375rem] bg-[#EAEFF4] text-[#7C8A9A]", box)}>
        <BookOpen className={icon} strokeWidth={1.8} />
      </span>
    );
  }
  return (
    <img src={src ?? ""} alt="" className={cn("shrink-0 rounded-[0.375rem] object-cover", box)} />
  );
}
