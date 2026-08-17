import { validateAdminInventoryQuery } from './inventory.validation.js';

import { getAdminInventories, getAdminInventory } from './inventory.service.js';

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
