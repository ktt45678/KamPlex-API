import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { registerDecorator, ValidationArguments, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { firstValueFrom } from 'rxjs';

@Injectable()
@ValidatorConstraint({ async: true })
export class ReCaptchaConstraint implements ValidatorConstraintInterface {
  constructor(private httpService: HttpService, private configService: ConfigService) { }
  async validate(value: any) {
    const reCaptchaSecret = this.configService.get<string>('RECAPTCHA_SECRET');
    if (!reCaptchaSecret) return true;
    try {
      const response = await firstValueFrom(this.httpService.post('https://www.google.com/recaptcha/api/siteverify', {}, {
        params: {
          secret: reCaptchaSecret,
          response: value
        }
      }));
      if (response.data.success)
        return true;
      return false;
    } catch {
      return false;
    }
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} must be valid`;
  }
}

export function ReCaptcha(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: ReCaptchaConstraint,
    });
  };
}