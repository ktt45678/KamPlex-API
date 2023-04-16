import { OffsetPaginateDto } from '../../../common/dto';

export class PaginateDto extends OffsetPaginateDto {
  /*
  @ApiProperty({
    type: String,
    description: 'incl:field1,field2 or excl:field1,field2',
    required: false,
    maxLength: 200,
    minLength: 1,
    example: 'excl:__v'
  })
  @IsOptional()
  @Length(1, 200, { context: { code: StatusCode.LENGTH } })
  @Matches(/^(?:incl|excl)\:[\w\.]+(?:,[\w\.]+)*$/, { message: 'fields query must be valid', context: { code: StatusCode.MATCHES_REGEX } })
  fields?: string;
  */
}
