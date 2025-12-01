import { Module } from '@nestjs/common';
import { TypegooseModule } from '@m8a/nestjs-typegoose';
import { RequestsConnectedGraphController } from './requests-connected-graph.controller';
import { RequestsConnectedGraphService } from './requests-connected-graph.service';
import { RequestsConnectedGraphModel } from './requests-connected-graph.model';
import { UserModel } from 'src/user/user.model';
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
        TypegooseModule.forFeature([
            {
                typegooseClass: RequestsConnectedGraphModel,
                schemaOptions: { collection: 'requests_connected_graph' }
            },
            {
                typegooseClass: UserModel,
                schemaOptions: { collection: 'User' }
            },
        ]),
    ],
    exports: [RequestsConnectedGraphService]
})
export class RequestsConnectedGraphModule {}

