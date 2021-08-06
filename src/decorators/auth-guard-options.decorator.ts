import { SetMetadata } from '@nestjs/common';

export const AuthGuardOptions = (authGuardOptions: AuthOptions) => SetMetadata('authGuardOptions', authGuardOptions);

export class AuthOptions {
  anonymous?: boolean = false;
}