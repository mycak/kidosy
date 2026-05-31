import type { ReactNode } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

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
    <section className='flex flex-1 items-center justify-center bg-linear-to-br from-sky-50 via-emerald-50 to-rose-50 p-4'>
      <Card className='w-full max-w-md'>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </section>
  );
}
