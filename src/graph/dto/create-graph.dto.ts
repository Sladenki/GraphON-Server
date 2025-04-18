import { Types } from "mongoose"

export class CreateGraphDto {
   name: string
   parentGraphId: Types.ObjectId
}