import { formatInrFromPaise, parseRupeesToPaise } from '../../utils/money.js';

import {
  ADMIN_PRODUCT_ALLOWED_IMAGE_TYPES,
  ADMIN_PRODUCT_MAX_IMAGES,
  ADMIN_PRODUCT_MAX_IMAGE_SIZE,
} from './adminProduct.constants.js';

export const adminProductDateFormatter = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeSingleLineText(value) {
  return value.trim().replace(/\s+/g, ' ');
}

function parseSpecifications(value) {
  if (!value.trim()) {
    return {
      value: {},
      error: null,
    };
  }

  let parsed;

  try {
    parsed = JSON.parse(value);
  } catch {
    return {
      value: null,

      error: 'Specifications must contain valid JSON.',
    };
  }

  if (!isPlainObject(parsed)) {
    return {
      value: null,

      error: 'Specifications must be a JSON object.',
    };
  }

  const invalid = Object.values(parsed).some((item) => {
    if (typeof item === 'string' || typeof item === 'boolean') {
      return false;
    }

    if (typeof item === 'number') {
      return !Number.isFinite(item);
    }

    return true;
  });

  if (invalid) {
    return {
      value: null,

      error:
        'Specification values must be text, numbers, or true/false values.',
    };
  }

  return {
    value: parsed,
    error: null,
  };
}

function getInitialVariantKey(options) {
  return JSON.stringify(
    Object.entries(options)
      .map(([name, value]) => [
        normalizeSingleLineText(name).toLowerCase(),

        normalizeSingleLineText(value).toLowerCase(),
      ])
      .sort(([leftName], [rightName]) => leftName.localeCompare(rightName)),
  );
}

function parseInitialVariants(value) {
  let parsed;

  try {
    parsed = JSON.parse(value);
  } catch {
    return {
      value: null,

      error: 'Initial Variants must contain valid JSON.',
    };
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    return {
      value: null,

      error: 'Add at least one initial Variant.',
    };
  }

  const normalizedVariants = [];

  const seenVariantKeys = new Set();

  for (let index = 0; index < parsed.length; index += 1) {
    const variant = parsed[index];

    if (!isPlainObject(variant)) {
      return {
        value: null,

        error: `Variant ${index + 1} must be an object.`,
      };
    }

    if (
      !isPlainObject(variant.options) ||
      Object.keys(variant.options).length === 0
    ) {
      return {
        value: null,

        error: `Variant ${index + 1} needs at least one option.`,
      };
    }

    const options = {};

    for (const [rawName, rawValue] of Object.entries(variant.options)) {
      const name = normalizeSingleLineText(rawName);

      if (
        !name ||
        name.startsWith('$') ||
        name.includes('.') ||
        typeof rawValue !== 'string'
      ) {
        return {
          value: null,

          error: `Variant ${index + 1} contains invalid options.`,
        };
      }

      const optionValue = normalizeSingleLineText(rawValue);

      if (!optionValue) {
        return {
          value: null,

          error: `Variant ${index + 1} option values cannot be empty.`,
        };
      }

      options[name] = optionValue;
    }

    if (
      !Number.isSafeInteger(variant.initialQuantity) ||
      variant.initialQuantity < 0
    ) {
      return {
        value: null,

        error: `Variant ${index + 1} initial quantity must be a non-negative integer.`,
      };
    }

    if (typeof variant.isActive !== 'boolean') {
      return {
        value: null,

        error: `Variant ${index + 1} active status must be true or false.`,
      };
    }

    const variantKey = getInitialVariantKey(options);

    if (seenVariantKeys.has(variantKey)) {
      return {
        value: null,

        error: 'Initial Variant option combinations must be unique.',
      };
    }

    seenVariantKeys.add(variantKey);

    normalizedVariants.push({
      options,

      initialQuantity: variant.initialQuantity,

      isActive: variant.isActive,
    });
  }

  return {
    value: normalizedVariants,
    error: null,
  };
}

export function getAdminProductDiscountLabel(product, includeOff = false) {
  if (product.discountType === 'percentage') {
    return `${product.discountValue}%${includeOff ? ' off' : ''}`;
  }

  if (product.discountType === 'fixed') {
    const amount = formatInrFromPaise(product.discountValue);

    return includeOff ? `${amount} off` : amount;
  }

  return includeOff ? null : 'No discount';
}

