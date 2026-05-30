/** Shared Socket.io room names for direct chat. */
export function getDirectRoom(userA: string, userB: string): string {
  const [first, second] = [userA, userB].sort();
  return `direct:${first}:${second}`;
}

export function getUserRoom(userId: string): string {
  return `user:${userId}`;
}

export function getGroupRoom(groupId: string): string {
  return `group:${groupId}`;
}
