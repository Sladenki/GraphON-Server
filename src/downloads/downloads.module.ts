import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AppDownloadModel, AppDownloadSchema } from "./app-download.model";
import { DownloadsService } from "./downloads.service";
import { DownloadsController } from "./downloads.controller";

@Module({
  imports: [MongooseModule.forFeature([
    { name: AppDownloadModel.name, schema: AppDownloadSchema },
  ])],
  providers: [DownloadsService],
  controllers: [DownloadsController],
  exports: [DownloadsService],
})
export class DownloadsModule {}

