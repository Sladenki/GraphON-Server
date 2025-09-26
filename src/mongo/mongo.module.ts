import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MongoExplorerController } from "./mongo-explorer.controller";
import { MongoExplorerService } from "./mongo-explorer.service";


@Module({
  imports: [ConfigModule],
  controllers: [MongoExplorerController],
  providers: [MongoExplorerService],
})
export class MongoModule {}


