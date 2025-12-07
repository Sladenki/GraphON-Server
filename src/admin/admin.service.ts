import { InjectModel } from "@nestjs/mongoose";
import { Injectable, NotFoundException } from "@nestjs/common";
import { Model } from "mongoose";
import { UserModel, UserDocument } from "src/user/user.model";
import { UserRole } from "./role.enum";
import { GraphModel, GraphDocument } from "src/graph/graph.model";
import * as os from 'os';
import { Types } from 'mongoose';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(UserModel.name) 
    private readonly userModel: Model<UserDocument>,
    @InjectModel(GraphModel.name)
    private readonly graphModel: Model<GraphDocument>,
  ) {}

  // --- Передача роли --- 
  async assignRole(userId: string, newRole: UserRole) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    user.role = newRole;
    return user.save();
  }

  // --- Передача прав администратора графа ---
  async transferGraphOwnership(graphId: string, newOwnerId: string) {
    const graph = await this.graphModel.findById(graphId);
    if (!graph) throw new NotFoundException('Graph not found');

    const newOwner = await this.userModel.findById(newOwnerId);
    if (!newOwner) throw new NotFoundException('New owner not found');

    const prevOwnerId = graph.ownerUserId?.toString();
    graph.ownerUserId = newOwner._id;
    await graph.save();

    // Удаляем граф у предыдущего владельца
    if (prevOwnerId) {
      await this.userModel.findByIdAndUpdate(
        prevOwnerId,
        { $pull: { managedGraphIds: graph._id } },
        { new: false }
      );
    }

    // Добавляем граф новому владельцу
    await this.userModel.findByIdAndUpdate(
      newOwner._id,
      { $addToSet: { managedGraphIds: graph._id } },
      { new: false }
    );

    return graph;
  }

  // --- Получение статистики приложения ---
  async getApplicationStats() {
    const totalUsers = await this.userModel.countDocuments();

    const kgtuGraphId = new Types.ObjectId('67a499dd08ac3c0df94d6ab7');
    const kbkGraphId = new Types.ObjectId('6896447465255a1c4ed48eaf');

    const [usersKgtu, usersKbk, usersNoGraph] = await Promise.all([
      (this.userModel.countDocuments as any)({ selectedGraphId: kgtuGraphId }),
      (this.userModel.countDocuments as any)({ selectedGraphId: kbkGraphId }),
      this.userModel.countDocuments({ selectedGraphId: null })
    ]);

    return {
      totalUsers,
      usersKgtu,
      usersKbk,
      usersNoGraph,
    };
  }

  // --- Получение статистики использования ресурсов сервера ---
  async getServerResourceStats() {
    const cpus = await this.getCpuUsage();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsage = process.memoryUsage();
    const uptime = os.uptime();

    const avgCpuUsage = cpus.reduce((acc, cpu) => acc + parseFloat(cpu.usage), 0) / cpus.length;
    const memoryUsagePercentage = (usedMemory / totalMemory) * 100;
    const heapUsagePercentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

    return {
      cpu: {
        model: cpus[0].model,
        cores: cpus.length,
        usage: cpus,
        averageUsage: this.formatPercentage(avgCpuUsage)
      },
      memory: {
        total: this.formatBytes(totalMemory),
        used: this.formatBytes(usedMemory),
        free: this.formatBytes(freeMemory),
        usagePercentage: this.formatPercentage(memoryUsagePercentage),
        processMemory: {
          heapUsed: this.formatBytes(memoryUsage.heapUsed),
          heapTotal: this.formatBytes(memoryUsage.heapTotal),
          heapUsagePercentage: this.formatPercentage(heapUsagePercentage),
          rss: this.formatBytes(memoryUsage.rss),
          external: this.formatBytes(memoryUsage.external)
        }
      },
      uptime: {
        seconds: uptime,
        formatted: this.formatUptime(uptime)
      },
      platform: {
        type: os.type(),
        release: os.release(),
        hostname: os.hostname()
      }
    };
  }

  private async getCpuUsage(): Promise<{ model: string; speed: number; usage: string; }[]> {
    const snapshot = () =>
      os.cpus().map(cpu => ({
        model: cpu.model,
        speed: cpu.speed,
        times: { ...cpu.times }
      }));

    const start = snapshot();
    await new Promise(resolve => setTimeout(resolve, 100));
    const end = snapshot();

    return start.map((startCpu, i) => {
      const endCpu = end[i];
      const totalDiff = Object.keys(startCpu.times).reduce((acc, key) => {
        const k = key as keyof typeof startCpu.times;
        return acc + (endCpu.times[k] - startCpu.times[k]);
      }, 0);
      const idleDiff = endCpu.times.idle - startCpu.times.idle;
      const usage = ((1 - idleDiff / totalDiff) * 100);
      return {
        model: startCpu.model,
        speed: startCpu.speed,
        usage: this.formatPercentage(usage)
      };
    });
  }

  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Byte';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
  }

  private formatPercentage(value: number): string {
    return value.toFixed(2) + '%';
  }

  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${days}д ${hours}ч ${minutes}м ${secs}с`;
  }
}
