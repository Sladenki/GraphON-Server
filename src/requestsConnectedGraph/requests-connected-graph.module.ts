import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RequestsConnectedGraphController } from './requests-connected-graph.controller';
import { RequestsConnectedGraphService } from './requests-connected-graph.service';
import { RequestsConnectedGraphModel, RequestsConnectedGraphSchema } from './requests-connected-graph.model';
import { UserModel, UserSchema } from 'src/user/user.model';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { getJwtConfig } from 'src/config/jwt.config';

@Module({
    controllers: [RequestsConnectedGraphController],
    providers: [RequestsConnectedGraphService],
    imports: [
        ConfigModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: getJwtConfig,
        }),
        MongooseModule.forFeature([
            { name: RequestsConnectedGraphModel.name, schema: RequestsConnectedGraphSchema },
            { name: UserModel.name, schema: UserSchema },
        ]),
    ],
    exports: [RequestsConnectedGraphService]
})
export class RequestsConnectedGraphModule {}

