const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
});

export function formatInrFromPaise(paise) {
  if (!Number.isInteger(paise)) {
    return '—';
  }

  return inrFormatter.format(paise / 100);
}

export function paiseToRupeesInput(paise) {
  if (!Number.isInteger(paise)) {
    return '';
  }

  return (paise / 100).toFixed(2);
}

export function parseRupeesToPaise(value) {
  const normalizedValue = String(value).trim();

  if (!/^\d+(?:\.\d{1,2})?$/.test(normalizedValue)) {
    return null;
  }

  const [rupeesText, paiseText = ''] = normalizedValue.split('.');

  const rupees = Number(rupeesText);

  const paise = Number(paiseText.padEnd(2, '0'));

  const totalPaise = rupees * 100 + paise;

  if (!Number.isSafeInteger(totalPaise)) {
    return null;
  }

  return totalPaise;
}
