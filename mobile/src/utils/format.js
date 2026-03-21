export function formatIDR(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export function formatPercent(value) {
  return `${Number(value || 0).toFixed(2)}%`;
}

export function formatCompactDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
  });
}

export function formatThousandsInput(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (!digits) {
    return '';
  }

  return new Intl.NumberFormat('id-ID').format(Number(digits));
}

export function normalizeDigits(value) {
  return String(value ?? '').replace(/\D/g, '');
}
