import { Link } from "react-router-dom";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

type EditableSectionProps = {
  children: React.ReactNode;
  editTo: string;
  label?: string;
  className?: string;
};

const EditableSection = ({ children, editTo, label = "Editar", className }: EditableSectionProps) => (
  <div className={cn("group relative -mx-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/40", className)}>
    <Link
      to={editTo}
      title={label}
      aria-label={label}
      className="absolute right-1 top-1 z-10 flex h-8 w-8 items-center justify-center rounded-md border border-border/70 bg-background text-muted-foreground opacity-0 shadow-sm transition-all group-hover:opacity-100 hover:border-primary/40 hover:text-primary"
    >
      <Pencil className="h-4 w-4" />
    </Link>
    {children}
  </div>
);

export default EditableSection;
