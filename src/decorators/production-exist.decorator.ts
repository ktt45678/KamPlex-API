import { Injectable } from '@nestjs/common';
import { registerDecorator, ValidationArguments, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

import { ProductionsService } from '../resources/productions/productions.service';

@Injectable()
@ValidatorConstraint({ async: true })
export class ProductionExistConstraint implements ValidatorConstraintInterface {
  constructor(private productionsService: ProductionsService) { }
  async validate(name: any) {
    const production = await this.productionsService.findByName(name);
    if (production)
      return false;
    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} has already been used`;
  }
}

export function ProductionExist(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: ProductionExistConstraint,
    });
  };
}