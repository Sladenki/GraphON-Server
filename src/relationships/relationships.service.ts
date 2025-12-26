import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserDocument, UserModel } from 'src/user/user.model';
import { NotificationsService } from 'src/notifications/notifications.service';
import { WebSocketGatewayService } from 'src/websocket/websocket-gateway.service';
import { RelationshipDocument, RelationshipModel } from './relationship.model';
import { RelationshipStatus } from './relationship-status.enum';

function isDuplicateKeyError(err: any): boolean {
  return !!err && (err.code === 11000 || err?.name === 'MongoServerError');
}

@Injectable()
export class RelationshipsService {
  constructor(
    @InjectModel(RelationshipModel.name)
    private readonly relationshipModel: Model<RelationshipDocument>,
    @InjectModel(UserModel.name)
    private readonly userModel: Model<UserDocument>,
    private readonly notificationsService: NotificationsService,
    private readonly wsGateway: WebSocketGatewayService,
  ) {}

  async sendFriendRequest(requesterId: Types.ObjectId, targetId: Types.ObjectId) {
    if (requesterId.equals(targetId)) {
      throw new BadRequestException('Cannot send friend request to yourself');
    }

    await this.assertUsersExist(requesterId, targetId);
    await this.assertNotBlocked(requesterId, targetId);

    // 1) Revive a previously declined request (idempotent under concurrency)
    const revived = await this.relationshipModel.findOneAndUpdate(
      { requesterId, targetId, status: RelationshipStatus.DECLINED },
      { $set: { status: RelationshipStatus.PENDING } },
      { new: false },
    );

    if (revived) {
      await this.applySendRequestCounters(requesterId, targetId);
      await this.notificationsService.createFriendRequestNotification({ userId: targetId, fromUserId: requesterId });
      
      // Send WebSocket event to target user
      this.wsGateway.sendToUser(targetId, {
        type: 'friend_request_sent',
        data: {
          fromUserId: requesterId.toString(),
          toUserId: targetId.toString(),
          timestamp: new Date().toISOString(),
        },
      });
      
      return { status: RelationshipStatus.PENDING, created: false, revived: true };
    }

    // 2) Create new request (duplicate-safe via unique index)
    try {
      await this.relationshipModel.create({
        requesterId,
        targetId,
        status: RelationshipStatus.PENDING,
      });

      await this.applySendRequestCounters(requesterId, targetId);
      await this.notificationsService.createFriendRequestNotification({ userId: targetId, fromUserId: requesterId });
      
      // Send WebSocket event to target user
      this.wsGateway.sendToUser(targetId, {
        type: 'friend_request_sent',
        data: {
          fromUserId: requesterId.toString(),
          toUserId: targetId.toString(),
          timestamp: new Date().toISOString(),
        },
      });
      
      return { status: RelationshipStatus.PENDING, created: true, revived: false };
    } catch (err) {
      if (!isDuplicateKeyError(err)) throw err;

      const existing = await this.relationshipModel
        .findOne({ requesterId, targetId })
        .lean()
        .select({ status: 1 });

      if (!existing) {
        // extremely rare race; allow client retry
        throw new ConflictException('Relationship already exists');
      }

      if (existing.status === RelationshipStatus.BLOCKED) {
        throw new ForbiddenException('You are blocked');
      }
      if (existing.status === RelationshipStatus.ACCEPTED) {
        throw new ConflictException('Already friends');
      }

      // PENDING or DECLINED (changed concurrently): idempotent outcome
      return { status: existing.status, created: false, revived: false };
    }
  }

