import { Injectable } from '@nestjs/common';
import { registerDecorator, ValidationArguments, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

import { ExternalStoragesService } from '../resources/external-storages/external-storages.service';

@Injectable()
@ValidatorConstraint({ async: true })
export class ExtStorageNameExistConstraint implements ValidatorConstraintInterface {
  constructor(private externalStoragesService: ExternalStoragesService) { }
  async validate(name: any) {
    const storage = await this.externalStoragesService.findByName(name);
    if (storage)
      return false;
    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} has already been used`;
  }
}

export function ExtStorageNameExist(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: ExtStorageNameExistConstraint,
    });
  };
}