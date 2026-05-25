import { STAFF_USERS } from '../mock/users';
import { UserSession } from '../types';

export function getStaffUsers(): UserSession[] {
  return STAFF_USERS.map(user => ({ ...user }));
}

export function getDefaultUser(): UserSession {
  return { ...STAFF_USERS[0] };
}
