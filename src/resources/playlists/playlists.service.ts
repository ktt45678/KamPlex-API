import { forwardRef, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, PipelineStage } from 'mongoose';
import { plainToClassFromExist, plainToInstance } from 'class-transformer';

import { Playlist, PlaylistDocument, PlaylistItem } from '../../schemas';
import { CursorPaginated } from '../../common/entities';
import {
  AddPlaylistItemDto, CreatePlaylistDto, FindAddToPlaylistDto, CursorPagePlaylistItemsDto, UpdatePlaylistDto,
  UpdatePlaylistItemDto, CursorPaginatePlaylistDto
} from './dto';
import { CursorPagePlaylistItems, Playlist as PlaylistEntity, PlaylistDetails, PlaylistItem as PlaylistItemEntity } from './entities';
import { MediaService } from '../media/media.service';
import { AuthUserDto } from '../users';
import { MediaPStatus, MediaVisibility, MongooseConnection, StatusCode } from '../../enums';
import {
  LookupOptions, convertToLanguage, convertToLanguageArray, createSnowFlakeId,
  convertToMongooseSort, isEmptyObject, parsePageToken, tokenDataToPageToken, getPageQuery, MongooseCursorPagination
} from '../../utils';

@Injectable()
export class PlaylistsService {
  constructor(@InjectModel(Playlist.name, MongooseConnection.DATABASE_A) private playlistModel: Model<PlaylistDocument>,
    @Inject(forwardRef(() => MediaService)) private mediaService: MediaService) { }

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

  async findAll(cursorPagePlaylistDto: CursorPaginatePlaylistDto, authUser: AuthUserDto) {
    const sortEnum = ['_id', 'name'];
    const fields: { [key: string]: any } = {
      _id: 1, name: 1, description: 1, thumbnailMedia: { $first: '$items.media' }, itemCount: 1, visibility: 1, createdAt: 1,
      updatedAt: 1
    };
    const { pageToken, limit, sort } = cursorPagePlaylistDto;
    const filters: { [key: string]: any } = {};
    if (authUser.isAnonymous && !cursorPagePlaylistDto.author) {
      throw new HttpException({ code: StatusCode.PLAYLIST_AUTHOR_NOT_FOUND, message: 'Author not found' }, HttpStatus.NOT_FOUND);
    }
    if (cursorPagePlaylistDto.author && cursorPagePlaylistDto.author !== authUser._id) {
      filters.visibility = MediaVisibility.PUBLIC;
      filters.author = cursorPagePlaylistDto.author;
    } else {
      filters.author = authUser._id;
    }
    const aggregation = new MongooseCursorPagination({ pageToken, limit, fields, sortQuery: sort, sortEnum, filters });
    const lookups: LookupOptions[] = [{
      from: 'media', localField: 'thumbnailMedia', foreignField: '_id', as: 'thumbnailMedia', isArray: false,
      project: { _id: 1, poster: 1, backdrop: 1 }
    }];
    const pipeline = aggregation.buildLookup(lookups);
    const [data] = await this.playlistModel.aggregate(pipeline).exec();
    let playlists = new CursorPaginated<PlaylistEntity>();
    if (data)
      playlists = plainToClassFromExist(new CursorPaginated<PlaylistEntity>({ type: PlaylistEntity }), {
        results: data.results,
        nextPageToken: tokenDataToPageToken(data.nextPageToken),
        prevPageToken: tokenDataToPageToken(data.prevPageToken)
      });
    return playlists;
  }

