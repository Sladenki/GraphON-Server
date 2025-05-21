export enum UserRole {
    Create = 'create',
    Admin = 'admin',
    Editor = 'editor',
    SysAdmin = 'sysadmin',
    User = 'user',
}

export const RoleHierarchy: Record<UserRole, number> = {
    [UserRole.Create]: 4,
    [UserRole.Admin]: 3,
    [UserRole.Editor]: 2,
    [UserRole.SysAdmin]: 1,
    [UserRole.User]: 0,
};
  