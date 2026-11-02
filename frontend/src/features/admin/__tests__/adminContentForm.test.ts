import { describe, expect, it } from 'vitest';
import { emptyFormValues, stepGuardError, toFormValues, toPayloadValues } from '@/features/admin/data/adminContentForm';
import type { AdminField } from '@/features/admin/types';

const userField: AdminField = { name: 'owner', attr: 'owner_id', label: 'Owner', kind: 'user_ref', required: true };

describe('generic admin user_ref form values', () => {
  it('hydrates object references and submits only the user id', () => {
    const values = toFormValues([userField], { owner: { id: 'u1', fullName: 'Sara' } });
    expect(values.owner).toEqual({ id: 'u1', label: 'Sara' });
    expect(toPayloadValues([userField], values, true)).toEqual({ payload: { owner: 'u1' }, error: null });
  });

  it('requires a user reference and keeps empty values safe', () => {
    const values = emptyFormValues([userField]);
    expect(stepGuardError([userField], values)).toContain('Owner');
    expect(toPayloadValues([userField], values, true).error).toContain('Owner');
  });
});
