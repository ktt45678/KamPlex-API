import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, HttpCode, UseInterceptors, ClassSerializerInterceptor, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiExtraModels, ApiForbiddenResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse, getSchemaPath } from '@nestjs/swagger';

import { ProducersService } from './producers.service';
import { AuthUserDto } from '../users/dto/auth-user.dto';
import { CreateProducerDto } from './dto/create-producer.dto';
import { UpdateProducerDto } from './dto/update-producer.dto';
import { PaginateDto } from '../roles/dto/paginate.dto';
import { RolesGuardOptions } from '../../decorators/roles-guard-options.decorator';
import { AuthUser } from '../../decorators/auth-user.decorator';
import { UserPermission } from '../../enums/user-permission.enum';
import { ErrorMessage } from '../auth/entities/error-message.entity';
import { InfoMessage } from '../auth/entities/info-message.entity';
import { Paginated } from '../roles/entities/paginated.entity';
import { Producer } from './entities/producer.entity';
import { ProducerDetails } from './entities/producer-details.entity';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('Producers')
@ApiExtraModels(Producer)
@Controller()
export class ProducersController {
  constructor(private readonly producersService: ProducersService) { }

  @Post()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a producer' })
  @ApiOkResponse({ description: 'Return new producer', type: ProducerDetails })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  create(@AuthUser() authUser: AuthUserDto, @Body() createProducerDto: CreateProducerDto) {
    return this.producersService.create(createProducerDto, authUser);
  }

  @Get()
  @ApiOperation({ summary: 'Find all producer' })
  @ApiOkResponse({
    description: 'Return a list of producers',
    schema: {
      allOf: [
        { $ref: getSchemaPath(Paginated) },
        { properties: { results: { type: 'array', items: { $ref: getSchemaPath(Producer) } } } }
      ]
    }
  })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  findAll(@Query() paginateDto: PaginateDto) {
    return this.producersService.findAll(paginateDto);
  }

  @Get(':id')
  @UseInterceptors(ClassSerializerInterceptor)
  @ApiOperation({ summary: 'Get details of a producer' })
  @ApiOkResponse({ description: 'Return a producer', type: ProducerDetails })
  @ApiNotFoundResponse({ description: 'The producer could not be found', type: ErrorMessage })
  findOne(@Param('id') id: string) {
    return this.producersService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Update details of a producer (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiOkResponse({ description: 'Return updated producer', type: ProducerDetails })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: InfoMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiNotFoundResponse({ description: 'The producer could not be found', type: ErrorMessage })
  update(@Param('id') id: string, @Body() updateProducerDto: UpdateProducerDto) {
    return this.producersService.update(id, updateProducerDto);
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.MANAGE_MEDIA] })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Delete a producer (permissions: ${UserPermission.MANAGE_MEDIA})` })
  @ApiNoContentResponse({ description: 'Producer has been deleted' })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: InfoMessage })
  @ApiNotFoundResponse({ description: 'The producer could not be found', type: ErrorMessage })
  remove(@Param('id') id: string) {
    return this.producersService.remove(id);
  }
}
