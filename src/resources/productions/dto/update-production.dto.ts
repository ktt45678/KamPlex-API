import { PartialType } from '@nestjs/swagger';
import { CreateProductionDto } from './create-production.dto';

export class UpdateProductionDto extends PartialType(CreateProductionDto) {}