  async findOne(id: string, authUser: AuthUserDto) {
    const playlist = await this.playlistModel.findById(id, {
      _id: 1, name: 1, description: 1, thumbnailMedia: { $first: '$items.media' }, itemCount: 1, visibility: 1, author: 1,
      createdAt: 1, updatedAt: 1
    }).populate([
      { path: 'thumbnailMedia', select: { _id: 1, poster: 1, backdrop: 1 }, model: 'Media', strictPopulate: false },
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
      _id: 1, name: 1, description: 1, thumbnailMedia: { $first: '$items.media' }, itemCount: 1, visibility: 1, author: 1,
      createdAt: 1, updatedAt: 1
    }).populate([
      { path: 'author', select: { _id: 1, username: 1, displayName: 1, avatar: 1 } },
      { path: 'thumbnailMedia', select: { _id: 1, poster: 1, backdrop: 1 }, model: 'Media', strictPopulate: false }
    ]).exec();
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
    //if (updatePlaylistDto.thumbnailMedia != undefined)
    //  playlist.thumbnailMedia = <any>updatePlaylistDto.thumbnailMedia;
    await playlist.save();
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
    if (media.pStatus !== MediaPStatus.DONE)
      throw new HttpException({ code: StatusCode.PLAYLIST_ITEM_UPDATE_INVALID, message: 'Cannot add this media to playlist' }, HttpStatus.BAD_REQUEST);
    const newItemPosition = playlist.items.length === 0 ? 1 : playlist.items[playlist.items.length - 1].position + 1;
    const playlistItem = new PlaylistItem();
    playlistItem._id = await createSnowFlakeId();
    playlistItem.media = <any>addPlaylistMediaDto.mediaId;
    playlistItem.position = newItemPosition;
    playlist.items.push({ ...playlistItem });
    playlist.itemCount = playlist.items.length;
    //if (!playlist.thumbnailMedia)
    //  playlist.thumbnailMedia = <any>addPlaylistMediaDto.mediaId;
    await playlist.save();
    const translatedMedia = convertToLanguage<any>(acceptLanguage, media);
    playlistItem.media = translatedMedia;
    return plainToInstance(PlaylistItemEntity, playlistItem);
  }

  async findAddToPlaylist(findAddToPlaylistDto: FindAddToPlaylistDto, authUser: AuthUserDto) {
    return this.playlistModel.aggregate([
      { $match: { author: authUser._id } },
      { $sort: { updatedAt: -1 } },
      { $limit: 1 },
      {
        $project: {
          _id: 1, name: 1, itemCount: 1, visibility: 1, createdAt: 1,
          hasMedia: { $in: [findAddToPlaylistDto.mediaId, '$items.media'] }
        }
      }
    ]).exec();
  }

  async findAllItems(id: string, findPlaylistItemsDto: CursorPagePlaylistItemsDto, acceptLanguage: string, authUser: AuthUserDto) {
    // Calculate sort
    const sortEnum = ['_id', 'position', 'addedAt'];
    let sortTarget = 'items._id';
    let sortDirection = -1;
    let sort = convertToMongooseSort(findPlaylistItemsDto.sort, sortEnum, 'items');
    if (!isEmptyObject(sort)) {
      const firstSortKey = Object.keys(sort)[0];
      sortTarget = firstSortKey;
      sortDirection = sort[firstSortKey];
    } else {
      sort = { [sortTarget]: sortDirection };
    }
    // Create pipeline
    const pipeline: PipelineStage[] = [
      { $match: { _id: id } },
      { $unwind: '$items' },
      { $sort: sort }
    ];
    // Calculate page
    if (findPlaylistItemsDto.pageToken) {
      const [navType, pageValue] = parsePageToken(findPlaylistItemsDto.pageToken);
      const pagingQuery = getPageQuery(pageValue, navType, sortDirection, sortTarget);
      pipeline.push({ $match: { $expr: pagingQuery } });
    }
    pipeline.push(
      { $limit: findPlaylistItemsDto.limit },
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
                        if: { $ne: [authUser.hasPermission, true] },
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
                _id: 1, type: 1, title: 1, originalTitle: 1, overview: 1, runtime: 1, 'movie.status': 1, 'tv.pEpisodeCount': 1,
                poster: 1, backdrop: 1, originalLanguage: 1, adult: 1, releaseDate: 1, views: 1, visibility: 1, _translations: 1,
                createdAt: 1, updatedAt: 1
              }
            }
          ]
        }
      }, {
      $project: {
        _id: 0, itemCount: 1, results: '$items', mediaList: 1,
        nextPageToken: [1, { $last: '$' + sortTarget }],
        prevPageToken: [-1, { $first: '$' + sortTarget }]
      }
    });
    const [data] = await this.playlistModel.aggregate(pipeline).exec();
    let historyList = new CursorPagePlaylistItems();
    if (data) {
      const translatedMediaList = convertToLanguageArray<PlaylistItemEntity>(acceptLanguage, data.mediaList);
      historyList = plainToClassFromExist(new CursorPagePlaylistItems(), {
        itemCount: data.itemCount,
        results: data.results,
        mediaList: translatedMediaList,
        nextPageToken: tokenDataToPageToken(data.nextPageToken),
        prevPageToken: tokenDataToPageToken(data.prevPageToken)
      });
    }
    return historyList;
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

  deleteMediaPlaylistItem(media: string, session?: ClientSession) {
    return this.playlistModel.updateMany({ 'items.media': media }, { $pull: { items: { media } } }, { session });
  }
}
