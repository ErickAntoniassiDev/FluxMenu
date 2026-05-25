import * as UserRepository from '../repositories/userRepository';
import { RestaurantId, UserSession } from '../types';

export function getStaffUsers(restaurantId: RestaurantId): UserSession[] {
  return UserRepository.findAllStaffUsers()
    .filter(user => user.restaurantId === restaurantId)
    .map(user => ({ ...user }));
}

export function getDefaultUser(restaurantId: RestaurantId): UserSession {
  const users = UserRepository.findAllStaffUsers();
  const user = users.find(current => current.restaurantId === restaurantId) ?? users[0];
  return { ...user };
}

export function ensureUserRestaurantId(user: UserSession, restaurantId: RestaurantId): UserSession {
  return { ...user, restaurantId: user.restaurantId ?? restaurantId };
}
