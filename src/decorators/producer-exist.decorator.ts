import { Injectable } from '@nestjs/common';
import { registerDecorator, ValidationArguments, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

import { ProducersService } from '../resources/producers/producers.service';

@Injectable()
@ValidatorConstraint({ async: true })
export class ProducerExistConstraint implements ValidatorConstraintInterface {
  constructor(private producersService: ProducersService) { }
  async validate(name: any) {
    const producer = await this.producersService.findByName(name);
    if (producer)
      return false;
    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} has already been used`;
  }
}

export function ProducerExist(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: ProducerExistConstraint,
    });
  };
}