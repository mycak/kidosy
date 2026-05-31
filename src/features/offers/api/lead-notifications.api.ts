import { supabaseClient } from '@/db/supabase.client';

const EMAIL_NOTIFICATION_FUNCTION_NAME = 'send-lead-notification';

export async function sendLeadNotificationEmail(
  leadIds: string[],
): Promise<void> {
  if (leadIds.length === 0) {
    return;
  }

  const { error } = await supabaseClient.functions.invoke(
    EMAIL_NOTIFICATION_FUNCTION_NAME,
    {
      body: {
        leadIds,
      },
    },
  );

  if (error) {
    throw new Error(
      error.message || 'Nie udało się wysłać maila do organizatora',
    );
  }
}