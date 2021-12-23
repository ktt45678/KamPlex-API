import { registerDecorator, ValidationArguments, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

import { ShortDate } from '../resources/auth/entities/short-date.entity';

@ValidatorConstraint()
export class MaxShortDateConstraint implements ValidatorConstraintInterface {
  validate(value: ShortDate, args: ValidationArguments) {
    if (!value || !value.day || !value.month || !value.year)
      return false;
    const [target] = args.constraints;
    const year = target.getFullYear();
    const month = target.getMonth() + 1;
    const day = target.getDate();
    if (value.year < year)
      return true;
    else if (value.year === year && value.month < month)
      return true;
    else if (value.year === year && value.month === month && value.day <= day)
      return true;
    return false;
  }

  defaultMessage(args: ValidationArguments) {
    const [target] = args.constraints;
    return `${args.property} must not be after ${target}`;
  }
}

export function MaxShortDate(property: Date, validationOptions?: ValidationOptions) {
  return (object: any, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [property],
      validator: MaxShortDateConstraint,
    });
  };
}