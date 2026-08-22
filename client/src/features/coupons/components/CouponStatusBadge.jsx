import { Badge } from '../../../components/ui/Badge.jsx';

export function CouponStatusBadge({ isActive }) {
  return (
    <Badge variant={isActive ? 'success' : 'neutral'}>
      {isActive ? 'Active' : 'Inactive'}
    </Badge>
  );
}