export function getAdminProductSportLabel(sports, value) {
  return sports.find((sport) => sport.value === value)?.label ?? value;
}

export function validateAdminProductForm({
  form,

  editMode,

  product,

  categories,

  images,
}) {
  const fields = {};

  const name = form.name.trim();

  const description = form.description.trim();

  const brand = form.brand.trim();

  if (!name) {
    fields.name = 'Product name is required.';
  }

  if (!description) {
    fields.description = 'Description is required.';
  }

  if (!brand) {
    fields.brand = 'Brand is required.';
  }

  if (!form.sport) {
    fields.sport = 'Sport is required.';
  }

  if (!form.categoryId) {
    fields.categoryId = 'Category is required.';
  }

  const category = categories.find((item) => item.id === form.categoryId);

  if (form.categoryId && (!category || category.sport !== form.sport)) {
    fields.categoryId = 'Select a category belonging to the selected sport.';
  }

  const isActive = editMode ? product?.isActive : form.isActive;

  if (category && isActive && !category.isActive) {
    fields.categoryId = 'An active product requires an active category.';
  }

  const basePrice = parseRupeesToPaise(form.basePrice);

  if (basePrice === null || basePrice <= 0) {
    fields.basePrice = 'Enter a valid price greater than ₹0.';
  }

  const discountType = form.discountType || null;

  let discountValue = null;

  if (discountType === 'percentage') {
    if (!/^\d+$/.test(form.discountValue.trim())) {
      fields.discountValue = 'Enter a whole-number percentage.';
    } else {
      discountValue = Number(form.discountValue);

      if (discountValue <= 0 || discountValue > 100) {
        fields.discountValue = 'Percentage must be between 1 and 100.';
      }
    }
  }

  if (discountType === 'fixed') {
    discountValue = parseRupeesToPaise(form.discountValue);

    if (discountValue === null || discountValue <= 0) {
      fields.discountValue = 'Enter a valid fixed discount.';
    } else if (basePrice !== null && discountValue >= basePrice) {
      fields.discountValue = 'Fixed discount must be below the base price.';
    }
  }

  const parsedSpecifications = parseSpecifications(form.specifications);

  if (parsedSpecifications.error) {
    fields.specifications = parsedSpecifications.error;
  }

  let inventoryPayload = {};

  if (!editMode) {
    if (form.inventoryMode === 'simple') {
      if (!/^\d+$/.test(form.initialQuantity.trim())) {
        fields.initialQuantity =
          'Initial quantity must be a non-negative whole number.';
      } else {
        const initialQuantity = Number(form.initialQuantity);

        if (!Number.isSafeInteger(initialQuantity)) {
          fields.initialQuantity =
            'Initial quantity must be a valid non-negative whole number.';
        } else {
          inventoryPayload = {
            initialQuantity,
          };
        }
      }
    } else if (form.inventoryMode === 'variant') {
      const parsedVariants = parseInitialVariants(form.initialVariants);

      if (parsedVariants.error) {
        fields.variants = parsedVariants.error;
      } else {
        inventoryPayload = {
          variants: parsedVariants.value,
        };
      }
    } else {
      fields.inventory = 'Select an Inventory mode.';
    }

    if (images.length === 0) {
      fields.images = 'At least one product image is required.';
    } else if (images.length > ADMIN_PRODUCT_MAX_IMAGES) {
      fields.images = 'You can upload a maximum of 5 images.';
    } else {
      const invalidType = images.some(
        (image) => !ADMIN_PRODUCT_ALLOWED_IMAGE_TYPES.has(image.type),
      );

      const tooLarge = images.some(
        (image) => image.size > ADMIN_PRODUCT_MAX_IMAGE_SIZE,
      );

      if (invalidType) {
        fields.images = 'Only JPEG, PNG and WebP images are allowed.';
      } else if (tooLarge) {
        fields.images = 'Each image must be 5 MB or smaller.';
      }
    }
  }

  return {
    fields,

    payload: {
      name,
      description,
      brand,

      sport: form.sport,

      categoryId: form.categoryId,

      basePrice,

      discountType,
      discountValue,

      specifications: parsedSpecifications.value ?? {},

      ...(editMode
        ? {}
        : {
            ...inventoryPayload,

            isActive: form.isActive,
          }),
    },
  };
}
