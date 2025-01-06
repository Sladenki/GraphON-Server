import { Module } from '@nestjs/common';
import { TypegooseModule } from '@m8a/nestjs-typegoose';
import { UserModel } from 'src/user/user.model';

import { UserSubsService } from './userSubs.service';
import { userSubsModel } from './userSubs.model';
import { UserSubsController } from './userSubs.controller';

@Module({
  controllers: [UserSubsController],
  providers: [UserSubsService],
  imports: [
    TypegooseModule.forFeature([
      {
        typegooseClass: userSubsModel,
        schemaOptions: { collection: 'UserSubs' },
      },
      {
        typegooseClass: UserModel,
        schemaOptions: { collection: 'User' },
      },
    ]),
  ],
})
export class UserSubsModule {}
