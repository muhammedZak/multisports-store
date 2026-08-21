export function ProfileAvatar({
  name,

  profilePhoto,

  size = 'lg',
}) {
  const sizeClass = size === 'xl' ? 'size-28 text-3xl' : 'size-20 text-2xl';

  const initial = name?.trim()?.charAt(0)?.toUpperCase() || '?';

  if (profilePhoto?.url) {
    return (
      <img
        src={profilePhoto.url}
        alt={`${name || 'Customer'} profile`}
        className={`${sizeClass} shrink-0 rounded-full border border-[var(--color-border)] object-cover`}
      />
    );
  }

  return (
    <div
      aria-hidden='true'
      className={`${sizeClass} grid shrink-0 place-items-center rounded-full bg-[var(--color-surface-strong)] font-black text-[var(--color-muted)]`}>
      {initial}
    </div>
  );
}
