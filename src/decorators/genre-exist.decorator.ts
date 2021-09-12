import { Injectable } from '@nestjs/common';
import { registerDecorator, ValidationArguments, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { GenresService } from '../resources/genres/genres.service';

@Injectable()
@ValidatorConstraint({ async: true })
export class GenreExistConstraint implements ValidatorConstraintInterface {
  constructor(private genresService: GenresService) { }
  async validate(name: any, args: ValidationArguments) {
    const genre = await this.genresService.findByName(name, (<any>args.object).language);
    if (genre)
      return false;
    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} has already been used`;
  }
}

export function GenreExist(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: GenreExistConstraint,
    });
  };
}