export function AuthPageHeader({ eyebrow, title, description }) {
  return (
    <header>
      {eyebrow ? (
        <p className='mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-muted)]'>
          {eyebrow}
        </p>
      ) : null}

      <h1 className='mb-0 text-3xl font-black tracking-[-0.04em] sm:text-4xl'>
        {title}
      </h1>

      {description ? (
        <p className='mt-3 mb-0 text-sm leading-6 text-[var(--color-muted)]'>
          {description}
        </p>
      ) : null}
    </header>
  );
}
