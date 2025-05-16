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

  // --- Получение статистики использования ресурсов сервера ---
  async getServerResourceStats() {
    const cpus = os.cpus();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsage = process.memoryUsage();
    const uptime = os.uptime();

    // Расчет загрузки CPU
    const cpuUsage = cpus.map(cpu => {
      const total = Object.values(cpu.times).reduce((acc, tv) => acc + tv, 0);
      const idle = cpu.times.idle;
      return {
        model: cpu.model,
        speed: cpu.speed,
        usage: ((total - idle) / total * 100).toFixed(2) + '%'
      };
    });

    // Расчет средней загрузки CPU
    const avgCpuUsage = cpuUsage.reduce((acc, cpu) => {
      return acc + parseFloat(cpu.usage);
    }, 0) / cpuUsage.length;

    // Расчет использования памяти в процентах
    const memoryUsagePercentage = (usedMemory / totalMemory) * 100;
    const heapUsagePercentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

    // Оценка нагрузки системы
    const systemLoad = this.assessSystemLoad(avgCpuUsage, memoryUsagePercentage, heapUsagePercentage);

    return {
      cpu: {
        model: cpus[0].model,
        cores: cpus.length,
        usage: cpuUsage,
        averageUsage: avgCpuUsage.toFixed(2) + '%'
      },
      memory: {
        total: this.formatBytes(totalMemory),
        used: this.formatBytes(usedMemory),
        free: this.formatBytes(freeMemory),
        usagePercentage: memoryUsagePercentage.toFixed(2) + '%',
        processMemory: {
          heapUsed: this.formatBytes(memoryUsage.heapUsed),
          heapTotal: this.formatBytes(memoryUsage.heapTotal),
          heapUsagePercentage: heapUsagePercentage.toFixed(2) + '%',
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
      systemLoad: {
        level: systemLoad.level,
        description: systemLoad.description,
        recommendations: systemLoad.recommendations
      }
    };
  }

  // Вспомогательные методы для форматирования
  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Byte';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i)) + ' ' + sizes[i];
  }

  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    return `${days}д ${hours}ч ${minutes}м ${secs}с`;
  }

  // Оценка нагрузки системы
  private assessSystemLoad(cpuUsage: number, memoryUsage: number, heapUsage: number) {
    // Определяем уровень нагрузки на основе CPU и памяти
    const getLoadLevel = (cpu: number, mem: number, heap: number) => {
      if (cpu > 80 || mem > 85 || heap > 90) {
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
      } else if (cpu > 60 || mem > 70 || heap > 80) {
        return {
          level: 'high',
          description: 'Высокая нагрузка',
          recommendations: [
            'Рекомендуется мониторинг',
            'Подготовьте план масштабирования',
            'Проверьте оптимизацию кода'
          ]
        };
      } else if (cpu > 40 || mem > 50 || heap > 60) {
        return {
          level: 'medium',
          description: 'Средняя нагрузка',
          recommendations: [
            'Система работает в нормальном режиме',
            'Продолжайте мониторинг'
          ]
        };
      } else {
        return {
          level: 'low',
          description: 'Низкая нагрузка',
          recommendations: [
            'Система работает оптимально',
            'Ресурсы используются эффективно'
          ]
        };
      }
    };

    return getLoadLevel(cpuUsage, memoryUsage, heapUsage);
  }
}
