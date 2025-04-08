import { registerDecorator, ValidationArguments, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

@ValidatorConstraint()
export class IsNotBothEqualConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const [relatedPropertyName, definedValue] = args.constraints;
    const relatedValue = (args.object as any)[relatedPropertyName];
    return !(relatedValue === definedValue && value === definedValue); // Return true if both are not equal to the defined value
  }

  defaultMessage(args: ValidationArguments) {
    const [relatedPropertyName, definedValue] = args.constraints;
    return `${args.property} and ${relatedPropertyName} cannot both be equal to ${definedValue}.`;
  }
}

export function IsNotBothEqual(propertyToCompare: string, value: any, validationOptions?: ValidationOptions) {
  return (object: Object, propertyName: string) => {
    registerDecorator({
      name: 'isNotBothEqual',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [propertyToCompare, value],
      validator: IsNotBothEqualConstraint
    });
  };
}
