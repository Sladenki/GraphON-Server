export enum UserRole {
    Create = 'create',
    Admin = 'admin',
    Editor = 'editor',
    User = 'user',
}

export const RoleHierarchy: Record<UserRole, number> = {
    [UserRole.Create]: 3,
    [UserRole.Admin]: 2,
    [UserRole.Editor]: 1,
    [UserRole.User]: 0,
};
  