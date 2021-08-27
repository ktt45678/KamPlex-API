import { PartialType } from '@nestjs/swagger';
import { CreateMediaScannerDto } from './create-media-scanner.dto';

export class UpdateMediaScannerDto extends PartialType(CreateMediaScannerDto) {}
