import { forwardRef, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, PipelineStage } from 'mongoose';
import { plainToClassFromExist, plainToInstance } from 'class-transformer';

import { MediaFile, Playlist, PlaylistDocument, PlaylistItem } from '../../schemas';
import { HeadersDto } from '../../common/dto';
import { CursorPaginated } from '../../common/entities';
import { AzureBlobService } from '../../common/modules/azure-blob/azure-blob.service';
import {
  AddPlaylistItemDto, CreatePlaylistDto, FindAddToPlaylistDto, CursorPagePlaylistItemsDto, UpdatePlaylistDto,
  UpdatePlaylistItemDto, CursorPagePlaylistsDto, DeletePlaylistItemDto, AddAllPlaylistItemsDto
} from './dto';
import { CursorPagePlaylistItems, Playlist as PlaylistEntity, PlaylistDetails, PlaylistItem as PlaylistItemEntity } from './entities';
import { MediaService } from '../media/media.service';
import { AuthUserDto } from '../users';
import { AzureStorageContainer, MediaFileType, MediaPStatus, MediaVisibility, MongooseConnection, StatusCode } from '../../enums';
import { LookupOptions, convertToLanguage, convertToLanguageArray, createSnowFlakeId, MongooseCursorPagination, escapeRegExp, trimSlugFilename } from '../../utils';

@Injectable()
export class PlaylistsService {
  constructor(@InjectModel(Playlist.name, MongooseConnection.DATABASE_A) private playlistModel: Model<PlaylistDocument>,
    @Inject(forwardRef(() => MediaService)) private mediaService: MediaService, private azureBlobService: AzureBlobService) { }

  async create(createPlaylistDto: CreatePlaylistDto, authUser: AuthUserDto) {
    const playlist = new this.playlistModel();
    playlist._id = await createSnowFlakeId();
    playlist.name = createPlaylistDto.name;
    playlist.description = createPlaylistDto.description;
    playlist.author = <any>authUser._id;
    playlist.visibility = createPlaylistDto.visibility;
    if (createPlaylistDto.mediaId) {
      await this.findAndValidateMedia(createPlaylistDto.mediaId);
      const playlistItem = new PlaylistItem();
      playlistItem._id = await createSnowFlakeId();
      playlistItem.media = <any>createPlaylistDto.mediaId;
      playlistItem.position = 1;
      playlist.items.push(playlistItem);
      playlist.itemCount = playlist.items.length;
    }
    await playlist.save();
    return plainToInstance(PlaylistEntity, playlist.toObject());
  }

