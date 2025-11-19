import { ConfigService } from '@nestjs/config';

export const getCopyrightConfig = (configService: ConfigService) => ({
  pdfPath: configService.get('COPYRIGHT_AGREEMENT_PDF_PATH') || './documents/Согласие на обработку ПД.pdf',
}); 