import { registerDecorator, ValidationArguments, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import ISO6391 from 'iso-639-1';

@ValidatorConstraint()
export class IsISO6391Constraint implements ValidatorConstraintInterface {
  validate(value: string) {
    return ISO6391.validate(value)
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} must be a valid iso 6391 language code`;
  }
}

export function IsISO6391(validationOptions?: ValidationOptions) {
  return (object: any, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsISO6391Constraint,
    });
  };
}
