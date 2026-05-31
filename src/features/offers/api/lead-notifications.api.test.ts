import { describe, expect, it, vi, beforeEach } from 'vitest';

const { invokeMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
}));

vi.mock('@/db/supabase.client', () => ({
  supabaseClient: {
    functions: {
      invoke: invokeMock,
    },
  },
}));

import { sendLeadNotificationEmail } from './lead-notifications.api';

describe('sendLeadNotificationEmail', () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it('does not call edge function when leadIds are empty', async () => {
    await sendLeadNotificationEmail([]);

    expect(invokeMock).not.toHaveBeenCalled();
  });

  it('calls edge function with leadIds payload', async () => {
    invokeMock.mockResolvedValueOnce({ error: null, data: { ok: true } });

    await sendLeadNotificationEmail(['lead-1', 'lead-2']);

    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(invokeMock).toHaveBeenCalledWith('send-lead-notification', {
      body: {
        leadIds: ['lead-1', 'lead-2'],
      },
    });
  });

  it('throws when edge function returns error', async () => {
    invokeMock.mockResolvedValueOnce({
      error: { message: 'mail dispatch failed' },
      data: null,
    });

    await expect(sendLeadNotificationEmail(['lead-1'])).rejects.toThrow(
      'mail dispatch failed',
    );
  });
});
