import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { WebSocketModule } from 'src/websocket/websocket.module';
import { UserModel, UserSchema } from 'src/user/user.model';
import { RelationshipModel, RelationshipSchema } from './relationship.model';
import { RelationshipsController } from './relationships.controller';
import { RelationshipsService } from './relationships.service';

@Module({
  imports: [
    NotificationsModule,
    WebSocketModule,
    MongooseModule.forFeature([
      { name: RelationshipModel.name, schema: RelationshipSchema },
      { name: UserModel.name, schema: UserSchema },
    ]),
  ],
  controllers: [RelationshipsController],
  providers: [RelationshipsService],
  exports: [RelationshipsService],
})
export class RelationshipsModule {}


