import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { TypegooseModule } from "@m8a/nestjs-typegoose";
import { UserModel } from "src/user/user.model";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { getJwtConfig } from "src/config/jwt.config";
import { GraphModule } from "src/graph/graph.module";
import { UserModule } from "src/user/user.module";
import { GraphModel } from "src/graph/graph.model";

@Module({
  controllers: [AdminController],
  providers: [AdminService],
  imports: [
    ConfigModule,

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getJwtConfig,
    }),

    TypegooseModule.forFeature([
      {
        // Ссылка на модель пользователя
        typegooseClass: UserModel,
        // Название коллекции в БД
        schemaOptions: { collection: 'User' },
      },
      {
        // Ссылка на модель графа
        typegooseClass: GraphModel,
        // Название коллекции в БД
        schemaOptions: { collection: 'Graph' },
      },
    ]),
    GraphModule,
    UserModule
  ],
  exports: [AdminService]
})

export class AdminModule {}