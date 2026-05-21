import { apiRequest } from "@/lib/http";

const CORE_API_URL = import.meta.env.VITE_CORE_API_URL as string;

export interface Product {
  id: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateProductInput {
  name: string;
  description?: string;
}

export interface UpdateProductInput {
  name?: string;
  description?: string;
}

interface ListWrapper<T> {
  data?: T[];
}

function unwrapArray<T>(payload: T[] | ListWrapper<T>): T[] {
  if (Array.isArray(payload)) {
    return payload;
  }
  return payload.data ?? [];
}

export async function listProducts(): Promise<Product[]> {
  const payload = await apiRequest<Product[] | ListWrapper<Product>>(CORE_API_URL, "/products");
  return unwrapArray(payload);
}

export async function createProduct(input: CreateProductInput): Promise<void> {
  await apiRequest<void>(CORE_API_URL, "/products", {
    method: "POST",
    body: input,
  });
}

export async function updateProduct(id: string, input: UpdateProductInput): Promise<void> {
  await apiRequest<void>(CORE_API_URL, `/products/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: input,
  });
}

export async function deleteProduct(id: string): Promise<void> {
  await apiRequest<void>(CORE_API_URL, `/products/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
