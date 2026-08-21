import { Link } from 'react-router';

export function CartEmptyState() {
  return (
    <section className='mt-10 border-y border-[var(--color-border)] py-16 text-center sm:py-20'>
      <p className='mb-2 text-xs font-bold uppercase tracking-[0.15em] text-[var(--color-muted)]'>
        Your Cart
      </p>

      <h2 className='mb-0 text-2xl font-black tracking-[-0.035em] sm:text-3xl'>
        Your Cart is empty
      </h2>

      <p className='mx-auto mt-3 mb-0 max-w-md text-sm leading-6 text-[var(--color-muted)]'>
        Browse the store and add products you want to keep here.
      </p>

      <Link
        to='/shop'
        className='mt-6 inline-flex min-h-11 items-center border border-[var(--color-ink)] bg-[var(--color-ink)] px-5 text-sm font-bold text-white transition hover:bg-[#2b2b2b]'>
        Start shopping
      </Link>
    </section>
  );
}
