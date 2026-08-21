import { Outlet } from 'react-router';

import { ShellFooter } from '../components/shared/ShellFooter.jsx';

import { StorefrontHeader } from '../components/shared/navigation/StorefrontHeader.jsx';

function StorefrontLayout() {
  return (
    <div className='flex min-h-screen flex-col bg-[var(--color-canvas)] text-[var(--color-ink)]'>
      <StorefrontHeader />

      <div className='flex-1'>
        <Outlet />
      </div>

      <ShellFooter />
    </div>
  );
}

export default StorefrontLayout;
