import { Types } from "mongoose"

export class CreateGraphDto {
   name: string
   parentGraphId: Types.ObjectId
   globalGraphId: Types.ObjectId
}