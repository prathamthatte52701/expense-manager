const Category = require('../models/Category');
const { seedCategories, maxCategories, maxCategoryNameLength } = require('../config');

async function ensureSeeded() {
  const count = await Category.countDocuments();
  if (count > 0) return;
  await Category.insertMany(
    seedCategories.map((name, i) => ({ name, createdAt: new Date(Date.now() + i) })),
    { ordered: true }
  );
}

async function listCategories() {
  const docs = await Category.find().sort({ createdAt: 1 }).lean();
  return docs.map((doc) => doc.name);
}

async function addCategory(rawName) {
  const name = String(rawName || '').trim();
  if (!name) {
    return { error: 'Category name is required.' };
  }
  if (name.length > maxCategoryNameLength) {
    return { error: `Category name must be ${maxCategoryNameLength} characters or fewer.` };
  }

  const existing = await listCategories();
  if (existing.length >= maxCategories) {
    return { error: `Maximum of ${maxCategories} categories reached.` };
  }
  if (existing.some((category) => category.toLowerCase() === name.toLowerCase())) {
    return { error: `"${name}" already exists as a category.` };
  }

  await Category.create({ name });
  return { categories: await listCategories() };
}

module.exports = { ensureSeeded, listCategories, addCategory };