  async findAll(cursorPagePlaylistDto: CursorPagePlaylistsDto, authUser: AuthUserDto) {
    const sortEnum = ['_id', 'createdAt', 'updatedAt'];
    const typeMap = new Map<string, any>([['_id', String], ['createdAt', Date], ['updatedAt', Date]]);
    const fields: { [key: string]: any } = {
      _id: 1, name: 1, thumbnail: 1, thumbnailMedia: { $first: '$items.media' }, itemCount: 1, visibility: 1,
      createdAt: 1, updatedAt: 1
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
    const aggregation = new MongooseCursorPagination({ pageToken, limit, fields, sortQuery: sort, sortEnum, typeMap, filters });
    const lookupOptions: LookupOptions[] = [{
      from: 'media', localField: 'thumbnailMedia', foreignField: '_id', as: 'thumbnailMedia', isArray: false, postProjection: true,
      pipeline: [{ $project: { _id: 1, poster: 1, backdrop: 1 } }]
    }];
    const pipeline = aggregation.buildLookup(lookupOptions);
    const [data] = await this.playlistModel.aggregate(pipeline).exec();
    let playlists = new CursorPaginated<PlaylistEntity>();
    if (data)
      playlists = plainToClassFromExist(new CursorPaginated<PlaylistEntity>({ type: PlaylistEntity }), {
        totalResults: data.totalResults,
        results: data.results,
        hasNextPage: data.hasNextPage,
        nextPageToken: data.nextPageToken,
        prevPageToken: data.prevPageToken
      });
    return playlists;
  }

  async findOne(id: bigint, authUser: AuthUserDto) {
    const playlist = await this.playlistModel.findOne({ _id: id }, {
      _id: 1, name: 1, description: 1, thumbnail: 1, thumbnailMedia: { $first: '$items.media' }, itemCount: 1, visibility: 1, author: 1,
      createdAt: 1, updatedAt: 1
    }).populate([
      { path: 'thumbnailMedia', select: { _id: 1, poster: 1, backdrop: 1 }, model: 'Media', strictPopulate: false },
      { path: 'author', select: { _id: 1, username: 1, nickname: 1, avatar: 1 } }
    ]).lean().exec();
    if (!playlist)
      throw new HttpException({ code: StatusCode.PLAYLIST_NOT_FOUND, message: 'Playlist not found' }, HttpStatus.NOT_FOUND);
    else if (playlist.visibility === MediaVisibility.PRIVATE && playlist.author._id !== authUser._id && !authUser.hasPermission)
      throw new HttpException({ code: StatusCode.PLAYLIST_PRIVATE, message: 'This playlist is private' }, HttpStatus.FORBIDDEN);
    return plainToInstance(PlaylistDetails, playlist);
  }

  async update(id: bigint, updatePlaylistDto: UpdatePlaylistDto, authUser: AuthUserDto) {
    const playlist = await this.playlistModel.findOne({ _id: id }, {
      _id: 1, name: 1, description: 1, thumbnail: 1, thumbnailMedia: { $first: '$items.media' }, itemCount: 1, visibility: 1, author: 1,
      createdAt: 1, updatedAt: 1
    }).populate([
      { path: 'author', select: { _id: 1, username: 1, nickname: 1, avatar: 1 } },
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

  async remove(id: bigint, authUser: AuthUserDto) {
    const filters: { [key: string]: any } = { _id: id };
    if (!authUser.hasPermission)
      filters.author = authUser._id;
    const session = await this.playlistModel.startSession();
    await session.withTransaction(async () => {
      const playlist = await this.playlistModel.findOneAndDelete(filters, { session }).lean();
      if (!playlist)
        throw new HttpException({ code: StatusCode.PLAYLIST_NOT_FOUND, message: 'Playlist not found' }, HttpStatus.NOT_FOUND);
      if (playlist.thumbnail) {
        await this.deletePlaylistImage(playlist.thumbnail, AzureStorageContainer.PLAYLIST_THUMBNAILS);
      }
    }).finally(() => session.endSession().catch(() => { }));
  }

  async uploadThumbnail(id: bigint, file: Storage.MultipartFile, authUser: AuthUserDto) {
    const playlist = await this.playlistModel.findOne({ _id: id }, { author: 1, thumbnail: 1 }).exec();
    if (!playlist)
      throw new HttpException({ code: StatusCode.COLLECTION_NOT_FOUND, message: 'Playlist not found' }, HttpStatus.NOT_FOUND);
    else if (<bigint><unknown>playlist.author !== authUser._id)
      throw new HttpException({ code: StatusCode.PLAYLIST_UPDATE_FORBIDDEN, message: 'You do not have permission to update this playlist' }, HttpStatus.FORBIDDEN);
    const thumbnailId = await createSnowFlakeId();
    const trimmedFilename = trimSlugFilename(file.filename);
    const saveFile = `${thumbnailId}/${trimmedFilename}`;
    const image = await this.azureBlobService.upload(AzureStorageContainer.PLAYLIST_THUMBNAILS, saveFile, file.filepath, file.detectedMimetype);
    if (playlist.thumbnail)
      await this.deletePlaylistImage(playlist.thumbnail, AzureStorageContainer.PLAYLIST_THUMBNAILS);
    const thumbnail = new MediaFile();
    thumbnail._id = thumbnailId;
    thumbnail.type = MediaFileType.PLAYLIST_THUMBNAIL;
    thumbnail.name = trimmedFilename;
    thumbnail.color = file.color;
    thumbnail.placeholder = file.thumbhash;
    thumbnail.size = image.contentLength;
    thumbnail.mimeType = file.detectedMimetype;
    playlist.thumbnail = thumbnail;
    try {
      await playlist.save();
    } catch (e) {
      await this.azureBlobService.delete(AzureStorageContainer.PLAYLIST_THUMBNAILS, saveFile);
      throw e;
    }
    playlist.author = undefined;
    return plainToInstance(PlaylistDetails, playlist.toObject());
  }

  async deleteThumbnail(id: bigint, authUser: AuthUserDto) {
    const playlist = await this.playlistModel.findOne({ _id: id }, { author: 1, thumbnail: 1 }).exec();
    if (!playlist)
      throw new HttpException({ code: StatusCode.PLAYLIST_NOT_FOUND, message: 'Playlist not found' }, HttpStatus.NOT_FOUND);
    else if (<bigint><unknown>playlist.author !== authUser._id && !authUser.hasPermission)
      throw new HttpException({ code: StatusCode.PLAYLIST_UPDATE_FORBIDDEN, message: 'You do not have permission to update this playlist' }, HttpStatus.FORBIDDEN);
    if (!playlist.thumbnail) return;
    await this.deletePlaylistImage(playlist.thumbnail, AzureStorageContainer.PLAYLIST_THUMBNAILS);
    playlist.thumbnail = undefined;
    await playlist.save();
  }

  async addItem(id: bigint, addPlaylistMediaDto: AddPlaylistItemDto, headers: HeadersDto, authUser: AuthUserDto) {
    const playlist = await this.playlistModel.findOne({ _id: id }).sort({ 'items.position': 1 }).exec();
    if (!playlist)
      throw new HttpException({ code: StatusCode.PLAYLIST_NOT_FOUND, message: 'Playlist not found' }, HttpStatus.NOT_FOUND);
    else if (playlist.author._id !== authUser._id && !authUser.hasPermission)
      throw new HttpException({ code: StatusCode.PLAYLIST_UPDATE_FORBIDDEN, message: 'You do not have permission to update this playlist' }, HttpStatus.FORBIDDEN);
    const media = await this.findAndValidateMedia(addPlaylistMediaDto.mediaId);
    const newItemPosition = playlist.items.length === 0 ? 1 : playlist.items[playlist.items.length - 1].position + 1;
    const playlistItem = new PlaylistItem();
    playlistItem._id = await createSnowFlakeId();
    playlistItem.media = <any>addPlaylistMediaDto.mediaId;
    playlistItem.position = newItemPosition;
    playlist.items.push(playlistItem);
    playlist.itemCount = playlist.items.length;
    //if (!playlist.thumbnailMedia)
    //  playlist.thumbnailMedia = <any>addPlaylistMediaDto.mediaId;
    await playlist.save();
    const translatedMedia = convertToLanguage<any>(headers.acceptLanguage, media);
    translatedMedia.pStatus = undefined;
    playlistItem.media = translatedMedia;
    return plainToInstance(PlaylistItemEntity, playlistItem);
  }

  async addAllItems(id: bigint, addAllPlaylistItemsDto: AddAllPlaylistItemsDto, authUser: AuthUserDto) {
    const playlist = await this.playlistModel.findOne({ _id: id }).sort({ 'items.position': 1 }).lean().exec();
    if (!playlist)
      throw new HttpException({ code: StatusCode.PLAYLIST_NOT_FOUND, message: 'Playlist not found' }, HttpStatus.NOT_FOUND);
    else if (playlist.author._id !== authUser._id && !authUser.hasPermission)
      throw new HttpException({ code: StatusCode.PLAYLIST_UPDATE_FORBIDDEN, message: 'You do not have permission to update this playlist' }, HttpStatus.FORBIDDEN);
    const playlistFrom = await this.playlistModel.findOne({ _id: addAllPlaylistItemsDto.playlistId }).lean().exec();
    if (!playlistFrom)
      throw new HttpException({ code: StatusCode.PLAYLIST_NOT_FOUND, message: 'Playlist not found' }, HttpStatus.NOT_FOUND);
    this.scheduleAddAllItems(playlist, playlistFrom.items, addAllPlaylistItemsDto.skipAlreadyAdded);
  }

  async scheduleAddAllItems(playlist: Playlist, items: PlaylistItem[], skipAlreadyAdded: boolean) {
    // Process chunk of items
    const chunkSize = 50;
    for (let i = 0; i < items.length; i += chunkSize) {
      const itemChunk = items.slice(i, i + chunkSize);
      for (let j = 0; j < itemChunk.length; j++) {
        if (skipAlreadyAdded) {
          if (playlist.items.find(i => i.media === itemChunk[j].media))
            continue;
        }
        const newItemPosition = playlist.items.length === 0 ? 1 : playlist.items[playlist.items.length - 1].position + 1;
        const playlistItem = new PlaylistItem();
        playlistItem._id = await createSnowFlakeId();
        playlistItem.media = itemChunk[i].media;
        playlistItem.position = newItemPosition;
        playlistItem.addedAt = new Date();
        playlist.items.push(playlistItem);
      }
      // Delay 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    playlist.itemCount = playlist.items.length;
    try {
      await this.playlistModel.updateOne({ _id: playlist._id }, { $set: { items: playlist.items, itemCount: playlist.itemCount } })
        .exec();
    } catch (e) {
      console.error(e);
    }
  }

  findAddToPlaylist(findAddToPlaylistDto: FindAddToPlaylistDto, authUser: AuthUserDto) {
    const filters: PipelineStage.Match['$match'] = { author: authUser._id };
    findAddToPlaylistDto.search && (filters.name = { $regex: escapeRegExp(findAddToPlaylistDto.search), $options: 'i' });
    const project: PipelineStage.Project['$project'] = { _id: 1, name: 1, itemCount: 1, visibility: 1, createdAt: 1 };
    findAddToPlaylistDto.mediaId && (project.hasMedia = { $in: [findAddToPlaylistDto.mediaId, '$items.media'] });
    return this.playlistModel.aggregate([
      { $match: filters },
      { $sort: { updatedAt: -1 } },
      { $limit: 10 },
      { $project: project }
    ]).exec();
  }

  async findAllItems(id: bigint, findPlaylistItemsDto: CursorPagePlaylistItemsDto, headers: HeadersDto, authUser: AuthUserDto) {
    const sortEnum = ['_id', 'position'];
    const typeMap = new Map<string, any>([['_id', String], ['position', Number]]);
    const fields: { [key: string]: any } = {
      _id: 1, type: 1, title: 1, originalTitle: 1, overview: 1, runtime: 1, 'movie.status': 1, 'tv.pEpisodeCount': 1,
      poster: 1, backdrop: 1, originalLang: 1, adult: 1, releaseDate: 1, views: 1, visibility: 1, _translations: 1,
      createdAt: 1, updatedAt: 1
    };
    const { pageToken, limit, sort } = findPlaylistItemsDto;
    const filters: { [key: string]: any } = { _id: id };
    const aggregation = new MongooseCursorPagination({ pageToken, limit, sortQuery: sort, sortEnum, filters, typeMap });
    const secondListName = 'mediaList';
    const mediaMatch = authUser.hasPermission ? { $eq: ['$pStatus', MediaPStatus.DONE] } :
      { $and: [{ $ne: ['$visibility', MediaVisibility.PRIVATE] }, { $eq: ['$pStatus', MediaPStatus.DONE] }] };
    const lookupOptions: LookupOptions[] = [{
      from: 'media', localField: 'items.media', foreignField: '_id', as: secondListName, isArray: true,
      pipeline: [{ $match: { $expr: mediaMatch } }, { $project: fields }]
    }];
    const pipeline = aggregation.buildLookupOnlyObject(lookupOptions, { parent: 'items', secondListName });
    const [data] = await this.playlistModel.aggregate(pipeline).exec();
    let playlists = new CursorPagePlaylistItems();
    if (data) {
      const translatedMediaList = convertToLanguageArray<PlaylistItemEntity>(headers.acceptLanguage, data.mediaList);
      playlists = plainToClassFromExist(new CursorPagePlaylistItems(), {
        totalResults: data.totalResults,
        results: data.results,
        mediaList: translatedMediaList,
        hasNextPage: data.hasNextPage,
        nextPageToken: data.nextPageToken,
        prevPageToken: data.prevPageToken
      });
    }
    return playlists;
  }

  async updateItem(id: bigint, itemId: bigint, updatePlaylistItemDto: UpdatePlaylistItemDto, authUser: AuthUserDto) {

  }

  async removeItem(id: bigint, deletePlaylistItemDto: DeletePlaylistItemDto, authUser: AuthUserDto) {
    const playlist = await this.playlistModel.findOne({ _id: id }).exec();
    if (!playlist)
      throw new HttpException({ code: StatusCode.PLAYLIST_NOT_FOUND, message: 'Playlist not found' }, HttpStatus.NOT_FOUND);
    else if (playlist.author._id !== authUser._id && !authUser.hasPermission)
      throw new HttpException({ code: StatusCode.PLAYLIST_UPDATE_FORBIDDEN, message: 'You do not have permission to update this playlist' }, HttpStatus.FORBIDDEN);
    if (deletePlaylistItemDto.itemId)
      playlist.items.pull({ _id: deletePlaylistItemDto.itemId });
    if (deletePlaylistItemDto.mediaId)
      playlist.items.pull({ media: deletePlaylistItemDto.mediaId });
    playlist.itemCount = playlist.items.length;
    await playlist.save();
  }

  deleteMediaPlaylistItem(media: string, session?: ClientSession) {
    return this.playlistModel.updateMany({ 'items.media': media }, { $pull: { items: { media } } }, { session });
  }

  private async findAndValidateMedia(mediaId: bigint) {
    const media = await this.mediaService.findOneForPlaylist(mediaId);
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    if (media.pStatus !== MediaPStatus.DONE)
      throw new HttpException({ code: StatusCode.PLAYLIST_ITEM_UPDATE_INVALID, message: 'Cannot add this media to playlist' }, HttpStatus.BAD_REQUEST);
    return media;
  }

  private async deletePlaylistImage(image: MediaFile, container: string) {
    if (!image) return;
    await this.azureBlobService.delete(container, `${image._id}/${image.name}`);
  }
}
