import { registerDecorator, ValidationArguments, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

@ValidatorConstraint()
export class IsEndsWithConstraint implements ValidatorConstraintInterface {
  validate(value: string, args: ValidationArguments) {
    const [searchString] = args.constraints;
    if (typeof searchString === 'string')
      return value.endsWith(searchString);
    else if (Array.isArray(searchString)) {
      for (let i = 0; i < searchString.length; i++) {
        if (typeof searchString[i] === 'string' && value.endsWith(searchString[i]))
          return true;
      }
    }
    return false;
  }

  defaultMessage(args: ValidationArguments) {
    const [searchString] = args.constraints;
    if (Array.isArray(searchString))
      return `${args.property} must end with one of the following strings ${searchString.join(', ')}`;
    return `${args.property} must end with ${searchString}`;
  }
}

export function IsEndsWith(property: string | string[], validationOptions?: ValidationOptions) {
  return (object: any, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [property],
      validator: IsEndsWithConstraint,
    });
  };
}