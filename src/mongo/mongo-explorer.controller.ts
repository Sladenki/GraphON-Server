import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { MongoExplorerService } from './mongo-explorer.service';

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
}


