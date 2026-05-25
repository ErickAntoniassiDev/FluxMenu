import * as UserRepository from '../repositories/userRepository';
import { RestaurantId, UserSession } from '../types';

export function getStaffUsers(restaurantId: RestaurantId): UserSession[] {
  const users = UserRepository.findAllStaffUsers();
  const exactUsers = users.filter(user => user.restaurantId === restaurantId);
  const fallbackRestaurantId = users[0]?.restaurantId;
  const fallbackUsers = fallbackRestaurantId ? users.filter(user => user.restaurantId === fallbackRestaurantId) : users;
  return (exactUsers.length > 0 ? exactUsers : fallbackUsers)
    .map(user => ({ ...user, restaurantId }));
}

export function getDefaultUser(restaurantId: RestaurantId): UserSession {
  const users = getStaffUsers(restaurantId);
  const user = users[0];
  return { ...user, restaurantId };
}

export function ensureUserRestaurantId(user: UserSession, restaurantId: RestaurantId): UserSession {
  return { ...user, restaurantId: user.restaurantId ?? restaurantId };
}
