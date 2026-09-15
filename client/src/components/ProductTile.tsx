import { Link } from 'react-router-dom';
import { money, type Product } from '../lib/api';
import { ProductVisual } from './ProductVisual';
import { Icon } from './Icon';

export function ProductTile({ product, index = 0 }: { product: Product; index?: number }) {
  const firstImage = product.images[0];
  return (
    <article className="product-tile">
      <Link
        to={`/products/${product.slug}`}
        className="tile-visual"
        aria-label={`View ${product.name}`}
      >
        <ProductVisual
          imageUrl={firstImage?.url}
          altText={firstImage?.altText}
          name={product.name}
          categorySlug={product.category.slug}
        />
        <span className="tile-index">C / {String(index + 1).padStart(2, '0')}</span>
      </Link>
      <div className="tile-meta">
        <span>
          {product.category.name} / {product.brand.name}
        </span>
        <span className={product.stock ? 'in-stock' : 'out-stock'}>
          {product.stock ? 'In stock' : 'Out of stock'}
        </span>
      </div>
      <Link to={`/products/${product.slug}`} className="tile-name">
        {product.name}
      </Link>
      <div className="tile-bottom">
        <strong>{money(product.priceCents)}</strong>
        <Link to={`/products/${product.slug}`} aria-label={`View ${product.name}`}>
          <Icon name="arrow" size={19} />
        </Link>
      </div>
    </article>
  );
}
