/** A published course from the teaching catalog. */
export type CatalogModule = {
  id: string;
  name: string;
  thumbnailUrl: string | null;
};

export type CatalogCourse = {
  id: string;
  name: string;
  thumbnailUrl: string | null;
  modules: CatalogModule[];
};

/**
 * What a new sale stores. `name` and `courseName` are frozen when the sale is saved,
 * so a later rename does not change the contract.
 * A whole course is one item (`kind: "course"`), not the list of modules that exist today.
 */
export type CourseSaleItem = {
  kind: "course" | "module";
  courseId: string;
  moduleId?: string;
  startsAt: string;
  endsAt: string;
  name: string;
  courseName: string;
};

export type DateMode = "same" | "item";

export type ItemDates = {
  startsAt: string;
  endsAt: string;
};

/** `"all"` means the whole course, including modules published after the sale. */
export type CourseSelection = "all" | string[];

export type CourseDraft = {
  /** Date of the sale. New rows start here. The end is never filled in. */
  saleDate: string;
  mode: DateMode;
  selection: Record<string, CourseSelection>;
  sharedStart: string;
  sharedEnd: string;
  perItem: Record<string, ItemDates>;
  /** Frozen labels for items the catalog no longer lists. */
  labels: Record<string, { name: string; courseName: string }>;
  touched: Record<string, true>;
  /** Set while a date is being typed, so a message waits until the field is left. */
  editing: Record<string, true>;
  attempted: boolean;
};
