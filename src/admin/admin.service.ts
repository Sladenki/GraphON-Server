import { InjectModel } from "@m8a/nestjs-typegoose";
import { Injectable, NotFoundException } from "@nestjs/common";
import { ModelType } from "@typegoose/typegoose/lib/types";
import { UserModel } from "src/user/user.model";
import { UserRole } from "./role.enum";
import { GraphModel } from "src/graph/graph.model";

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(UserModel) 
    private readonly UserModel: ModelType<UserModel>,
    @InjectModel(GraphModel)
    private readonly GraphModel: ModelType<GraphModel>,
  ) {}

  // --- Передача роли --- 
  async assignRole(userId: string, newRole: UserRole) {
    const user = await this.UserModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    user.role = newRole;
    return user.save();
  }

  // --- Передача прав администратора графа ---
  async transferGraphOwnership(graphId: string, newOwnerId: string) {
    const graph = await this.GraphModel.findById(graphId);
    if (!graph) throw new NotFoundException('Graph not found');

    const newOwner = await this.UserModel.findById(newOwnerId);
    if (!newOwner) throw new NotFoundException('New owner not found');

    graph.ownerUserId = newOwner._id;
    return graph.save();
  }

  // --- Получение статистики приложения ---
  async getApplicationStats() {
    const totalUsers = await this.UserModel.countDocuments();
    const totalGraphs = await this.GraphModel.countDocuments();
    
    // Получаем количество пользователей по ролям
    const usersByRole = await this.UserModel.aggregate([
      {
        $group: {
          _id: "$role",
          count: { $sum: 1 }
        }
      }
    ]);

    return {
      totalUsers,
      totalGraphs,
      usersByRole: usersByRole.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {})
    };
  }
}
