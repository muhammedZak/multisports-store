import { Badge } from '../../../components/ui/Badge.jsx';

import { getRefundStatusPresentation } from '../refund.utils.js';

export function RefundStatusBadge({ status }) {
  const presentation = getRefundStatusPresentation(status);

  return <Badge variant={presentation.variant}>{presentation.label}</Badge>;
}
