import { SetMetadata } from '@nestjs/common';

const defaultOptions: PermissionOptions = { permissions: [], throwError: true, requireOwner: false };

export const RolesGuardOptions = (options: PermissionOptions) => {
  options = { ...defaultOptions, ...options };
  return SetMetadata('rolesGuardOptions', options);
};

export class PermissionOptions {
  permissions?: number[];
  throwError?: boolean;
  requireOwner?: boolean;
}