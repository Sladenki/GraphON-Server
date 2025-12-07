import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { AppDownloadModel, AppDownloadDocument } from "./app-download.model";
import { Types } from "mongoose";

@Injectable()
export class DownloadsService {
  constructor(
    @InjectModel(AppDownloadModel.name)
    private readonly appDownloadModel: Model<AppDownloadDocument>,
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

