import { useState } from 'react';
import { ComponentArt } from './ComponentArt';

interface ProductVisualProps {
  imageUrl?: string | null;
  altText?: string | null;
  name: string;
  categorySlug?: string;
  large?: boolean;
}

// Uploaded product photo with graceful degradation: missing URL or a failed
// load falls back to the category artwork, so tiles never render broken.
export function ProductVisual({
  imageUrl,
  altText,
  name,
  categorySlug,
  large = false,
}: ProductVisualProps) {
  const [failed, setFailed] = useState(false);
  if (imageUrl && !failed) {
    return (
      <img
        src={imageUrl}
        alt={altText || name}
        className="product-photo"
        loading="lazy"
        onError={() => setFailed(true)}
      />
    );
  }
  return <ComponentArt kind={categorySlug} large={large} />;
}
