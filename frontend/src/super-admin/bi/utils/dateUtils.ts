export const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

export const monthToRange = (monthValue: string): { start: string; end: string } => {
  const [year, month] = monthValue.split('-').map(Number);

  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return defaultMonthRange();
  }

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);

  return {
    start: formatDate(start),
    end: formatDate(end),
  };
};

export const defaultMonthRange = (): { start: string; end: string } => {
  const now = new Date();
  return monthToRange(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
};

export const currentMonthValue = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};
