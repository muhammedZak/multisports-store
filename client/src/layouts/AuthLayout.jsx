import { Outlet } from 'react-router';

function AuthLayout() {
  return (
    <main className='min-h-screen bg-white'>
      <div className='grid min-h-screen lg:grid-cols-2'>
        <section className='hidden bg-neutral-950 p-12 text-white lg:flex lg:flex-col lg:justify-between'>
          <div className='text-xl font-bold'>MULTISPORTS</div>

          <div>
            <p className='text-sm uppercase tracking-[0.3em] text-neutral-400'>
              Built for every game
            </p>

            <h1 className='mt-4 max-w-lg text-5xl font-semibold leading-tight'>
              Your sport.
              <br />
              Your gear.
            </h1>
          </div>
        </section>

        <section className='flex items-center justify-center px-6 py-12'>
          <div className='w-full max-w-md'>
            <Outlet />
          </div>
        </section>
      </div>
    </main>
  );
}

export default AuthLayout;
