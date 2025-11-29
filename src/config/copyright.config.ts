import { ConfigService } from '@nestjs/config';
import * as path from 'path';

export const getCopyrightConfig = (configService: ConfigService) => {
  // Поддерживаем как старый формат (один файл), так и новый (массив файлов)
  const pdfPath = configService.get('COPYRIGHT_AGREEMENT_PDF_PATH') || './documents/Согласие на обработку ПД.pdf';
  const pdfPaths = configService.get<string>('COPYRIGHT_AGREEMENT_PDF_PATHS');
  
  // Функция для нормализации пути
  const normalizePath = (filePath: string): string => {
    const trimmed = filePath.trim();
    // Если путь начинается с точки, но не с ./ или ../
    if (trimmed.startsWith('.') && !trimmed.startsWith('./') && !trimmed.startsWith('../')) {
      return './' + trimmed.substring(1);
    }
    // Если путь не начинается с ./ или абсолютного пути, добавляем ./
    if (!trimmed.startsWith('./') && !trimmed.startsWith('/') && !trimmed.match(/^[A-Za-z]:/)) {
      return './' + trimmed;
    }
    return trimmed;
  };
  
  // Если указан массив файлов через запятую, используем его, иначе используем один файл
  const filePaths = pdfPaths 
    ? pdfPaths.split(',').map(path => normalizePath(path)).filter(path => path.length > 0)
    : [normalizePath(pdfPath)];

  return {
    pdfPath: normalizePath(pdfPath), // Для обратной совместимости
    pdfPaths: filePaths, // Массив путей к файлам
  };
}; 