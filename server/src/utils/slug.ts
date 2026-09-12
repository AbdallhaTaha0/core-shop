// URL-safe slug generation for catalog entities. Slugs are the stable,
// SEO-friendly public identifiers (products are looked up by slug, not id).
export function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
  if (slug === '') {
    throw new Error('Cannot generate a slug from an empty name');
  }
  return slug;
}

// Appends -2, -3, … until the slug is unused. The database unique constraint
// remains the final arbiter (services translate violations to 409).
export async function resolveUniqueSlug(
  exists: (slug: string) => Promise<boolean>,
  base: string,
): Promise<string> {
  if (!(await exists(base))) {
    return base;
  }
  for (let attempt = 2; ; attempt += 1) {
    const candidate = `${base}-${attempt}`;
    if (!(await exists(candidate))) {
      return candidate;
    }
  }
}
