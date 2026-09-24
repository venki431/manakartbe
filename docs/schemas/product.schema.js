const productSchemas = {
  ProductVariant: { type: 'object', properties: { id: { type: 'string', format: 'uuid' }, unit_type: { type: 'string', enum: ['weight', 'count', 'bunch', 'packet', 'volume'] }, unit_quantity: { type: 'number' }, unit_label: { type: 'string' }, price: { type: 'integer' }, available: { type: 'boolean' }, sort_order: { type: 'integer' } } },
  Product: { type: 'object', properties: { id: { type: 'string', format: 'uuid' }, category_id: { type: 'string', format: 'uuid' }, name: { type: 'string' }, slug: { type: 'string' }, image_url: { type: 'string' }, available: { type: 'boolean' }, variants: { type: 'array', items: { $ref: '#/components/schemas/ProductVariant' } } } },
  CreateProduct: { type: 'object', required: ['name', 'category_id', 'variants'], properties: { name: { type: 'string' }, category_id: { type: 'string', format: 'uuid' }, variants: { type: 'array', minItems: 1, items: { $ref: '#/components/schemas/ProductVariant' } } } }
};
export default productSchemas;
