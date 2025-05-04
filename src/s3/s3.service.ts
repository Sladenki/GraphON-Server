import { Injectable } from '@nestjs/common';
import EasyYandexS3 from 'easy-yandex-s3';

@Injectable()
export class S3Service {
  private s3: EasyYandexS3;

  constructor() {
    this.s3 = new EasyYandexS3({
      auth: {
        accessKeyId: process.env.YANDEX_S3_ACCESS_KEY,  // Укажите свой ключ доступа
        secretAccessKey: process.env.YANDEX_S3_SECRET_KEY,  // Укажите свой секретный ключ
      },
      Bucket: process.env.YANDEX_S3_BUCKET_NAME,  // Имя вашего бакета
      debug: false,  // Установите true для вывода отладочной информации в консоль
    });
  }

  async uploadFile(file: any, customPath?: string): Promise<any> {
    const uploadResult = await this.s3.Upload(
      {
        buffer: file.buffer,
        name: customPath || `uploads/${Date.now()}_${file.originalname}`,
      },
      '/images'  // Замените на путь, куда вы хотите загружать файлы в бакет
    );
    return uploadResult;
  }

  async deleteFile(filePath: string): Promise<any> {
    const deleteResult = await this.s3.Remove(filePath);
    return deleteResult;
  }
}
