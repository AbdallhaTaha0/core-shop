// Hand-maintained OpenAPI 3.0 document for the Core Shop API. It is served
// as JSON at /api-docs.json with an interactive UI at /api-docs. When adding
// endpoints, update this file alongside the route (see tests/docs.test.ts,
// which guards the key paths).
function errorResponse(description: string): Record<string, unknown> {
  return {
    description,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/Error' },
      },
    },
  };
}

function jsonResponse(
  description: string,
  schema: Record<string, unknown>,
): Record<string, unknown> {
  return {
    description,
    content: {
      'application/json': {
        schema,
      },
    },
  };
}

function jsonBody(schema: Record<string, unknown>, required = true): Record<string, unknown> {
  return {
    required,
    content: {
      'application/json': {
        schema,
      },
    },
  };
}

const paginationParams = [
  { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
  {
    name: 'limit',
    in: 'query',
    schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
  },
];

const uuidParam = {
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'string', format: 'uuid' },
};

export const openapiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Core Shop API',
    version: '0.1.0',
    description:
      'Portfolio computer-parts store backend. Authentication uses HttpOnly session cookies; state-changing cookie routes additionally require an Origin check (see requireOrigin). Money is integer minor units throughout.',
  },
  servers: [{ url: 'http://localhost:3000', description: 'Local development' }],
  tags: [
    { name: 'Health' },
    { name: 'Auth' },
    { name: 'Addresses' },
    { name: 'Cart' },
    { name: 'Checkout' },
    { name: 'Orders' },
    { name: 'Catalog' },
    { name: 'Admin' },
  ],
  paths: {
    '/api/v1/health': {
      get: {
        tags: ['Health'],
        summary: 'Service and database health',
        responses: {
          '200': jsonResponse('Healthy', {
            type: 'object',
            properties: {
              status: { type: 'string', example: 'ok' },
              service: { type: 'string', example: 'core-shop-api' },
              database: { type: 'string', example: 'connected' },
            },
          }),
          '503': jsonResponse('Degraded (database unreachable)', {
            type: 'object',
            properties: {
              status: { type: 'string', example: 'degraded' },
              service: { type: 'string', example: 'core-shop-api' },
              database: { type: 'string', example: 'disconnected' },
            },
          }),
        },
      },
    },
    '/api/v1/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a customer account (auto-login)',
        requestBody: jsonBody({ $ref: '#/components/schemas/RegisterInput' }),
        responses: {
          '201': jsonResponse('Created', {
            type: 'object',
            properties: {
              user: { $ref: '#/components/schemas/User' },
              guestCartMerge: {
                type: 'object',
                nullable: true,
                properties: { mergedItems: { type: 'integer' }, skippedItems: { type: 'integer' } },
              },
            },
          }),
          '400': errorResponse('Invalid input'),
          '409': errorResponse('Email already registered'),
          '429': errorResponse('Too many attempts'),
        },
      },
    },
    '/api/v1/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in (merges any guest cart)',
        requestBody: jsonBody({ $ref: '#/components/schemas/LoginInput' }),
        responses: {
          '200': jsonResponse('Authenticated', {
            type: 'object',
            properties: {
              user: { $ref: '#/components/schemas/User' },
              guestCartMerge: {
                type: 'object',
                nullable: true,
                properties: { mergedItems: { type: 'integer' }, skippedItems: { type: 'integer' } },
              },
            },
          }),
          '400': errorResponse('Invalid input'),
          '401': errorResponse('Invalid email or password'),
          '429': errorResponse('Too many attempts'),
        },
      },
    },
    '/api/v1/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Log out (clears the session cookie)',
        responses: {
          '200': jsonResponse('Logged out', {
            type: 'object',
            properties: { message: { type: 'string' } },
          }),
        },
      },
    },
    '/api/v1/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Current session user',
        security: [{ cookieAuth: [] }],
        responses: {
          '200': jsonResponse('Current user', {
            type: 'object',
            properties: { user: { $ref: '#/components/schemas/User' } },
          }),
          '401': errorResponse('Missing, invalid, or expired session'),
        },
      },
    },
    '/api/v1/addresses': {
      get: {
        tags: ['Addresses'],
        summary: 'List my addresses (default first)',
        security: [{ cookieAuth: [] }],
        responses: {
          '200': jsonResponse('Address list', {
            type: 'object',
            properties: {
              data: { type: 'array', items: { $ref: '#/components/schemas/Address' } },
            },
          }),
          '401': errorResponse('Authentication required'),
        },
      },
      post: {
        tags: ['Addresses'],
        summary: 'Add an address (first one becomes default)',
        security: [{ cookieAuth: [] }],
        requestBody: jsonBody({ $ref: '#/components/schemas/AddressInput' }),
        responses: {
          '201': jsonResponse('Created', {
            type: 'object',
            properties: { address: { $ref: '#/components/schemas/Address' } },
          }),
          '400': errorResponse('Invalid input'),
          '401': errorResponse('Authentication required'),
        },
      },
    },
    '/api/v1/addresses/{id}': {
      patch: {
        tags: ['Addresses'],
        summary: 'Update my address',
        security: [{ cookieAuth: [] }],
        parameters: [uuidParam],
        requestBody: jsonBody({ $ref: '#/components/schemas/AddressUpdate' }),
        responses: {
          '200': jsonResponse('Updated', {
            type: 'object',
            properties: { address: { $ref: '#/components/schemas/Address' } },
          }),
          '400': errorResponse('Invalid input'),
          '401': errorResponse('Authentication required'),
          '404': errorResponse('Address not found'),
        },
      },
      delete: {
        tags: ['Addresses'],
        summary: 'Delete my address (default promotes the oldest remaining)',
        security: [{ cookieAuth: [] }],
        parameters: [uuidParam],
        responses: {
          '204': { description: 'Deleted' },
          '401': errorResponse('Authentication required'),
          '404': errorResponse('Address not found'),
        },
      },
    },
    '/api/v1/cart': {
      get: {
        tags: ['Cart'],
        summary: 'Current cart (guest cookie or session)',
        responses: {
          '200': jsonResponse('Cart with server-priced totals', {
            type: 'object',
            properties: { cart: { $ref: '#/components/schemas/Cart' } },
          }),
        },
      },
    },
    '/api/v1/cart/items': {
      post: {
        tags: ['Cart'],
        summary: 'Add an item (quantity capped at stock)',
        requestBody: jsonBody({ $ref: '#/components/schemas/CartItemInput' }),
        responses: {
          '200': jsonResponse('Updated cart', {
            type: 'object',
            properties: { cart: { $ref: '#/components/schemas/Cart' } },
          }),
          '400': errorResponse('Invalid input'),
          '404': errorResponse('Product not found'),
          '409': errorResponse('Product unavailable'),
        },
      },
    },
    '/api/v1/cart/items/{id}': {
      patch: {
        tags: ['Cart'],
        summary: 'Change an item quantity (clamped to stock)',
        parameters: [uuidParam],
        requestBody: jsonBody({
          type: 'object',
          additionalProperties: false,
          properties: { quantity: { type: 'integer', minimum: 1, maximum: 999 } },
          required: ['quantity'],
        }),
        responses: {
          '200': jsonResponse('Updated cart', {
            type: 'object',
            properties: { cart: { $ref: '#/components/schemas/Cart' } },
          }),
          '400': errorResponse('Invalid input'),
          '404': errorResponse('Cart item not found'),
          '409': errorResponse('Product unavailable'),
        },
      },
      delete: {
        tags: ['Cart'],
        summary: 'Remove an item (idempotent)',
        parameters: [uuidParam],
        responses: {
          '200': jsonResponse('Updated cart', {
            type: 'object',
            properties: { cart: { $ref: '#/components/schemas/Cart' } },
          }),
          '400': errorResponse('Invalid item id'),
        },
      },
    },
    '/api/v1/checkout': {
      post: {
        tags: ['Checkout'],
        summary: 'Checkout the session cart (server-priced, transactional)',
        security: [{ cookieAuth: [] }],
        requestBody: jsonBody(
          {
            type: 'object',
            additionalProperties: false,
            properties: { addressId: { type: 'string', format: 'uuid' } },
          },
          false,
        ),
        responses: {
          '201': jsonResponse('Order created and paid', {
            type: 'object',
            properties: { order: { $ref: '#/components/schemas/Order' } },
          }),
          '400': errorResponse('Invalid input'),
          '401': errorResponse('Authentication required'),
          '402': errorResponse('Payment declined'),
          '403': errorResponse('Cross-origin request blocked'),
          '404': errorResponse('Address not found'),
          '409': errorResponse('Empty cart or insufficient stock'),
        },
      },
    },
    '/api/v1/orders': {
      get: {
        tags: ['Orders'],
        summary: 'My order history (paginated, newest first)',
        security: [{ cookieAuth: [] }],
        parameters: paginationParams,
        responses: {
          '200': jsonResponse('Order page', {
            type: 'object',
            properties: {
              data: { type: 'array', items: { $ref: '#/components/schemas/Order' } },
              meta: { $ref: '#/components/schemas/PageMeta' },
            },
          }),
          '400': errorResponse('Invalid pagination'),
          '401': errorResponse('Authentication required'),
        },
      },
    },
    '/api/v1/orders/{id}': {
      get: {
        tags: ['Orders'],
        summary: 'My order by id',
        security: [{ cookieAuth: [] }],
        parameters: [uuidParam],
        responses: {
          '200': jsonResponse('Order', {
            type: 'object',
            properties: { order: { $ref: '#/components/schemas/Order' } },
          }),
          '400': errorResponse('Invalid id'),
          '401': errorResponse('Authentication required'),
          '404': errorResponse('Order not found'),
        },
      },
    },
    '/api/v1/products': {
      get: {
        tags: ['Catalog'],
        summary: 'Browse products (search, filter, sort, paginate)',
        parameters: [
          ...paginationParams,
          {
            name: 'sort',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['newest', 'price_asc', 'price_desc', 'name_asc'],
              default: 'newest',
            },
          },
          { name: 'q', in: 'query', schema: { type: 'string', maxLength: 100 } },
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'brand', in: 'query', schema: { type: 'string' } },
          { name: 'minPrice', in: 'query', schema: { type: 'integer', minimum: 0 } },
          { name: 'maxPrice', in: 'query', schema: { type: 'integer', minimum: 0 } },
          { name: 'inStock', in: 'query', schema: { type: 'string', enum: ['true', 'false'] } },
        ],
        responses: {
          '200': jsonResponse('Product page', {
            type: 'object',
            properties: {
              data: { type: 'array', items: { $ref: '#/components/schemas/Product' } },
              meta: { $ref: '#/components/schemas/PageMeta' },
            },
          }),
          '400': errorResponse('Invalid query'),
          '404': errorResponse('Unknown category or brand filter'),
        },
      },
    },
    '/api/v1/products/{slug}': {
      get: {
        tags: ['Catalog'],
        summary: 'Product details by slug',
        parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': jsonResponse('Product', {
            type: 'object',
            properties: { product: { $ref: '#/components/schemas/Product' } },
          }),
          '400': errorResponse('Invalid slug'),
          '404': errorResponse('Product not found'),
        },
      },
    },
    '/api/v1/categories': {
      get: {
        tags: ['Catalog'],
        summary: 'List categories alphabetically',
        responses: {
          '200': jsonResponse('Category list', {
            type: 'object',
            properties: {
              data: { type: 'array', items: { $ref: '#/components/schemas/Category' } },
            },
          }),
        },
      },
    },
    '/api/v1/brands': {
      get: {
        tags: ['Catalog'],
        summary: 'List brands alphabetically',
        responses: {
          '200': jsonResponse('Brand list', {
            type: 'object',
            properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Brand' } } },
          }),
        },
      },
    },
    '/api/v1/admin/products': {
      get: {
        tags: ['Admin'],
        summary: 'List products including inactive (admin)',
        security: [{ cookieAuth: [] }],
        parameters: [
          ...paginationParams,
          {
            name: 'includeInactive',
            in: 'query',
            schema: { type: 'string', enum: ['true', 'false'] },
          },
        ],
        responses: {
          '200': jsonResponse('Product page', {
            type: 'object',
            properties: {
              data: { type: 'array', items: { $ref: '#/components/schemas/Product' } },
              meta: { $ref: '#/components/schemas/PageMeta' },
            },
          }),
          '401': errorResponse('Authentication required'),
          '403': errorResponse('Admin required'),
        },
      },
      post: {
        tags: ['Admin'],
        summary: 'Create a product',
        security: [{ cookieAuth: [] }],
        requestBody: jsonBody({ $ref: '#/components/schemas/ProductInput' }),
        responses: {
          '201': jsonResponse('Created', {
            type: 'object',
            properties: { product: { $ref: '#/components/schemas/Product' } },
          }),
          '400': errorResponse('Invalid input'),
          '401': errorResponse('Authentication required'),
          '403': errorResponse('Admin required'),
          '404': errorResponse('Unknown category or brand'),
          '409': errorResponse('Slug taken'),
        },
      },
    },
    '/api/v1/admin/products/{id}': {
      patch: {
        tags: ['Admin'],
        summary: 'Update a product (images replaced wholesale when provided)',
        security: [{ cookieAuth: [] }],
        parameters: [uuidParam],
        requestBody: jsonBody({ $ref: '#/components/schemas/ProductUpdate' }),
        responses: {
          '200': jsonResponse('Updated', {
            type: 'object',
            properties: { product: { $ref: '#/components/schemas/Product' } },
          }),
          '400': errorResponse('Invalid input'),
          '401': errorResponse('Authentication required'),
          '403': errorResponse('Admin required'),
          '404': errorResponse('Product not found'),
          '409': errorResponse('Slug taken'),
        },
      },
      delete: {
        tags: ['Admin'],
        summary: 'Delete a product (images cascade)',
        security: [{ cookieAuth: [] }],
        parameters: [uuidParam],
        responses: {
          '204': { description: 'Deleted' },
          '401': errorResponse('Authentication required'),
          '403': errorResponse('Admin required'),
          '404': errorResponse('Product not found'),
        },
      },
    },
    '/api/v1/admin/categories': {
      post: {
        tags: ['Admin'],
        summary: 'Create a category',
        security: [{ cookieAuth: [] }],
        requestBody: jsonBody({ $ref: '#/components/schemas/CategoryInput' }),
        responses: {
          '201': jsonResponse('Created', {
            type: 'object',
            properties: { category: { $ref: '#/components/schemas/Category' } },
          }),
          '400': errorResponse('Invalid input'),
          '401': errorResponse('Authentication required'),
          '403': errorResponse('Admin required'),
          '404': errorResponse('Parent category not found'),
          '409': errorResponse('Slug taken'),
        },
      },
    },
    '/api/v1/admin/categories/{id}': {
      patch: {
        tags: ['Admin'],
        summary: 'Update a category',
        security: [{ cookieAuth: [] }],
        parameters: [uuidParam],
        requestBody: jsonBody({ $ref: '#/components/schemas/CategoryInput' }),
        responses: {
          '200': jsonResponse('Updated', {
            type: 'object',
            properties: { category: { $ref: '#/components/schemas/Category' } },
          }),
          '400': errorResponse('Invalid input or parent cycle'),
          '401': errorResponse('Authentication required'),
          '403': errorResponse('Admin required'),
          '404': errorResponse('Category not found'),
          '409': errorResponse('Slug taken'),
        },
      },
      delete: {
        tags: ['Admin'],
        summary: 'Delete a category (blocked with children or products)',
        security: [{ cookieAuth: [] }],
        parameters: [uuidParam],
        responses: {
          '204': { description: 'Deleted' },
          '401': errorResponse('Authentication required'),
          '403': errorResponse('Admin required'),
          '404': errorResponse('Category not found'),
          '409': errorResponse('Category still referenced'),
        },
      },
    },
    '/api/v1/admin/brands': {
      post: {
        tags: ['Admin'],
        summary: 'Create a brand',
        security: [{ cookieAuth: [] }],
        requestBody: jsonBody({ $ref: '#/components/schemas/BrandInput' }),
        responses: {
          '201': jsonResponse('Created', {
            type: 'object',
            properties: { brand: { $ref: '#/components/schemas/Brand' } },
          }),
          '400': errorResponse('Invalid input'),
          '401': errorResponse('Authentication required'),
          '403': errorResponse('Admin required'),
          '409': errorResponse('Slug taken'),
        },
      },
    },
    '/api/v1/admin/brands/{id}': {
      patch: {
        tags: ['Admin'],
        summary: 'Update a brand',
        security: [{ cookieAuth: [] }],
        parameters: [uuidParam],
        requestBody: jsonBody({ $ref: '#/components/schemas/BrandInput' }),
        responses: {
          '200': jsonResponse('Updated', {
            type: 'object',
            properties: { brand: { $ref: '#/components/schemas/Brand' } },
          }),
          '400': errorResponse('Invalid input'),
          '401': errorResponse('Authentication required'),
          '403': errorResponse('Admin required'),
          '404': errorResponse('Brand not found'),
          '409': errorResponse('Slug taken'),
        },
      },
      delete: {
        tags: ['Admin'],
        summary: 'Delete a brand (blocked with products)',
        security: [{ cookieAuth: [] }],
        parameters: [uuidParam],
        responses: {
          '204': { description: 'Deleted' },
          '401': errorResponse('Authentication required'),
          '403': errorResponse('Admin required'),
          '404': errorResponse('Brand not found'),
          '409': errorResponse('Brand still referenced'),
        },
      },
    },
    '/api/v1/admin/orders': {
      get: {
        tags: ['Admin'],
        summary: 'List all orders with optional status filter',
        security: [{ cookieAuth: [] }],
        parameters: [
          ...paginationParams,
          {
            name: 'status',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'],
            },
          },
        ],
        responses: {
          '200': jsonResponse('Order page', {
            type: 'object',
            properties: {
              data: { type: 'array', items: { $ref: '#/components/schemas/Order' } },
              meta: { $ref: '#/components/schemas/PageMeta' },
            },
          }),
          '400': errorResponse('Invalid query'),
          '401': errorResponse('Authentication required'),
          '403': errorResponse('Admin required'),
        },
      },
    },
    '/api/v1/admin/orders/{id}': {
      get: {
        tags: ['Admin'],
        summary: 'Any order by id',
        security: [{ cookieAuth: [] }],
        parameters: [uuidParam],
        responses: {
          '200': jsonResponse('Order', {
            type: 'object',
            properties: { order: { $ref: '#/components/schemas/Order' } },
          }),
          '400': errorResponse('Invalid id'),
          '401': errorResponse('Authentication required'),
          '403': errorResponse('Admin required'),
          '404': errorResponse('Order not found'),
        },
      },
      patch: {
        tags: ['Admin'],
        summary: 'Transition order status (cancelling restocks)',
        security: [{ cookieAuth: [] }],
        parameters: [uuidParam],
        requestBody: jsonBody({
          type: 'object',
          additionalProperties: false,
          properties: {
            status: {
              type: 'string',
              enum: ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'],
            },
          },
          required: ['status'],
        }),
        responses: {
          '200': jsonResponse('Updated', {
            type: 'object',
            properties: { order: { $ref: '#/components/schemas/Order' } },
          }),
          '400': errorResponse('Invalid input'),
          '401': errorResponse('Authentication required'),
          '403': errorResponse('Admin required'),
          '404': errorResponse('Order not found'),
          '409': errorResponse('Illegal status transition'),
        },
      },
    },
    '/api/v1/admin/users': {
      get: {
        tags: ['Admin'],
        summary: 'List users with optional email search',
        security: [{ cookieAuth: [] }],
        parameters: [...paginationParams, { name: 'q', in: 'query', schema: { type: 'string' } }],
        responses: {
          '200': jsonResponse('User page', {
            type: 'object',
            properties: {
              data: { type: 'array', items: { $ref: '#/components/schemas/User' } },
              meta: { $ref: '#/components/schemas/PageMeta' },
            },
          }),
          '400': errorResponse('Invalid query'),
          '401': errorResponse('Authentication required'),
          '403': errorResponse('Admin required'),
        },
      },
    },
    '/api/v1/admin/users/{id}': {
      get: {
        tags: ['Admin'],
        summary: 'User by id',
        security: [{ cookieAuth: [] }],
        parameters: [uuidParam],
        responses: {
          '200': jsonResponse('User', {
            type: 'object',
            properties: { user: { $ref: '#/components/schemas/User' } },
          }),
          '400': errorResponse('Invalid id'),
          '401': errorResponse('Authentication required'),
          '403': errorResponse('Admin required'),
          '404': errorResponse('User not found'),
        },
      },
      patch: {
        tags: ['Admin'],
        summary: 'Change a user role (cannot change your own)',
        security: [{ cookieAuth: [] }],
        parameters: [uuidParam],
        requestBody: jsonBody({
          type: 'object',
          additionalProperties: false,
          properties: { role: { type: 'string', enum: ['customer', 'admin'] } },
          required: ['role'],
        }),
        responses: {
          '200': jsonResponse('Updated', {
            type: 'object',
            properties: { user: { $ref: '#/components/schemas/User' } },
          }),
          '400': errorResponse('Invalid input'),
          '401': errorResponse('Authentication required'),
          '403': errorResponse('Admin required, or own role'),
          '404': errorResponse('User not found'),
        },
      },
    },
    '/api/v1/admin/audit-logs': {
      get: {
        tags: ['Admin'],
        summary: 'Audit trail with optional action filter',
        security: [{ cookieAuth: [] }],
        parameters: [
          ...paginationParams,
          { name: 'action', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '200': jsonResponse('Audit page', {
            type: 'object',
            properties: {
              data: { type: 'array', items: { $ref: '#/components/schemas/AuditLog' } },
              meta: { $ref: '#/components/schemas/PageMeta' },
            },
          }),
          '400': errorResponse('Invalid query'),
          '401': errorResponse('Authentication required'),
          '403': errorResponse('Admin required'),
        },
      },
    },
    '/api-docs.json': {
      get: {
        tags: ['Health'],
        summary: 'This OpenAPI document as JSON',
        responses: {
          '200': { description: 'OpenAPI 3.0 document' },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'access_token',
        description: 'Session JWT in an HttpOnly cookie (set by login/register).',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'NOT_FOUND' },
              message: { type: 'string', example: 'Product not found' },
              details: { type: 'object' },
            },
          },
        },
      },
      PageMeta: {
        type: 'object',
        properties: {
          page: { type: 'integer' },
          limit: { type: 'integer' },
          total: { type: 'integer' },
          totalPages: { type: 'integer' },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string' },
          role: { type: 'string', enum: ['customer', 'admin'] },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      RegisterInput: {
        type: 'object',
        additionalProperties: false,
        properties: { email: { type: 'string' }, password: { type: 'string' } },
        required: ['email', 'password'],
      },
      LoginInput: {
        type: 'object',
        additionalProperties: false,
        properties: { email: { type: 'string' }, password: { type: 'string' } },
        required: ['email', 'password'],
      },
      Address: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          label: { type: 'string', nullable: true },
          fullName: { type: 'string' },
          line1: { type: 'string' },
          line2: { type: 'string', nullable: true },
          city: { type: 'string' },
          postalCode: { type: 'string' },
          country: { type: 'string', example: 'DE' },
          isDefault: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      AddressInput: {
        type: 'object',
        additionalProperties: false,
        properties: {
          label: { type: 'string' },
          fullName: { type: 'string' },
          line1: { type: 'string' },
          line2: { type: 'string' },
          city: { type: 'string' },
          postalCode: { type: 'string' },
          country: { type: 'string', example: 'DE' },
          isDefault: { type: 'boolean' },
        },
        required: ['fullName', 'line1', 'city', 'postalCode', 'country'],
      },
      AddressUpdate: {
        type: 'object',
        additionalProperties: false,
        properties: {
          label: { type: 'string' },
          fullName: { type: 'string' },
          line1: { type: 'string' },
          line2: { type: 'string' },
          city: { type: 'string' },
          postalCode: { type: 'string' },
          country: { type: 'string' },
          isDefault: { type: 'boolean' },
        },
      },
      Category: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          slug: { type: 'string' },
          description: { type: 'string', nullable: true },
          parentId: { type: 'string', format: 'uuid', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CategoryInput: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          slug: { type: 'string' },
          description: { type: 'string' },
          parentId: { type: 'string', format: 'uuid', nullable: true },
        },
        required: ['name'],
      },
      Brand: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          slug: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      BrandInput: {
        type: 'object',
        additionalProperties: false,
        properties: { name: { type: 'string' }, slug: { type: 'string' } },
        required: ['name'],
      },
      ProductImage: {
        type: 'object',
        properties: {
          url: { type: 'string' },
          altText: { type: 'string', nullable: true },
          position: { type: 'integer' },
        },
      },
      Product: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          slug: { type: 'string' },
          description: { type: 'string', nullable: true },
          priceCents: { type: 'integer' },
          stock: { type: 'integer' },
          isActive: { type: 'boolean' },
          category: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              slug: { type: 'string' },
              name: { type: 'string' },
            },
          },
          brand: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              slug: { type: 'string' },
              name: { type: 'string' },
            },
          },
          images: { type: 'array', items: { $ref: '#/components/schemas/ProductImage' } },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      ProductInput: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          slug: { type: 'string' },
          description: { type: 'string' },
          priceCents: { type: 'integer', minimum: 0 },
          stock: { type: 'integer', minimum: 0 },
          isActive: { type: 'boolean' },
          categoryId: { type: 'string', format: 'uuid' },
          brandId: { type: 'string', format: 'uuid' },
          images: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: { url: { type: 'string' }, altText: { type: 'string' } },
              required: ['url'],
            },
          },
        },
        required: ['name', 'priceCents', 'categoryId', 'brandId'],
      },
      ProductUpdate: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          slug: { type: 'string' },
          description: { type: 'string' },
          priceCents: { type: 'integer', minimum: 0 },
          stock: { type: 'integer', minimum: 0 },
          isActive: { type: 'boolean' },
          categoryId: { type: 'string', format: 'uuid' },
          brandId: { type: 'string', format: 'uuid' },
          images: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: { url: { type: 'string' }, altText: { type: 'string' } },
              required: ['url'],
            },
          },
        },
      },
      CartItem: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          quantity: { type: 'integer' },
          available: { type: 'boolean' },
          maxQuantity: { type: 'integer' },
          lineTotalCents: { type: 'integer' },
          product: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              slug: { type: 'string' },
              name: { type: 'string' },
              priceCents: { type: 'integer' },
              stock: { type: 'integer' },
            },
          },
        },
      },
      Cart: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', nullable: true },
          items: { type: 'array', items: { $ref: '#/components/schemas/CartItem' } },
          itemCount: { type: 'integer' },
          subtotalCents: { type: 'integer' },
          unavailableCount: { type: 'integer' },
        },
      },
      CartItemInput: {
        type: 'object',
        additionalProperties: false,
        properties: {
          productId: { type: 'string', format: 'uuid' },
          quantity: { type: 'integer', minimum: 1, maximum: 999 },
        },
        required: ['productId'],
      },
      OrderItem: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          quantity: { type: 'integer' },
          unitPriceCents: { type: 'integer' },
          lineTotalCents: { type: 'integer' },
          product: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              slug: { type: 'string' },
              name: { type: 'string' },
            },
          },
        },
      },
      Order: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          status: {
            type: 'string',
            enum: ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'],
          },
          currency: { type: 'string', example: 'USD' },
          subtotalCents: { type: 'integer' },
          totalCents: { type: 'integer' },
          paymentId: { type: 'string', nullable: true },
          shipping: {
            type: 'object',
            nullable: true,
            properties: {
              fullName: { type: 'string' },
              line1: { type: 'string' },
              line2: { type: 'string', nullable: true },
              city: { type: 'string' },
              postalCode: { type: 'string' },
              country: { type: 'string' },
            },
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          items: { type: 'array', items: { $ref: '#/components/schemas/OrderItem' } },
        },
      },
      AuditLog: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          actorUserId: { type: 'string', format: 'uuid', nullable: true },
          action: { type: 'string' },
          entityType: { type: 'string', nullable: true },
          entityId: { type: 'string', format: 'uuid', nullable: true },
          metadata: { type: 'object', nullable: true },
          ipAddress: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
};
