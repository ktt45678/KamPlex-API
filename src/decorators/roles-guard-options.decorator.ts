import { SetMetadata } from '@nestjs/common';

export const RolesGuardOptions = (...permissions: number[]) => SetMetadata('permissions', permissions);