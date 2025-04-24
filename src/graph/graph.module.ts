import { forwardRef, Module } from '@nestjs/common';
import { TypegooseModule } from '@m8a/nestjs-typegoose';
import { GraphController } from './graph.controller';
import { GraphModel } from './graph.model';
import { GraphService } from './graph.service';
import { JwtStrategy } from 'src/user/jwt.strategy';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserModel } from 'src/user/user.model';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { getJwtConfig } from 'src/config/jwt.config';
import { GraphSubsModule } from 'src/graphSubs/graphSubs.module';
import { OptionalAuthGuard } from 'src/guards/optionalAuth.guard';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';

@Module({
  controllers: [GraphController],
  providers: [
    JwtStrategy, 
    GraphService, 
    OptionalAuthGuard, 
    JwtAuthGuard,
    {
      provide: JwtService,
      useFactory: (configService: ConfigService) => {
        return new JwtService({
          secret: configService.get('JWT_SECRET'),
          signOptions: { expiresIn: '30d' }
        });
      },
      inject: [ConfigService]
    }
  ],
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
