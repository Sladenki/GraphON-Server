import { TypegooseModuleOptions } from '@m8a/nestjs-typegoose';
import { ConfigService } from '@nestjs/config';

export const getMongoConfig = async (
  ConfigService: ConfigService,
): Promise<TypegooseModuleOptions> => ({
  uri: ConfigService.get('MONGO_URL'),
});
