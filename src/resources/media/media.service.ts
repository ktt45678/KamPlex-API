import { Injectable } from '@nestjs/common';
import { CreateMediaDto } from './dto/create-media.dto';
import { UpdateMediaDto } from './dto/update-media.dto';

import { ImgurService } from '../../common/imgur/imgur.service';

@Injectable()
export class MediaService {
  constructor(private imgurService: ImgurService) { }

  create(createMediaDto: CreateMediaDto) {
    return this.imgurService.uploadPoster('https://cdn.discordapp.com/attachments/441961647586672640/874690053081821265/Untitled-1.png', 'cuman');
  }

  findAll() {
    return `This action returns all media`;
  }

  findOne(id: number) {
    return `This action returns a #${id} media`;
  }

  update(id: number, updateMediaDto: UpdateMediaDto) {
    return `This action updates a #${id} media`;
  }

  remove(id: number) {
    return `This action removes a #${id} media`;
  }
}
