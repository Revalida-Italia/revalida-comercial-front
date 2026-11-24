/** A published course. It can belong to more than one module. */
export type CatalogCourse = {
  id: string;
  name: string;
  thumbnailUrl: string | null;
};

/** A teaching module. It groups courses; it is not a chapter inside one course. */
export type CatalogModule = {
  id: string;
  name: string;
  thumbnailUrl: string | null;
  courseIds: string[];
  /** Only an explicit true is offered on a new sale. */
  visibleInCommercial?: boolean;
};

export type TeachingCatalog = {
  modules: CatalogModule[];
  courses: CatalogCourse[];
};

export type SaleServices = {
  translation: boolean;
  apostille: boolean;
  postal: boolean;
  decree: boolean;
};

/**
 * What a new sale stores. Names are frozen when the sale is saved.
 * A module is one item (`kind: "module"`), not a copy of the courses it holds today.
 */
export type CourseSaleItem = {
  kind: "course" | "module";
  courseId?: string;
  moduleId?: string;
  startsAt: string;
  endsAt: string;
  name: string;
  courseName: string;
  moduleName?: string | null;
  /** Present on a saved module. An empty list means the catalog did not load. */
  courseIds?: string[];
};

export type DateMode = "same" | "item";

export type ItemDates = {
  startsAt: string;
  endsAt: string;
};

export type CourseDraft = {
  /** Date of the sale. New rows start here. The end is never filled in. */
  saleDate: string;
  mode: DateMode;
  /** Selected teaching modules. Their courses are included and are not separate items. */
  modules: string[];
  /** Courses chosen on their own, not through a selected module. */
  courses: string[];
  services: SaleServices;
  sharedStart: string;
  sharedEnd: string;
  perItem: Record<string, ItemDates>;
  labels: Record<string, { name: string; courseName?: string; courseIds?: string[] }>;
  touched: Record<string, true>;
  editing: Record<string, true>;
  attempted: boolean;
};
