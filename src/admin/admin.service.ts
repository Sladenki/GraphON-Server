import { InjectModel } from "@m8a/nestjs-typegoose";
import { Injectable, NotFoundException } from "@nestjs/common";
import { ModelType } from "@typegoose/typegoose/lib/types";
import { UserModel } from "src/user/user.model";
import { UserRole } from "./role.enum";


@Injectable()
export class AdminService {
  constructor(
    @InjectModel(UserModel) 
    private readonly UserModel: ModelType<UserModel>,
  ) {}

  // --- Передача роли --- 
  async assignRole(userId: string, newRole: UserRole) {
    const user = await this.UserModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    user.role = newRole;
    return user.save();
  }

}
