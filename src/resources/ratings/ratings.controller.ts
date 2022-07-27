import { Controller, Get, Post, Body, UseGuards, Query, Res, HttpCode } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiForbiddenResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { FastifyReply } from 'fastify';

import { RatingsService } from './ratings.service';
import { CreateRatingDto, FindRatingDto } from './dto';
import { Rating } from './entities';
import { AuthUser } from '../../decorators/auth-user.decorator';
import { AuthGuardOptions } from '../../decorators/auth-guard-options.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { ErrorMessage } from '../auth';
import { AuthUserDto } from '../users';

@ApiTags('Ratings')
@Controller()
export class RatingsController {
  constructor(private readonly ratingService: RatingsService) { }

  @Post()
  @HttpCode(204)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Rate a media' })
  @ApiNoContentResponse({ description: 'Successfully rated' })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The rating or media could not be found', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  async create(@AuthUser() authUser: AuthUserDto, @Body() createRatingDto: CreateRatingDto) {
    return this.ratingService.create(createRatingDto, authUser);
  }

  @Get()
  @UseGuards(AuthGuard)
  @AuthGuardOptions({ anonymous: true })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'View your rating for a media (optional auth)' })
  @ApiOkResponse({ description: 'Return rating info', type: Rating })
  @ApiNoContentResponse({ description: 'No result' })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  async findOne(@Res() res: FastifyReply, @AuthUser() authUser: AuthUserDto, @Query() findRatingDto: FindRatingDto) {
    const result = await this.ratingService.findOne(findRatingDto, authUser);
    if (!result)
      return res.status(204).send();
    res.status(200).send(result);
  }
}
