import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { MongooseModule } from "@nestjs/mongoose";
import { UserModel, UserSchema } from "src/user/user.model";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { getJwtConfig } from "src/config/jwt.config";
import { GraphModule } from "src/graph/graph.module";
import { UserModule } from "src/user/user.module";
import { GraphModel, GraphSchema } from "src/graph/graph.model";

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

    MongooseModule.forFeature([
      { name: UserModel.name, schema: UserSchema },
      { name: GraphModel.name, schema: GraphSchema },
    ]),
    GraphModule,
    UserModule
  ],
  exports: [AdminService]
})

export class AdminModule {}