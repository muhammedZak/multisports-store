export const supportDateFormatter = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function formatSupportMessageDate(value) {
  if (!value) {
    return '';
  }

  return supportDateFormatter.format(new Date(value));
}

export function mergeUniqueSupportMessages(...groups) {
  const messagesById = new Map();

  for (const group of groups) {
    for (const message of group ?? []) {
      if (message?.id) {
        messagesById.set(message.id, message);
      }
    }
  }

  return Array.from(messagesById.values()).sort((first, second) => {
    const timeDifference =
      new Date(first.createdAt).getTime() -
      new Date(second.createdAt).getTime();

    if (timeDifference !== 0) {
      return timeDifference;
    }

    return first.id.localeCompare(second.id);
  });
}
