import { Badge } from '../../../components/ui/Badge.jsx';

import { formatOrderLabel, getOrderStatusVariant } from '../order.utils.js';

export function OrderStatusBadge({ status }) {
  return (
    <Badge variant={getOrderStatusVariant(status)}>
      {formatOrderLabel(status)}
    </Badge>
  );
}
