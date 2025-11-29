import { ConfigService } from '@nestjs/config';

export const getCopyrightConfig = (configService: ConfigService) => {
  // Поддерживаем как старый формат (один файл), так и новый (массив файлов)
  const pdfPath = configService.get('COPYRIGHT_AGREEMENT_PDF_PATH') || './documents/Согласие на обработку ПД.pdf';
  const pdfPaths = configService.get<string>('COPYRIGHT_AGREEMENT_PDF_PATHS');
  
  // Если указан массив файлов через запятую, используем его, иначе используем один файл
  const filePaths = pdfPaths 
    ? pdfPaths.split(',').map(path => path.trim())
    : [pdfPath];

  return {
    pdfPath, // Для обратной совместимости
    pdfPaths: filePaths, // Массив путей к файлам
  };
}; 