import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Res, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { MongoExplorerService } from './mongo-explorer.service';
import { Multer } from 'multer';

@Controller('mongo')
export class MongoExplorerController {
  constructor(private readonly explorer: MongoExplorerService) {}

  @Get('databases')
  async getDatabases() {
    return this.explorer.listDatabases();
  }

  @Get('collections/:db')
  async getCollections(@Param('db') db: string) {
    return this.explorer.listCollections(db);
  }

  @Post('find/:db/:collection')
  @HttpCode(200)
  async find(
    @Param('db') db: string,
    @Param('collection') collection: string,
    @Body('query') query: any,
    @Body('options') options?: { limit?: number; skip?: number; sort?: Record<string, 1 | -1>; projection?: Record<string, 0 | 1> },
  ) {
    return this.explorer.findDocuments(db, collection, query, options);
  }

  @Get('doc/:db/:collection/:id')
  async getById(
    @Param('db') db: string,
    @Param('collection') collection: string,
    @Param('id') id: string,
  ) {
    return this.explorer.getDocumentById(db, collection, id);
  }

  @Patch('doc/:db/:collection/:id')
  async updateById(
    @Param('db') db: string,
    @Param('collection') collection: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.explorer.updateDocumentById(db, collection, id, body);
  }

  @Delete('doc/:db/:collection/:id')
  async deleteById(
    @Param('db') db: string,
    @Param('collection') collection: string,
    @Param('id') id: string,
  ) {
    return this.explorer.deleteDocumentById(db, collection, id);
  }

  @Get('export/:db/:collection')
  async exportCollection(
    @Param('db') db: string,
    @Param('collection') collection: string,
    @Res() res: Response,
    @Query('format') format: 'ndjson' | 'json' = 'ndjson',
    @Query('limit') limit?: string,
    @Query('sort') sort?: string,
    @Query('projection') projection?: string,
    @Query('query') query?: string,
  ) {
    const fileBase = `${collection}-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    const filename = `${fileBase}.${format === 'json' ? 'json' : 'ndjson'}`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', format === 'json' ? 'application/json; charset=utf-8' : 'application/x-ndjson; charset=utf-8');

    const parsedQuery = query ? JSON.parse(query) : undefined;
    const parsedSort = sort ? JSON.parse(sort) : undefined;
    const parsedProjection = projection ? JSON.parse(projection) : undefined;
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;

    if (format === 'json') {
      res.write('[');
      let first = true;
      for await (const doc of this.explorer.exportCollectionIterator(db, collection, parsedQuery, {
        limit: parsedLimit,
        sort: parsedSort,
        projection: parsedProjection,
      })) {
        const json = JSON.stringify(doc);
        if (!first) res.write(',');
        res.write(json);
        first = false;
      }
      res.write(']');
      res.end();
      return;
    }

    for await (const doc of this.explorer.exportCollectionIterator(db, collection, parsedQuery, {
      limit: parsedLimit,
      sort: parsedSort,
      projection: parsedProjection,
    })) {
      const line = JSON.stringify(doc) + '\n';
      res.write(line);
    }
    res.end();
  }

  @Post('import/:db/:collection')
  @UseInterceptors(FileInterceptor('file'))
  async importCollection(
    @Param('db') db: string,
    @Param('collection') collection: string,
    @UploadedFile() file: Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Файл не загружен');
    }

    try {
      // Парсим JSON из буфера файла
      const jsonContent = file.buffer.toString('utf-8');
      const documents = JSON.parse(jsonContent);

      // Проверяем, что это массив
      if (!Array.isArray(documents)) {
        throw new BadRequestException('JSON файл должен содержать массив объектов');
      }

      // Импортируем документы
      const result = await this.explorer.importDocuments(db, collection, documents);

      return {
        success: true,
        insertedCount: result.insertedCount,
        totalDocuments: documents.length,
        errors: result.errors.length > 0 ? result.errors : undefined,
      };
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Ошибка при импорте: ${error.message}`);
    }
  }
}


