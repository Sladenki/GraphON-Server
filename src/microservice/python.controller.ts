import { Controller, Post, Body, HttpException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios'; // Импортируем HttpService
import { PythonService } from './python.service';


@Controller('python')
export class PythonController {
  constructor(
    private readonly httpService: HttpService,
    private readonly pythonService: PythonService
  ) {}

  @Post('extract-keywords')
  async extractKeywords(
    @Body() data: { content: string }
  ) {
      return this.pythonService.extractKeywords(data.content)
  }
  

}


