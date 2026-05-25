import { STAFF_USERS } from '../mock/users';
import { RestaurantId, UserSession } from '../types';

export function getStaffUsers(restaurantId: RestaurantId): UserSession[] {
  return STAFF_USERS
    .filter(user => user.restaurantId === restaurantId)
    .map(user => ({ ...user }));
}

export function getDefaultUser(restaurantId: RestaurantId): UserSession {
  const user = STAFF_USERS.find(current => current.restaurantId === restaurantId) ?? STAFF_USERS[0];
  return { ...user };
}

export function ensureUserRestaurantId(user: UserSession, restaurantId: RestaurantId): UserSession {
  return { ...user, restaurantId: user.restaurantId ?? restaurantId };
}
