import { Injectable } from '@nestjs/common';
import { registerDecorator, ValidationArguments, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { AuthService } from '../resources/auth/auth.service';

@Injectable()
@ValidatorConstraint({ async: true })
export class UsernameExistConstraint implements ValidatorConstraintInterface {
  constructor(private authService: AuthService) { }
  async validate(username: any) {
    const user = await this.authService.findByUsername(username);
    if (user)
      return false;
    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} has already been used`;
  }
}

export function UsernameExist(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: UsernameExistConstraint,
    });
  };
}