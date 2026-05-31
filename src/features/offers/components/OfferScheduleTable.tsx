import type { OfferScheduleDto } from '../types';
import { formatTime } from '../utils/formatters';

interface OfferScheduleTableProps {
  schedules: OfferScheduleDto[];
}

const DAY_NAMES = [
  'Niedziela',
  'Poniedziałek',
  'Wtorek',
  'Środa',
  'Czwartek',
  'Piątek',
  'Sobota',
];

export function OfferScheduleTable({ schedules }: OfferScheduleTableProps) {
  if (!schedules || schedules.length === 0) {
    return null;
  }

  const activeSchedules = schedules
    .filter((s) => s.is_active)
    .sort((a, b) => a.day_of_week - b.day_of_week);

  if (activeSchedules.length === 0) {
    return null;
  }

  return (
    <section className='ui-panel rounded-[24px] p-6'>
      <h2 className='mb-4 text-2xl font-semibold tracking-tight'>
        Harmonogram zajęć
      </h2>

      <div className='overflow-x-auto rounded-2xl border border-white/70 bg-white/70'>
        <table className='w-full'>
          <thead>
            <tr className='border-b bg-muted/50'>
              <th className='text-left py-2 px-4 font-semibold'>
                Dzień tygodnia
              </th>
              <th className='text-left py-2 px-4 font-semibold'>Godziny</th>
            </tr>
          </thead>
          <tbody>
            {activeSchedules.map((schedule) => (
              <tr key={schedule.id} className='border-b last:border-0'>
                <td className='py-3 px-4'>{DAY_NAMES[schedule.day_of_week]}</td>
                <td className='py-3 px-4'>
                  {formatTime(schedule.start_time)} –{' '}
                  {formatTime(schedule.end_time)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
