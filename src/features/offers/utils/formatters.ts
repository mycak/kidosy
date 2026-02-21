import { format, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';

export const formatDate = (dateString: string): string => {
  try {
    return format(parseISO(dateString), 'd MMMM yyyy', { locale: pl });
  } catch {
    return dateString;
  }
};

export const formatDateRange = (startDate: string, endDate: string): string => {
  try {
    const start = parseISO(startDate);
    const end = parseISO(endDate);

    return `${format(start, 'd MMMM yyyy', { locale: pl })} – ${format(end, 'd MMMM yyyy', { locale: pl })}`;
  } catch {
    return `${startDate} – ${endDate}`;
  }
};

export const formatTime = (timeString: string): string => {
  return timeString.substring(0, 5);
};

export const getAgeRange = (ages: number[]): string => {
  if (!ages || ages.length === 0) return 'Nie określono';
  const min = Math.min(...ages);
  const max = Math.max(...ages);
  return min === max ? `${min} lat` : `${min}–${max} lat`;
};
