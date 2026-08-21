import { NavLink } from 'react-router';

const accountNavigation = [
  {
    label: 'Profile',
    to: '/account',
    end: true,
  },
  {
    label: 'Orders',
    to: '/account/orders',
  },
  {
    label: 'Addresses',
    to: '/account/addresses',
  },
  {
    label: 'Reviews',
    to: '/account/reviews',
  },
  {
    label: 'Refunds',
    to: '/account/refunds',
  },
  {
    label: 'Notifications',
    to: '/account/notifications',
  },
  {
    label: 'Support',
    to: '/account/support',
  },
  {
    label: 'Security',
    to: '/account/security',
  },
];

export function AccountNavigation({ onNavigate }) {
  return (
    <nav aria-label='Account navigation'>
      <ul className='m-0 list-none space-y-1 p-0'>
        {accountNavigation.map(({ label, to, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              onClick={onNavigate}
              className={({ isActive }) =>
                [
                  'block border-l-2 px-3 py-2.5 text-sm font-semibold transition-colors',
                  isActive
                    ? 'border-[var(--color-ink)] bg-[var(--color-surface)] text-[var(--color-ink)]'
                    : 'border-transparent text-[var(--color-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-ink)]',
                ].join(' ')
              }>
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
