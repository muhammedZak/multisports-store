import { NavLink } from 'react-router';

const navigationGroups = [
  {
    label: 'Overview',
    items: [
      {
        label: 'Dashboard',
        to: '/admin',
        end: true,
      },
      {
        label: 'Analytics',
        to: '/admin/analytics',
      },
    ],
  },

  {
    label: 'Catalog',
    items: [
      {
        label: 'Products',
        to: '/admin/products',
      },
      {
        label: 'Categories',
        to: '/admin/categories',
      },
      {
        label: 'Inventory',
        to: '/admin/inventory',
      },
      {
        label: 'Coupons',
        to: '/admin/coupons',
      },
    ],
  },

  {
    label: 'Orders & service',
    items: [
      {
        label: 'Orders',
        to: '/admin/orders',
      },
      {
        label: 'Reviews',
        to: '/admin/reviews',
      },
      {
        label: 'Refunds',
        to: '/admin/refunds',
      },
    ],
  },

  {
    label: 'Communication',
    items: [
      {
        label: 'Notifications',
        to: '/admin/notifications',
      },
      {
        label: 'Support',
        to: '/admin/support',
      },
    ],
  },
];

export function AdminNavigation({ onNavigate }) {
  return (
    <nav aria-label='Admin navigation'>
      <div className='space-y-7'>
        {navigationGroups.map((group) => (
          <section key={group.label}>
            <p className='mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]'>
              {group.label}
            </p>

            <ul className='m-0 list-none space-y-1 p-0'>
              {group.items.map(({ label, to, end }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      [
                        'block border-l-2 px-3 py-2 text-sm font-semibold transition-colors',
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
          </section>
        ))}
      </div>
    </nav>
  );
}
