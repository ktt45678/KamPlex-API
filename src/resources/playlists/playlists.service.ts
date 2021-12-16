import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { plainToClassFromExist } from 'class-transformer';

import { Playlist, PlaylistDocument } from '../../schemas/playlist.schema';
import { MediaService } from '../media/media.service';
import { AuthUserDto } from '../users/dto/auth-user.dto';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { PaginatePlaylistDto } from './dto/paginate-playlist.dto';
import { Playlist as PlaylistEntity } from './entities/playlist.entity';
import { Paginated } from '../roles/entities/paginated.entity';
import { StatusCode } from '../../enums/status-code.enum';
import { LookupOptions, MongooseAggregation } from '../../utils/mongo-aggregation.util';
import { convertToLanguageArray } from '../../utils/i18n-transform.util';

@Injectable()
export class PlaylistsService {
  constructor(@InjectModel(Playlist.name) private playlistModel: Model<PlaylistDocument>, private mediaService: MediaService) { }

  async create(createPlaylistDto: CreatePlaylistDto, authUser: AuthUserDto) {
    const { media } = createPlaylistDto;
    const checkMedia = await this.mediaService.findAvailableMedia(media).exec();
    if (!checkMedia)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    const playlistItem = await this.playlistModel.findOneAndUpdate({ author: <any>authUser._id, media: <any>media }, {}, {
      new: true, upsert: true
    }).lean().exec();
    return playlistItem;
  }

  async findAll(paginatePlaylistDto: PaginatePlaylistDto, acceptLanguage: string, authUser: AuthUserDto) {
    const { page, limit } = paginatePlaylistDto;
    const filters = { author: authUser._id };
    const fields = { _id: 1, media: 1, createdAt: 1, updatedAt: 1 };
    const sort = { createdAt: -1 };
    const aggregation = new MongooseAggregation({ page, limit, filters, fields, sort });
    const lookups: LookupOptions[] = [{
      from: 'media', localField: 'media', foreignField: '_id', as: 'media',
      project: {
        _id: 1, type: 1, title: 1, originalTitle: 1, slug: 1, overview: 1, poster: 1, backdrop: 1, genres: 1, originalLanguage: 1,
        adult: 1, releaseDate: 1, views: 1, ratingCount: 1, ratingAverage: 1, _translations: 1, createdAt: 1, updatedAt: 1
      },
      isArray: false,
      children: [{
        from: 'genres', localField: 'genres', foreignField: '_id', as: 'genres', isArray: true,
        project: { _id: 1, name: 1, _translations: 1 }
      }, {
        from: 'mediastorages', localField: 'poster', foreignField: '_id', as: 'poster', isArray: false
      }, {
        from: 'mediastorages', localField: 'backdrop', foreignField: '_id', as: 'backdrop', isArray: false
      }]
    }];
    const [data] = await this.playlistModel.aggregate(aggregation.buildLookup(lookups)).exec();
    let playlist = new Paginated<PlaylistEntity>();
    if (data) {
      const translatedResults = convertToLanguageArray<PlaylistEntity>(acceptLanguage, data.results, {
        populate: ['media', 'media.genres'],
        ignoreRoot: true
      });
      playlist = plainToClassFromExist(new Paginated<PlaylistEntity>({ type: PlaylistEntity }), {
        page: data.page,
        totalPages: data.totalPages,
        totalResults: data.totalResults,
        results: translatedResults
      });
    }
    return playlist;
  }

  findOnePlaylistMedia(mediaId: string, authUser: AuthUserDto) {
    if (authUser.isAnonymous)
      return;
    return this.playlistModel.findOne({ author: <any>authUser._id, media: <any>mediaId }).lean().exec();
  }

  async removePlaylistMedia(mediaId: string, authUser: AuthUserDto) {
    const deletedItem = await this.playlistModel.findOneAndDelete({ author: <any>authUser._id, media: <any>mediaId }).lean().exec();
    if (!deletedItem)
      throw new HttpException({ code: StatusCode.PLAYLIST_ITEM_NOT_FOUND, message: 'Playlist item not found' }, HttpStatus.NOT_FOUND);
  }
}
