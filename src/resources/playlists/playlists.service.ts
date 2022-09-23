import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage } from 'mongoose';
import { plainToClassFromExist, plainToInstance } from 'class-transformer';

import { Playlist, PlaylistDocument, PlaylistItem } from '../../schemas';
import { AddPlaylistItemDto, CreatePlaylistDto, FindAddToPlaylistDto, FindPlaylistItemsDto, PaginatePlaylistDto, UpdatePlaylistDto, UpdatePlaylistItemDto } from './dto';
import { Playlist as PlaylistEntity, PlaylistDetails, PlaylistItem as PlaylistItemEntity } from './entities';
import { MediaService } from '../media/media.service';
import { AuthUserDto } from '../users';
import { Paginated } from '../roles';
import { MediaPStatus, MediaVisibility, MongooseConnection, StatusCode } from '../../enums';
import { LookupOptions, MongooseAggregation, convertToLanguage, convertToLanguageArray, createSnowFlakeId, convertToMongooseSort } from '../../utils';

@Injectable()
export class PlaylistsService {
  constructor(@InjectModel(Playlist.name, MongooseConnection.DATABASE_A) private playlistModel: Model<PlaylistDocument>,
    private mediaService: MediaService) { }

  async create(createPlaylistDto: CreatePlaylistDto, authUser: AuthUserDto) {
    const playlist = new this.playlistModel();
    playlist._id = await createSnowFlakeId();
    playlist.name = createPlaylistDto.name;
    playlist.description = createPlaylistDto.description;
    playlist.author = <any>authUser._id;
    playlist.visibility = createPlaylistDto.visibility;
    await playlist.save();
    return plainToInstance(PlaylistEntity, playlist.toObject());
  }

  async findAll(paginatePlaylistDto: PaginatePlaylistDto, authUser: AuthUserDto) {
    const sortEnum = ['_id', 'name', 'createdAt'];
    const fields: { [key: string]: number } = {
      _id: 1, name: 1, description: 1, thumbnailMedia: 1, itemCount: 1, visibility: 1, createdAt: 1, updatedAt: 1
    };
    const { page, limit, sort } = paginatePlaylistDto;
    const filters: { [key: string]: any } = {};
    if (authUser.isAnonymous && !paginatePlaylistDto.author) {
      throw new HttpException({ code: StatusCode.PLAYLIST_AUTHOR_NOT_FOUND, message: 'Author not found' }, HttpStatus.NOT_FOUND);
    }
    if (paginatePlaylistDto.author && paginatePlaylistDto.author !== authUser._id) {
      filters.visibility = MediaVisibility.PUBLIC;
      filters.author = paginatePlaylistDto.author;
    } else {
      filters.author = authUser._id;
    }
    const aggregation = new MongooseAggregation({ page, limit, fields, sortQuery: sort, sortEnum, filters });
    const lookups: LookupOptions[] = [{
      from: 'media', localField: 'thumbnailMedia', foreignField: '_id', as: 'thumbnailMedia', isArray: false,
      project: { _id: 1, poster: 1, backdrop: 1 }
    }];
    const pipeline = aggregation.buildLookup(lookups);
    const [data] = await this.playlistModel.aggregate(pipeline).exec();
    let playlists = new Paginated<PlaylistEntity>();
    if (data)
      playlists = plainToClassFromExist(new Paginated<PlaylistEntity>({ type: PlaylistEntity }), data);
    return playlists;
  }

  async findOne(id: string, authUser: AuthUserDto, acceptLanguage: string) {
    const playlist = await this.playlistModel.findById(id, {
      _id: 1, name: 1, description: 1, thumbnailMedia: 1, itemCount: 1, visibility: 1, author: 1, createdAt: 1, updatedAt: 1
    }).populate([
      { path: 'thumbnailMedia', select: { _id: 1, poster: 1, backdrop: 1 } },
      { path: 'author', select: { _id: 1, username: 1, displayName: 1, avatar: 1 } }
    ]).lean().exec();
    if (!playlist)
      throw new HttpException({ code: StatusCode.PLAYLIST_NOT_FOUND, message: 'Playlist not found' }, HttpStatus.NOT_FOUND);
    else if (playlist.visibility === MediaVisibility.PRIVATE && playlist.author._id !== authUser._id && !authUser.hasPermission)
      throw new HttpException({ code: StatusCode.PLAYLIST_PRIVATE, message: 'This playlist is private' }, HttpStatus.FORBIDDEN);
    return plainToInstance(PlaylistDetails, playlist);
  }

