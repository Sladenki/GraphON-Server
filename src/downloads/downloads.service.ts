import { Injectable } from "@nestjs/common";
import { InjectModel } from "@m8a/nestjs-typegoose";
import { ModelType } from "@typegoose/typegoose/lib/types";
import { AppDownloadModel } from "./app-download.model";
import { Types } from "mongoose";

@Injectable()
export class DownloadsService {
  constructor(
    @InjectModel(AppDownloadModel)
    private readonly appDownloadModel: ModelType<AppDownloadModel>,
  ) {}

  async incrementCount(userId?: string) {
    const payload: Partial<AppDownloadModel> = {};

    if (userId) {
      payload.userId = new Types.ObjectId(userId);
    }

    const created = await this.appDownloadModel.create(payload);
    return created.toObject();
  }

  async getTotalCount() {
    const total = await this.appDownloadModel.countDocuments().exec();
    return { count: total };
  }
}

