import { MongooseModuleOptions } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';

export const getMongoConfig = async (
  ConfigService: ConfigService,
): Promise<MongooseModuleOptions> => ({
  uri: ConfigService.get('MONGO_URL'),
});