  async update(id: string, updatePlaylistDto: UpdatePlaylistDto, authUser: AuthUserDto) {
    const playlist = await this.playlistModel.findById(id, {
      _id: 1, name: 1, description: 1, thumbnailMedia: 1, itemCount: 1, visibility: 1, author: 1, createdAt: 1, updatedAt: 1
    }).populate({ path: 'author', select: { _id: 1, username: 1, displayName: 1, avatar: 1 } }).exec();
    if (!playlist)
      throw new HttpException({ code: StatusCode.PLAYLIST_NOT_FOUND, message: 'Playlist not found' }, HttpStatus.NOT_FOUND);
    else if (playlist.author._id !== authUser._id && !authUser.hasPermission)
      throw new HttpException({ code: StatusCode.PLAYLIST_UPDATE_FORBIDDEN, message: 'You do not have permission to update this playlist' }, HttpStatus.FORBIDDEN);
    if (updatePlaylistDto.name != undefined)
      playlist.name = updatePlaylistDto.name;
    if (updatePlaylistDto.description !== undefined)
      playlist.description = updatePlaylistDto.description;
    if (updatePlaylistDto.visibility != undefined)
      playlist.visibility = updatePlaylistDto.visibility;
    if (updatePlaylistDto.thumbnailMedia != undefined)
      playlist.thumbnailMedia = <any>updatePlaylistDto.thumbnailMedia;
    await playlist.save();
    await playlist.populate({ path: 'thumbnailMedia', select: { _id: 1, poster: 1, backdrop: 1 } });
    return plainToInstance(PlaylistDetails, playlist.toObject());
  }

  async remove(id: string, authUser: AuthUserDto) {
    const filters: { [key: string]: any } = { _id: id };
    if (!authUser.hasPermission)
      filters.author = authUser._id;
    const playlist = await this.playlistModel.findOneAndDelete(filters).lean().exec();
    if (!playlist)
      throw new HttpException({ code: StatusCode.PLAYLIST_NOT_FOUND, message: 'Playlist not found' }, HttpStatus.NOT_FOUND);
  }

  async addItem(id: string, addPlaylistMediaDto: AddPlaylistItemDto, acceptLanguage: string, authUser: AuthUserDto) {
    const playlist = await this.playlistModel.findById(id).sort({ 'items.position': 1 }).exec();
    if (!playlist)
      throw new HttpException({ code: StatusCode.PLAYLIST_NOT_FOUND, message: 'Playlist not found' }, HttpStatus.NOT_FOUND);
    else if (playlist.author._id !== authUser._id && !authUser.hasPermission)
      throw new HttpException({ code: StatusCode.PLAYLIST_UPDATE_FORBIDDEN, message: 'You do not have permission to update this playlist' }, HttpStatus.FORBIDDEN);
    const media = await this.mediaService.findOneForPlaylist(addPlaylistMediaDto.mediaId);
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    const newItemPosition = playlist.items.length === 0 ? 1 : playlist.items[playlist.items.length - 1].position + 1;
    const playlistItem = new PlaylistItem();
    playlistItem._id = await createSnowFlakeId();
    playlistItem.media = <any>addPlaylistMediaDto.mediaId;
    playlistItem.position = newItemPosition;
    playlist.items.push({ ...playlistItem });
    playlist.itemCount = playlist.items.length;
    if (!playlist.thumbnailMedia)
      playlist.thumbnailMedia = <any>addPlaylistMediaDto.mediaId;
    await playlist.save();
    const translatedMedia = convertToLanguage<any>(acceptLanguage, media);
    playlistItem.media = translatedMedia;
    return plainToInstance(PlaylistItemEntity, playlistItem);
  }

  async findAddToPlaylist(findAddToPlaylistDto: FindAddToPlaylistDto, authUser: AuthUserDto) {
    return this.playlistModel.aggregate([
      { $match: { author: authUser._id } },
      {
        $project: {
          _id: 1, name: 1, itemCount: 1, visibility: 1, createdAt: 1,
          hasMedia: { $in: [findAddToPlaylistDto.mediaId, '$items.media'] }
        }
      }
    ]).exec();
  }

