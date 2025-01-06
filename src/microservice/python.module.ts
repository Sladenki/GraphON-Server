import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PythonController } from './python.controller';
import { PythonService } from './python.service';

@Module({
  imports: [HttpModule],
  providers: [PythonService],
  controllers: [PythonController],
  exports: [PythonService]
})
export class PythonModule {}
