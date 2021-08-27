import { PartialType } from '@nestjs/swagger';
import { AddStorageDto } from './add-storage.dto';

export class UpdateStorageDto extends PartialType(AddStorageDto) { }