  /**
   * Accept an incoming request from requesterId -> currentUserId (target).
   * Creates/ensures mirrored ACCEPTED relationship.
   */
  async acceptFriendRequest(currentUserId: Types.ObjectId, requesterId: Types.ObjectId) {
    if (currentUserId.equals(requesterId)) {
      throw new BadRequestException('Cannot accept yourself');
    }

    await this.assertUsersExist(currentUserId, requesterId);
    await this.assertNotBlocked(currentUserId, requesterId);

    // Transition incoming request to ACCEPTED (counters fire only if we actually changed PENDING -> ACCEPTED)
    const transitionedIncoming = await this.relationshipModel.findOneAndUpdate(
      {
        requesterId,
        targetId: currentUserId,
        status: RelationshipStatus.PENDING,
      },
      { $set: { status: RelationshipStatus.ACCEPTED } },
      { new: false },
    );

    // Ensure/transition mirrored relationship to ACCEPTED (if it existed as PENDING/DECLINED)
    const transitionedMirror = await this.relationshipModel.findOneAndUpdate(
      {
        requesterId: currentUserId,
        targetId: requesterId,
        status: { $in: [RelationshipStatus.PENDING, RelationshipStatus.DECLINED] },
      },
      { $set: { status: RelationshipStatus.ACCEPTED } },
      { new: false },
    );

    // If mirror did not exist at all, create it (dup-safe)
    if (!transitionedMirror) {
      try {
        await this.relationshipModel.create({
          requesterId: currentUserId,
          targetId: requesterId,
          status: RelationshipStatus.ACCEPTED,
        });
      } catch (err) {
        if (!isDuplicateKeyError(err)) throw err;
      }
    }

    // Counters:
    // - friendsCount +1 for both users for each successful acceptance transition
    // - pending follower/following counters are decremented only for the direction(s) that were actually PENDING
    if (transitionedIncoming) {
      await this.applyAcceptCounters({
        requesterId,
        targetId: currentUserId,
      });

      // Notify original requester that request was accepted
      await this.notificationsService.createFriendAcceptedNotification({
        userId: requesterId,
        fromUserId: currentUserId,
      });
      
      // Send WebSocket event to original requester (toUserId = requesterId)
      this.wsGateway.sendToUser(requesterId, {
        type: 'friend_request_accepted',
        data: {
          fromUserId: currentUserId.toString(), // Who accepted (performed action)
          toUserId: requesterId.toString(), // Who gets notification
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Mutual-pending edge case: if currentUser had also sent a request earlier, we transitioned that too
    if (transitionedMirror && transitionedMirror.status === RelationshipStatus.PENDING) {
      await this.applyAcceptCounters({
        requesterId: currentUserId,
        targetId: requesterId,
      });
    }

    // If there was no pending to accept, treat as idempotent if already friends
    if (!transitionedIncoming) {
      const alreadyFriend = await this.relationshipModel
        .exists({ requesterId, targetId: currentUserId, status: RelationshipStatus.ACCEPTED })
        .lean();

      if (!alreadyFriend) {
        throw new NotFoundException('No pending friend request found');
      }
    }

    return { status: RelationshipStatus.ACCEPTED };
  }

  async declineFriendRequest(currentUserId: Types.ObjectId, requesterId: Types.ObjectId) {
    if (currentUserId.equals(requesterId)) {
      throw new BadRequestException('Cannot decline yourself');
    }

    await this.assertUsersExist(currentUserId, requesterId);
    await this.assertNotBlocked(currentUserId, requesterId);

    const transitioned = await this.relationshipModel.findOneAndUpdate(
      {
        requesterId,
        targetId: currentUserId,
        status: RelationshipStatus.PENDING,
      },
      { $set: { status: RelationshipStatus.DECLINED } },
      { new: false },
    );

    if (transitioned) {
      await this.applyDeclineCounters({ requesterId, targetId: currentUserId });
      
      // Send WebSocket event to original requester
      this.wsGateway.sendToUser(requesterId, {
        type: 'friend_request_declined',
        data: {
          fromUserId: currentUserId.toString(), // Who declined (performed action)
          toUserId: requesterId.toString(), // Who gets notification
          timestamp: new Date().toISOString(),
        },
      });
      
      return { status: RelationshipStatus.DECLINED };
    }

    // Idempotent: already declined
    const existsDeclined = await this.relationshipModel
      .exists({ requesterId, targetId: currentUserId, status: RelationshipStatus.DECLINED })
      .lean();
    if (existsDeclined) return { status: RelationshipStatus.DECLINED };

    throw new NotFoundException('No pending friend request found');
  }

  async removeFriend(currentUserId: Types.ObjectId, friendUserId: Types.ObjectId) {
    if (currentUserId.equals(friendUserId)) {
      throw new BadRequestException('Cannot remove yourself');
    }

    await this.assertUsersExist(currentUserId, friendUserId);

    const aToB = await this.relationshipModel.deleteOne({
      requesterId: currentUserId,
      targetId: friendUserId,
      status: RelationshipStatus.ACCEPTED,
    });
    if (aToB.deletedCount === 1) {
      await this.userModel.updateOne({ _id: currentUserId }, { $inc: { friendsCount: -1 } });
    }

    const bToA = await this.relationshipModel.deleteOne({
      requesterId: friendUserId,
      targetId: currentUserId,
      status: RelationshipStatus.ACCEPTED,
    });
    if (bToA.deletedCount === 1) {
      await this.userModel.updateOne({ _id: friendUserId }, { $inc: { friendsCount: -1 } });
    }

    const removed = (aToB.deletedCount ?? 0) + (bToA.deletedCount ?? 0) > 0;
    
    // Send WebSocket event to the friend who was removed (if any deletion occurred)
    if (removed) {
      this.wsGateway.sendToUser(friendUserId, {
        type: 'friend_removed',
        data: {
          fromUserId: currentUserId.toString(), // Who removed (performed action)
          toUserId: friendUserId.toString(), // Who gets notification
          timestamp: new Date().toISOString(),
        },
      });
    }
    
    return { removed };
  }

  async getFriends(userId: Types.ObjectId, params?: { limit?: number; cursor?: Types.ObjectId }) {
    const limit = Math.min(Math.max(params?.limit ?? 50, 1), 200);

    const filter: any = { requesterId: userId, status: RelationshipStatus.ACCEPTED };
    if (params?.cursor) filter._id = { $gt: params.cursor };

    const docs = await this.relationshipModel
      .find(filter)
      .sort({ _id: 1 })
      .limit(limit)
      .lean()
      .select({ targetId: 1 });

    const items = docs.map((d) => d.targetId as Types.ObjectId);
    const nextCursor = docs.length === limit ? (docs[docs.length - 1] as any)._id?.toString() : undefined;

    return { items, nextCursor };
  }

  // Followers = incoming pending requests (requester -> user)
  async getFollowers(userId: Types.ObjectId, params?: { limit?: number; cursor?: Types.ObjectId }) {
    const limit = Math.min(Math.max(params?.limit ?? 50, 1), 200);

    const filter: any = { targetId: userId, status: RelationshipStatus.PENDING };
    if (params?.cursor) filter._id = { $gt: params.cursor };

    const docs = await this.relationshipModel
      .find(filter)
      .sort({ _id: 1 })
      .limit(limit)
      .lean()
      .select({ requesterId: 1 });

    const items = docs.map((d) => d.requesterId as Types.ObjectId);
    const nextCursor = docs.length === limit ? (docs[docs.length - 1] as any)._id?.toString() : undefined;

    return { items, nextCursor };
  }

  // Following = outgoing pending requests (user -> target)
  async getFollowing(userId: Types.ObjectId, params?: { limit?: number; cursor?: Types.ObjectId }) {
    const limit = Math.min(Math.max(params?.limit ?? 50, 1), 200);

    const filter: any = { requesterId: userId, status: RelationshipStatus.PENDING };
    if (params?.cursor) filter._id = { $gt: params.cursor };

    const docs = await this.relationshipModel
      .find(filter)
      .sort({ _id: 1 })
      .limit(limit)
      .lean()
      .select({ targetId: 1 });

    const items = docs.map((d) => d.targetId as Types.ObjectId);
    const nextCursor = docs.length === limit ? (docs[docs.length - 1] as any)._id?.toString() : undefined;

    return { items, nextCursor };
  }

  private async assertUsersExist(a: Types.ObjectId, b: Types.ObjectId) {
    const [aExists, bExists] = await Promise.all([
      this.userModel.exists({ _id: a }).lean(),
      this.userModel.exists({ _id: b }).lean(),
    ]);
    if (!aExists) throw new NotFoundException('Requester user not found');
    if (!bExists) throw new NotFoundException('Target user not found');
  }

  private async assertNotBlocked(a: Types.ObjectId, b: Types.ObjectId) {
    const blocked = await this.relationshipModel
      .exists({
        status: RelationshipStatus.BLOCKED,
        $or: [
          { requesterId: a, targetId: b },
          { requesterId: b, targetId: a },
        ],
      })
      .lean();

    if (blocked) throw new ForbiddenException('Blocked');
  }

  private async applySendRequestCounters(requesterId: Types.ObjectId, targetId: Types.ObjectId) {
    await Promise.all([
      this.userModel.updateOne({ _id: requesterId }, { $inc: { followingCount: 1 } }),
      this.userModel.updateOne({ _id: targetId }, { $inc: { followersCount: 1 } }),
    ]);
  }

  private async applyAcceptCounters(params: { requesterId: Types.ObjectId; targetId: Types.ObjectId }) {
    // NOTE: This follows the logical model:
    // - requester sent the request => requester.followingCount was +1
    // - target received the request => target.followersCount was +1
    await Promise.all([
      this.userModel.updateOne(
        { _id: params.requesterId },
        { $inc: { friendsCount: 1, followingCount: -1 } },
      ),
      this.userModel.updateOne(
        { _id: params.targetId },
        { $inc: { friendsCount: 1, followersCount: -1 } },
      ),
    ]);
  }

  private async applyDeclineCounters(params: { requesterId: Types.ObjectId; targetId: Types.ObjectId }) {
    await Promise.all([
      this.userModel.updateOne({ _id: params.requesterId }, { $inc: { followingCount: -1 } }),
      this.userModel.updateOne({ _id: params.targetId }, { $inc: { followersCount: -1 } }),
    ]);
  }
}


