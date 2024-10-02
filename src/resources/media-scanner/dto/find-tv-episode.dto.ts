import { IntersectionType } from '@nestjs/swagger';

import { MediaLanguageDto } from './media-language.dto';
import { MediaProviderDto } from './media-provider.dto';

export class FindTVEpisodeDto extends IntersectionType(MediaProviderDto, MediaLanguageDto) { }
