export type Category = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
};
export type Brand = { id: string; slug: string; name: string };
export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  priceCents: number;
  stock: number;
  isActive: boolean;
  category: Category;
  brand: Brand;
  images: { url: string; altText: string | null; position: number }[];
};
export type CartItem = {
  id: string;
  quantity: number;
  available: boolean;
  maxQuantity: number;
  lineTotalCents: number;
  product: Pick<Product, 'id' | 'slug' | 'name' | 'priceCents' | 'stock'> & {
    imageUrl: string | null;
    imageAltText: string | null;
    categorySlug: string;
  };
};
export type Cart = {
  id: string | null;
  items: CartItem[];
  itemCount: number;
  subtotalCents: number;
  unavailableCount: number;
};
export type User = { id: string; email: string; role: 'customer' | 'admin' };
export type Address = {
  id: string;
  label: string | null;
  fullName: string;
  line1: string;
  line2: string | null;
  city: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
};
export type Order = {
  id: string;
  status: string;
  currency: string;
  subtotalCents: number;
  totalCents: number;
  createdAt: string;
  shipping: Omit<Address, 'id' | 'label' | 'isDefault'> | null;
  items: {
    id: string;
    quantity: number;
    unitPriceCents: number;
    lineTotalCents: number;
    product: { id: string; slug: string; name: string };
  }[];
};
export type Page<T> = {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      credentials: 'include',
      ...options,
      headers: {
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'The shop could not connect. Check that the API is running and try again.',
    );
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: { code?: string; message?: string };
    } | null;
    throw new ApiError(
      response.status,
      body?.error?.code ?? 'REQUEST_FAILED',
      body?.error?.message ?? 'The request could not be completed. Please try again.',
    );
  }
  return response.status === 204 ? (undefined as T) : (response.json() as Promise<T>);
}

export const money = (cents: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
export const body = (value: object) => JSON.stringify(value);
