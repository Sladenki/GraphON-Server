import { modelOptions, prop } from "@typegoose/typegoose";
import { Base, TimeStamps } from "@typegoose/typegoose/lib/defaultClasses";

export interface AppDownloadModel extends Base {}

@modelOptions({
  schemaOptions: {
    timestamps: true,
    versionKey: false,
    collection: "app_downloads",
  },
})
export class AppDownloadModel extends TimeStamps {
  @prop({ required: true, default: 0 })
  count!: number;

  @prop({ default: () => new Date() })
  lastIncrementedAt?: Date;
}

