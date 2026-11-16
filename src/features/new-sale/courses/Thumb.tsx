import { useState } from "react";
import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  src: string | null;
  size: "course" | "module";
};

/** Decorative cover. The name sits beside it, so the image has an empty alt. */
export function Thumb({ src, size }: Props) {
  const [failed, setFailed] = useState(false);
  const box = size === "course" ? "h-9 w-14" : "h-[26px] w-10";
  const icon = size === "course" ? "h-4 w-4" : "h-3.5 w-3.5";
  if (!src || failed) {
    return (
      <span aria-hidden="true" className={cn("grid shrink-0 place-items-center rounded-md bg-[#EAEFF4] text-[#7C8A9A]", box)}>
        <BookOpen className={icon} />
      </span>
    );
  }
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={cn("shrink-0 rounded-md object-cover", box)}
    />
  );
}
