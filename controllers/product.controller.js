import productService from '../services/product.service.js';

const getProducts = async (req, res, next) => {
  try {
    const products = await productService.getAllProducts();
    res.json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
};
const getCategories = async (req, res, next) => {
  try {
    res.json({ success: true, data: await productService.getCategories() });
  } catch (error) { next(error); }
};

const createProduct = async (req, res, next) => {
  try {
    const product = await productService.createProduct(req.body);
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const product = await productService.updateProduct(req.params.id, req.body);
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    await productService.deleteProduct(req.params.id);
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    next(error);
  }
};


export default {
    getProducts, getCategories,
    createProduct,
    updateProduct,
    deleteProduct
};
