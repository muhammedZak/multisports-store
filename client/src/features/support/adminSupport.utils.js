import { supportDateFormatter } from './support.utils.js';

export function formatAdminSupportActivityDate(value) {
  if (!value) {
    return 'No messages yet';
  }

  return supportDateFormatter.format(new Date(value));
}
