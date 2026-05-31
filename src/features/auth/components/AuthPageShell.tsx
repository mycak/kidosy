import type { ReactNode } from 'react';
import {
  MapPinned,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

type AuthPageShellProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function AuthPageShell({
  title,
  description,
  children,
}: AuthPageShellProps) {
  return (
    <section className='relative flex flex-1 items-center justify-center overflow-hidden px-4 py-8'>
      <div className='absolute inset-0 bg-linear-to-br from-sky-100/80 via-white to-rose-100/80' />
      <div className='absolute -top-24 -left-24 h-72 w-72 rounded-full bg-sky-300/25 blur-3xl ui-float' />
      <div className='absolute -right-16 -bottom-20 h-80 w-80 rounded-full bg-rose-300/20 blur-3xl ui-float' />

      <div className='relative grid w-full max-w-6xl gap-6 lg:grid-cols-2'>
        <div className='ui-entrance ui-panel hidden min-h-[640px] flex-col justify-between overflow-hidden rounded-[32px] p-8 text-foreground lg:flex'>
          <div>
            <Badge variant='secondary' className='mb-4 w-fit'>
              <Sparkles className='size-3' />
              premium onboarding
            </Badge>

            <h2 className='max-w-md text-4xl font-semibold tracking-tight xl:text-5xl'>
              Witaj w panelu, który wygląda tak dobrze, jak działa.
            </h2>
            <p className='mt-4 max-w-lg text-sm leading-6 text-muted-foreground'>
              Szybkie logowanie, przejrzysty onboarding i dokładnie tyle blasku,
              ile potrzeba, żeby nie było smutno jak w formularzu z 2014.
            </p>
          </div>

          <div className='grid gap-3 text-sm text-foreground'>
            <div className='flex items-center gap-3 rounded-2xl border border-white/60 bg-white/70 px-4 py-3'>
              <ShieldCheck className='size-4 text-emerald-500' />
              Bezpieczne konto organizatora
            </div>
            <div className='flex items-center gap-3 rounded-2xl border border-white/60 bg-white/70 px-4 py-3'>
              <Users className='size-4 text-sky-500' />
              Zarządzanie ofertami i zgłoszeniami w jednym miejscu
            </div>
            <div className='flex items-center gap-3 rounded-2xl border border-white/60 bg-white/70 px-4 py-3'>
              <MapPinned className='size-4 text-rose-500' />
              Użytkownicy szybciej znajdują zajęcia w swojej okolicy
            </div>
          </div>
        </div>

        <Card className='ui-entrance ui-panel min-h-[640px] rounded-[32px] border-white/70'>
          <CardHeader className='space-y-3'>
            <div className='flex items-center justify-between gap-3'>
              <div className='space-y-1'>
                <Badge variant='secondary'>Kidosy organizer</Badge>
                <CardTitle className='text-2xl'>{title}</CardTitle>
              </div>
              <div className='flex size-11 items-center justify-center rounded-2xl bg-linear-to-br from-sky-500 via-emerald-500 to-rose-500 text-white shadow-lg shadow-sky-500/20'>
                <Sparkles className='size-4' />
              </div>
            </div>
            <CardDescription className='max-w-md text-sm leading-6'>
              {description}
            </CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className='pt-6'>{children}</CardContent>
        </Card>
      </div>
    </section>
  );
}
