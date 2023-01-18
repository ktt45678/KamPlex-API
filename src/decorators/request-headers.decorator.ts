import { createParamDecorator, ExecutionContext/*, HttpException, HttpStatus, ValidationError*/ } from '@nestjs/common';
import { ClassConstructor, plainToInstance } from 'class-transformer';
//import { validate } from 'class-validator';

export const RequestHeaders = createParamDecorator(
  //Removed ClassType<unknown>,, I don't think you need this here
  (value: ClassConstructor<unknown>, ctx: ExecutionContext) => {

    // extract headers
    const headers = ctx.switchToHttp().getRequest().headers;

    // Convert headers to DTO object
    const dto = plainToInstance(value, headers, { excludeExtraneousValues: true });

    /*
    // Validate
    const errors: ValidationError[] = await validate(dto);

    if (errors.length > 0) {
      //Get the errors and push to custom array
      let validationErrors = errors.map(obj => Object.values(obj.constraints));
      throw new HttpException(`Validation failed with following Errors: ${validationErrors}`, HttpStatus.BAD_REQUEST);
    }
    */

    // return header dto object
    return dto;
  },
);