  async findAllItems(id: string, findPlaylistItemsDto: FindPlaylistItemsDto, authUser: AuthUserDto) {
    // Calculate sort
    const sortEnum = ['_id', 'position'];
    let sortTarget = null;
    let sortDirection = null;
    let sort = null;
    const sortObject = convertToMongooseSort(findPlaylistItemsDto.sort, sortEnum, 'items');
    if (sortObject) {
      const firstSortKey = Object.keys(sortObject)[0];
      if (firstSortKey) {
        sortTarget = firstSortKey;
        sortDirection = sortObject[firstSortKey];
        sort = { [sortTarget]: sortDirection };
      }
    }
    // Calculate page
    let pagingQuery = null;
    const typeCtr = sortTarget === 'items._id' ? String : Number;
    if (findPlaylistItemsDto.nextPageToken) {
      pagingQuery = this.getPageQuery(findPlaylistItemsDto.nextPageToken, 1, sortDirection, typeCtr);
    } else if (findPlaylistItemsDto.prevPageToken) {
      pagingQuery = this.getPageQuery(findPlaylistItemsDto.prevPageToken, -1, sortDirection, typeCtr);
    }
    // Create pipeline
    const pipeline: PipelineStage[] = [
      { $match: { _id: id } },
      { $unwind: '$items' },
      { $sort: sort }
    ];
    if (pagingQuery) {
      pipeline.push({ $match: { [sortTarget]: pagingQuery } });
    }
    pipeline.push({ $limit: findPlaylistItemsDto.limit },
      { $group: { _id: '$_id', itemCount: { $first: '$itemCount' }, author: { $first: '$author' }, items: { $push: '$items' } } },
      {
        $lookup: {
          from: 'media',
          as: 'mediaList',
          let: { 'mediaIds': '$items.media', 'author': '$author' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ['$_id', '$$mediaIds'] },
                    {
                      $cond: {
                        if: { $ne: ['$$author', authUser._id] },
                        then: { $and: [{ $ne: ['$visibility', MediaVisibility.PRIVATE] }, { $eq: ['$pStatus', MediaPStatus.DONE] }] },
                        else: { $eq: ['$pStatus', MediaPStatus.DONE] }
                      }
                    }
                  ]
                }
              }
            },
            {
              $project: {
                _id: 1, type: 1, title: 1, originalTitle: 1, overview: 1, runtime: 1, 'movie.status': 1, 'tv.publicEpisodeCount': 1,
                poster: 1, backdrop: 1, originalLanguage: 1, adult: 1, releaseDate: 1, views: 1, visibility: 1, _translations: 1,
                createdAt: 1, updatedAt: 1
              }
            }
          ]
        }
      }, {
      $project: {
        _id: 0, itemCount: 1, items: 1, mediaList: 1,
        nextPageToken: { $last: '$' + sortTarget },
        prevPageToken: { $first: '$' + sortTarget }
      }
    });
    const [result] = await this.playlistModel.aggregate(pipeline).exec();
    return result;
  }

  async updateItem(id: string, itemId: string, updatePlaylistItemDto: UpdatePlaylistItemDto, authUser: AuthUserDto) {

  }

  async removeItem(id: string, itemId: string, authUser: AuthUserDto) {
    const playlist = await this.playlistModel.findById(id).exec();
    if (!playlist)
      throw new HttpException({ code: StatusCode.PLAYLIST_NOT_FOUND, message: 'Playlist not found' }, HttpStatus.NOT_FOUND);
    else if (playlist.author._id !== authUser._id && !authUser.hasPermission)
      throw new HttpException({ code: StatusCode.PLAYLIST_UPDATE_FORBIDDEN, message: 'You do not have permission to update this playlist' }, HttpStatus.FORBIDDEN);
    playlist.items.pull(itemId);
    playlist.itemCount = playlist.items.length;
    await playlist.save();
  }

  private getPageQuery(pageToken: string | number, navType: number, sortDirection: number, typeCtr: StringConstructor | NumberConstructor) {
    if (typeCtr === Number) {
      pageToken = typeCtr(pageToken);
    }
    if (navType === 1) { // Next page
      if (sortDirection === 1) { // Asc
        return { $gt: pageToken }
      } else { // Desc
        return { $lt: pageToken }
      }
    } else { // Previous page
      if (sortDirection === 1) { // Asc
        return { $lt: pageToken }
      } else { // Desc
        return { $gt: pageToken }
      }
    }
  }
}
