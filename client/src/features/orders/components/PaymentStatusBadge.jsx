import { Badge } from '../../../components/ui/Badge.jsx';

import { formatOrderLabel } from '../order.utils.js';

import { getAdminPaymentStatusVariant } from '../adminOrder.utils.js';

export function PaymentStatusBadge({ status }) {
  if (!status) {
    return <Badge variant='neutral'>Unavailable</Badge>;
  }

  return (
    <Badge variant={getAdminPaymentStatusVariant(status)}>
      {formatOrderLabel(status)}
    </Badge>
  );
}
