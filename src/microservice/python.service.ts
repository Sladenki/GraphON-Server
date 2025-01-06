import { Injectable, HttpException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
// import { lastValueFrom } from 'rxjs';

@Injectable()
export class PythonService {
  constructor(private readonly httpService: HttpService) {}

  private readonly pythonServiceUrl = process.env.MICROSERVICE_URL 

  // --- Выделение ключевых слов от публикации --- 
  async extractKeywords(content: string): Promise<any> {
    return content
    // try {
    //   const response = await lastValueFrom(
    //     this.httpService.post(`${this.pythonServiceUrl}/extract-keywords`, { content })
    //   );
    //   return response.data.keywords;
    // } catch (error) {
    //   // Логирование ошибки для лучшей диагностики
    //   console.error('Error during Python service communication:', error);
    //   throw new HttpException(
    //     error.response?.data || 'Error communicating with Python service',
    //     error.response?.status || 500
    //   );
    // }
  }
}
