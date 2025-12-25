import { Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { Types } from 'mongoose';
import { Auth } from 'src/decorators/auth.decorator';
import { CurrentUser } from 'src/decorators/currentUser.decorator';
import { ParseObjectIdPipe } from 'src/pipes/parse-objectid.pipe';
import { RelationshipsService } from './relationships.service';

@Controller('relationships')
export class RelationshipsController {
  constructor(private readonly relationshipsService: RelationshipsService) {}

  // Отправить заявку в друзья (создаёт/возобновляет PENDING requester -> target)
  @Post('request/:targetUserId')
  @Auth()
  sendFriendRequest(
    @CurrentUser('_id') currentUserId: Types.ObjectId,
    @Param('targetUserId', ParseObjectIdPipe) targetUserId: Types.ObjectId,
  ) {
    return this.relationshipsService.sendFriendRequest(currentUserId, targetUserId);
  }

  // Принять входящую заявку в друзья (PENDING -> ACCEPTED + зеркальная связь)
  @Post('accept/:requesterUserId')
  @Auth()
  acceptFriendRequest(
    @CurrentUser('_id') currentUserId: Types.ObjectId,
    @Param('requesterUserId', ParseObjectIdPipe) requesterUserId: Types.ObjectId,
  ) {
    return this.relationshipsService.acceptFriendRequest(currentUserId, requesterUserId);
  }

  // Отклонить входящую заявку в друзья (PENDING -> DECLINED)
  @Post('decline/:requesterUserId')
  @Auth()
  declineFriendRequest(
    @CurrentUser('_id') currentUserId: Types.ObjectId,
    @Param('requesterUserId', ParseObjectIdPipe) requesterUserId: Types.ObjectId,
  ) {
    return this.relationshipsService.declineFriendRequest(currentUserId, requesterUserId);
  }

  // Удалить пользователя из друзей (удаляет ACCEPTED связи в обе стороны)
  @Delete('friends/:friendUserId')
  @Auth()
  removeFriend(
    @CurrentUser('_id') currentUserId: Types.ObjectId,
    @Param('friendUserId', ParseObjectIdPipe) friendUserId: Types.ObjectId,
  ) {
    return this.relationshipsService.removeFriend(currentUserId, friendUserId);
  }

  // Получить список друзей (ACCEPTED, порционно)
  @Get('friends')
  @Auth()
  getFriends(
    @CurrentUser('_id') currentUserId: Types.ObjectId,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.relationshipsService.getFriends(currentUserId, {
      limit: limit ? Number(limit) : undefined,
      cursor: cursor && Types.ObjectId.isValid(cursor) ? new Types.ObjectId(cursor) : undefined,
    });
  }

  // Получить список подписчиков / входящих заявок (PENDING target=user, порционно)
  @Get('followers')
  @Auth()
  getFollowers(
    @CurrentUser('_id') currentUserId: Types.ObjectId,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.relationshipsService.getFollowers(currentUserId, {
      limit: limit ? Number(limit) : undefined,
      cursor: cursor && Types.ObjectId.isValid(cursor) ? new Types.ObjectId(cursor) : undefined,
    });
  }

  // Получить список подписок / исходящих заявок (PENDING requester=user, порционно)
  @Get('following')
  @Auth()
  getFollowing(
    @CurrentUser('_id') currentUserId: Types.ObjectId,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.relationshipsService.getFollowing(currentUserId, {
      limit: limit ? Number(limit) : undefined,
      cursor: cursor && Types.ObjectId.isValid(cursor) ? new Types.ObjectId(cursor) : undefined,
    });
  }
}


