import { Badge } from '../../../components/ui/Badge.jsx';

import { getInventoryStockPresentation } from '../inventory.utils.js';

export function InventoryStockBadge({ stockState }) {
  const presentation = getInventoryStockPresentation(stockState);

  return <Badge variant={presentation.variant}>{presentation.label}</Badge>;
}
