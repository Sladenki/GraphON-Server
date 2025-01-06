import { Types } from "mongoose";

export class CreatePostReactionDto {
    text?: string;
    emoji?: string;
    post: string
}

