import { Controller, Get, Post, Body, UseGuards, Query, Res, Delete, Param, UseInterceptors, ClassSerializerInterceptor, HttpCode } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiForbiddenResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags, ApiUnauthorizedResponse, getSchemaPath } from '@nestjs/swagger';
import { FastifyReply } from 'fastify';

import { RatingsService } from './ratings.service';
import { CursorPageRatingsDto, CreateRatingDto, FindRatingDto } from './dto';
import { Rating } from './entities';
import { AuthUser } from '../../decorators/auth-user.decorator';
import { AuthGuardOptions } from '../../decorators/auth-guard-options.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { ErrorMessage } from '../auth';
import { AuthUserDto } from '../users';
import { CursorPaginated } from '../../common/entities';
import { HeadersDto } from '../../common/dto';
import { ParseBigIntPipe } from '../../common/pipes';
import { RequestHeaders } from '../../decorators/request-headers.decorator';

@ApiTags('Ratings')
@Controller()
export class RatingsController {
  constructor(private readonly ratingService: RatingsService) { }

  @Post()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Rate a media' })
  @ApiNoContentResponse({ description: 'Successfully rated' })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The rating or media could not be found', type: ErrorMessage })
  async create(@AuthUser() authUser: AuthUserDto, @Body() createRatingDto: CreateRatingDto) {
    return this.ratingService.create(createRatingDto, authUser);
  }

  @Get()
  @UseInterceptors(ClassSerializerInterceptor)
  @UseGuards(AuthGuard)
  @AuthGuardOptions({ anonymous: true })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'View all ratings' })
  @ApiOkResponse({
    description: 'Return a list of ratings',
    schema: {
      allOf: [
        { $ref: getSchemaPath(CursorPaginated) },
        { properties: { results: { type: 'array', items: { $ref: getSchemaPath(Rating) } } } }
      ]
    }
  })
  @ApiNotFoundResponse({ description: 'The resource could not be found', type: ErrorMessage })
  findAll(@AuthUser() authUser: AuthUserDto, @Query() cursorPageRatingstDto: CursorPageRatingsDto, @RequestHeaders(HeadersDto) headers: HeadersDto) {
    return this.ratingService.findAll(cursorPageRatingstDto, headers, authUser);
  }

  @Get('find_media')
  @UseGuards(AuthGuard)
  @AuthGuardOptions({ anonymous: true })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'View your rating for a media (optional auth)' })
  @ApiOkResponse({ description: 'Return rating info', type: Rating })
  @ApiNoContentResponse({ description: 'No result' })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  async findMedia(@Res() res: FastifyReply, @AuthUser() authUser: AuthUserDto, @Query() findRatingDto: FindRatingDto) {
    const result = await this.ratingService.findMedia(findRatingDto, authUser);
    if (!result)
      return res.status(204).send();
    res.status(200).send(result);
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiOperation({ summary: 'Remove a rating' })
  @ApiNoContentResponse({ description: 'Successfully removed' })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The rating could not be found', type: ErrorMessage })
  async remove(@AuthUser() authUser: AuthUserDto, @Param('id', ParseBigIntPipe) id: bigint) {
    return this.ratingService.remove(id, authUser);
  }
}
