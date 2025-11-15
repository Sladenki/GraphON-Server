import { modelOptions, prop, Ref } from "@typegoose/typegoose";
import { Base, TimeStamps } from "@typegoose/typegoose/lib/defaultClasses";
import { UserModel } from "src/user/user.model";

export interface AppDownloadModel extends Base {}

@modelOptions({
  schemaOptions: {
    timestamps: true,
    versionKey: false,
    collection: "app_downloads",
  },
})
export class AppDownloadModel extends TimeStamps {
  @prop({ ref: () => UserModel})
  userId?: Ref<UserModel>;
}

