export interface UserWithPermissions {
  id: string;
  roles: {
    permissions: {
      name: string;
    }[];
  }[];
  permissions: {
    name: string;
  }[];
}
