import { forwardRef, Module } from '@nestjs/common';
import { TypegooseModule } from '@m8a/nestjs-typegoose';
import { GraphController } from './graph.controller';
import { GraphModel } from './graph.model';
import { GraphService } from './graph.service';
import { JwtStrategy } from 'src/user/jwt.strategy';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserModel } from 'src/user/user.model';
import { JwtModule } from '@nestjs/jwt';
import { getJwtConfig } from 'src/config/jwt.config';
import { GraphSubsModule } from 'src/graphSubs/graphSubs.module';

@Module({
  controllers: [GraphController],
  providers: [JwtStrategy, GraphService],
  imports: [
    ConfigModule,

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getJwtConfig,
    }),

    TypegooseModule.forFeature([
      {
        typegooseClass: GraphModel,
        schemaOptions: { collection: 'Graph' },
      },
    ]),

    TypegooseModule.forFeature([
      {
        // Ссылка на модель пользователя
        typegooseClass: UserModel,
        // Название коллекции в БД
        schemaOptions: { collection: 'User' },
      },
    ]),
    forwardRef(() => GraphSubsModule)
        
  ],
  exports: [GraphService],
})
export class GraphModule {}
