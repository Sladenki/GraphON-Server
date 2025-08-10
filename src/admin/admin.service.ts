import { InjectModel } from "@m8a/nestjs-typegoose";
import { Injectable, NotFoundException } from "@nestjs/common";
import { ModelType } from "@typegoose/typegoose/lib/types";
import { UserModel } from "src/user/user.model";
import { UserRole } from "./role.enum";
import { GraphModel } from "src/graph/graph.model";
import * as os from 'os';

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

    return {
      totalUsers,
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

    const systemLoad = this.assessSystemLoad(avgCpuUsage, memoryUsagePercentage, heapUsagePercentage);

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
      },
      systemLoad
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

  private assessSystemLoad(cpuUsage: number, memoryUsage: number, heapUsage: number) {
    const thresholds = {
      critical: { cpu: 80, mem: 85, heap: 90 },
      high:     { cpu: 60, mem: 70, heap: 80 },
      medium:   { cpu: 40, mem: 50, heap: 60 }
    };

    if (cpuUsage > thresholds.critical.cpu || memoryUsage > thresholds.critical.mem || heapUsage > thresholds.critical.heap) {
      return {
        level: 'critical',
        description: 'Критическая нагрузка',
        recommendations: [
          'Необходимо немедленное вмешательство',
          'Рассмотрите возможность масштабирования',
          'Проверьте наличие утечек памяти',
          'Оптимизируйте запросы к базе данных'
        ]
      };
    }

    if (cpuUsage > thresholds.high.cpu || memoryUsage > thresholds.high.mem || heapUsage > thresholds.high.heap) {
      return {
        level: 'high',
        description: 'Высокая нагрузка',
        recommendations: [
          'Рекомендуется мониторинг',
          'Подготовьте план масштабирования',
          'Проверьте оптимизацию кода'
        ]
      };
    }

    if (cpuUsage > thresholds.medium.cpu || memoryUsage > thresholds.medium.mem || heapUsage > thresholds.medium.heap) {
      return {
        level: 'medium',
        description: 'Средняя нагрузка',
        recommendations: [
          'Система работает в нормальном режиме',
          'Продолжайте мониторинг'
        ]
      };
    }

    return {
      level: 'low',
      description: 'Низкая нагрузка',
      recommendations: [
        'Система работает оптимально',
        'Ресурсы используются эффективно'
      ]
    };
  }
}
