import { Module } from "@nestjs/common";
import { TypegooseModule } from "@m8a/nestjs-typegoose";
import { AppDownloadModel } from "./app-download.model";
import { DownloadsService } from "./downloads.service";
import { DownloadsController } from "./downloads.controller";

@Module({
  imports: [TypegooseModule.forFeature([AppDownloadModel])],
  providers: [DownloadsService],
  controllers: [DownloadsController],
  exports: [DownloadsService],
})
export class DownloadsModule {}

