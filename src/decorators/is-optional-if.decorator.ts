import { ValidateIf, ValidationOptions } from 'class-validator';

export function IsOptionalIf(allowOptional: (obj: any, value: any) => boolean, validationOptions?: ValidationOptions) {
  return ValidateIf((obj, value) => !allowOptional(obj, value) || value != null, validationOptions);
}