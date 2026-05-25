import { STAFF_USERS } from '../mock/users';
import { UserSession } from '../types';

export function findAllStaffUsers(): UserSession[] {
  return STAFF_USERS.map(user => ({ ...user }));
}
