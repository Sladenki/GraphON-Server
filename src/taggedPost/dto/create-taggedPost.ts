import { Types } from "mongoose";

export class CreateTaggedPostDto {
    postId: Types.ObjectId;
    postTag: Types.ObjectId;
}