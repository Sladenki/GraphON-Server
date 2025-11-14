import { Injectable } from "@nestjs/common";
import { InjectModel } from "@m8a/nestjs-typegoose";
import { ModelType } from "@typegoose/typegoose/lib/types";
import { AppDownloadModel } from "./app-download.model";

@Injectable()
export class DownloadsService {
  constructor(
    @InjectModel(AppDownloadModel)
    private readonly appDownloadModel: ModelType<AppDownloadModel>,
  ) {}

  async incrementCount() {
    const now = new Date();

    return this.appDownloadModel
      .findOneAndUpdate(
        {},
        {
          $inc: { count: 1 },
          $set: { lastIncrementedAt: now },
        },
        { upsert: true, new: true },
      )
      .lean()
      .exec();
  }

  async getTotalCount() {
    const doc = await this.appDownloadModel.findOne().lean().exec();
    if (doc) {
      return doc;
    }

    const created = await this.appDownloadModel.create({});
    return created.toObject();
  }
}

