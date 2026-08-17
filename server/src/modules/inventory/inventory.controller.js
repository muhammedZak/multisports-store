import {
  validateAdminInventoryQuery,
  validateManualInventoryAdjustmentInput,
  validateAdminInventoryAdjustmentHistoryQuery,
} from './inventory.validation.js';

import {
  getAdminInventories,
  getAdminInventory,
  adjustInventoryManually,
  getAdminInventoryAdjustments,
} from './inventory.service.js';

export async function getInventoriesForAdmin(req, res) {
  const query = validateAdminInventoryQuery(req.query);

  const result = await getAdminInventories(query);

  res.status(200).json({
    success: true,

    data: {
      items: result.items,
    },

    meta: result.meta,
  });
}

export async function getInventoryForAdmin(req, res) {
  const inventory = await getAdminInventory(req.params.inventoryId);

  res.status(200).json({
    success: true,

    data: {
      inventory,
    },
  });
}

export async function createInventoryAdjustmentForAdmin(req, res) {
  const input = validateManualInventoryAdjustmentInput(req.body);

  const result = await adjustInventoryManually({
    inventoryId: req.params.inventoryId,

    ...input,

    performedBy: req.user.id,
  });

  res.status(201).json({
    success: true,

    data: {
      inventory: result.inventory,
      adjustment: result.adjustment,
    },
  });
}

export async function getInventoryAdjustmentsForAdmin(req, res) {
  const query = validateAdminInventoryAdjustmentHistoryQuery(req.query);

  const result = await getAdminInventoryAdjustments(
    req.params.inventoryId,
    query,
  );

  res.status(200).json({
    success: true,

    data: {
      items: result.items,
    },

    meta: result.meta,
  });
}
