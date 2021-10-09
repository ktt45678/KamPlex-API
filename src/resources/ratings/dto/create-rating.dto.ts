import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty } from 'class-validator';

import { RatingKind } from '../../../enums/rating-kind.enum';
import { StatusCode } from '../../../enums/status-code.enum';

export class CreateRatingDto {
  @ApiProperty({
    type: String,
    description: 'Media id'
  })
  @Type(() => String)
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  media: string;

  @ApiProperty({
    type: Number,
    description: 'Kind of rating: 0 (None), 1 (Like), 2 (Dislike)',
    enum: [RatingKind.NONE, RatingKind.LIKE, RatingKind.DISLIKE]
  })
  @Type(() => Number)
  @IsIn([RatingKind.NONE, RatingKind.LIKE, RatingKind.DISLIKE])
  @IsInt({ context: { code: StatusCode.IS_INT } })
  kind: number;
}
