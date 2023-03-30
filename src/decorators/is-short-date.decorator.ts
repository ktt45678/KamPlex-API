import { registerDecorator, ValidationArguments, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

import { ShortDate } from '../common/entities';

@ValidatorConstraint()
export class IsShortDateConstraint implements ValidatorConstraintInterface {
  validate(value: ShortDate) {
    if (!value || !value.day || !value.month || !value.year)
      return false;
    const date = new Date(`${value.year}-${value.month}-${value.day}`);
    if (date instanceof Date && !isNaN(date.getTime()))
      return true;
    return false;
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} must be a valid date`;
  }
}

export function IsShortDate(validationOptions?: ValidationOptions) {
  return (object: any, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsShortDateConstraint,
    });
  };
}
