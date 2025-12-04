import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongoClient, ObjectId } from 'mongodb';

interface FindOptions {
  limit?: number;
  skip?: number;
  sort?: Record<string, 1 | -1>;
  projection?: Record<string, 0 | 1>;
}

@Injectable()
export class MongoExplorerService {
  private client: MongoClient | null = null;

  constructor(private readonly configService: ConfigService) {}

  private async getClient(): Promise<MongoClient> {
    const uri = this.configService.get<string>('MONGO_URL');
    if (!uri) {
      throw new Error('MONGO_URL is not set');
    }

    if (this.client) {
      try {
        await this.client.db('admin').command({ ping: 1 });
        return this.client;
      } catch {
        try { await this.client.close(); } catch {}
      }
    }

    this.client = new MongoClient(uri, {
      connectTimeoutMS: 5000,
      serverSelectionTimeoutMS: 5000,
    });
    await this.client.connect();
    return this.client;
  }

  async listDatabases() {
    const client = await this.getClient();
    const admin = client.db().admin();
    const { databases } = await admin.listDatabases();
    return databases.map((d) => ({ name: d.name, sizeOnDisk: d.sizeOnDisk, empty: d.empty }));
  }

  async listCollections(dbName: string) {
    const client = await this.getClient();
    const db = client.db(dbName);
    const collections = await db
      .listCollections(undefined, { nameOnly: true, authorizedCollections: true })
      .toArray();
    const withStats = await Promise.all(
      collections.map(async (c) => {
        const base: any = { name: c.name, type: (c as any).type ?? 'collection' };
        try {
          const stats = await db.command({ collStats: c.name, scale: 1 });
          return {
            ...base,
            count: stats?.count ?? null,
            sizeBytes: stats?.size ?? null,
            storageBytes: stats?.storageSize ?? null,
            totalIndexBytes: stats?.totalIndexSize ?? null,
          };
        } catch {
          // If collStats is not available (e.g., for views or permissions), return base info
          return base;
        }
      }),
    );
    return withStats;
  }

  async findDocuments(dbName: string, collectionName: string, queryRaw?: any, options?: FindOptions) {
    const client = await this.getClient();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    const query = this.normalizeQuery(queryRaw || {});

    // Special populate for User.selectedGraphId, universityGraphId and managedGraphIds → Graph documents
    if (collectionName === 'User') {
      const pipeline: any[] = [
        { $match: query },
        // Populate selectedGraphId
        {
          $lookup: {
            from: 'Graph',
            let: { selectedId: '$selectedGraphId' },
            pipeline: [
              { $match: { $expr: { $eq: ['$_id', '$$selectedId'] } } },
              { $project: { _id: 1, name: 1 } },
            ],
            as: 'selectedGraphId',
          },
        },
        { $unwind: { path: '$selectedGraphId', preserveNullAndEmptyArrays: true } },
        // Populate universityGraphId
        {
          $lookup: {
            from: 'Graph',
            let: { universityId: '$universityGraphId' },
            pipeline: [
              { $match: { $expr: { $eq: ['$_id', '$$universityId'] } } },
              { $project: { _id: 1, name: 1 } },
            ],
            as: 'universityGraphId',
          },
        },
        { $unwind: { path: '$universityGraphId', preserveNullAndEmptyArrays: true } },
        // Populate managedGraphIds
        {
          $lookup: {
            from: 'Graph',
            let: { managedIds: { $ifNull: ['$managedGraphIds', []] } },
            pipeline: [
              { $match: { $expr: { $in: ['$_id', '$$managedIds'] } } },
              { $project: { _id: 1, name: 1 } },
            ],
            as: 'managedGraphIds',
          },
        },
      ];

      const hasProjection = options?.projection && Object.keys(options.projection).length > 0;
      if (hasProjection) pipeline.push({ $project: options!.projection! });

      const hasSort = options?.sort && Object.keys(options.sort).length > 0;
      if (hasSort) pipeline.push({ $sort: options!.sort! });
      if (typeof options?.skip === 'number') pipeline.push({ $skip: options.skip });
      // Always hide sensitive/system fields from User output
      pipeline.push({ $project: { createdAt: 0, copyrightAgreementAcceptedAt: 0 } });
      pipeline.push({ $limit: options?.limit ?? 50 });

      const docs = await collection.aggregate(pipeline).toArray();
      return docs.map(this.stringifyObjectIds);
    }

    // Special populate for Graph.ownerUserId, parentGraphId, globalGraphId
    if (collectionName === 'Graph') {
      const pipeline: any[] = [
        { $match: query },
        // Populate ownerUserId
        {
          $lookup: {
            from: 'User',
            let: { ownerId: '$ownerUserId' },
            pipeline: [
              { $match: { $expr: { $eq: ['$_id', '$$ownerId'] } } },
              { $project: { _id: 1, firstName: 1, lastName: 1, username: 1, avaPath: 1 } },
            ],
            as: 'ownerUserId',
          },
        },
        { $unwind: { path: '$ownerUserId', preserveNullAndEmptyArrays: true } },
        // Populate parentGraphId
        {
          $lookup: {
            from: 'Graph',
            let: { parentId: '$parentGraphId' },
            pipeline: [
              { $match: { $expr: { $eq: ['$_id', '$$parentId'] } } },
              { $project: { _id: 1, name: 1, graphType: 1, imgPath: 1 } },
            ],
            as: 'parentGraphId',
          },
        },
        { $unwind: { path: '$parentGraphId', preserveNullAndEmptyArrays: true } },
        // Populate globalGraphId
        {
          $lookup: {
            from: 'Graph',
            let: { globalId: '$globalGraphId' },
            pipeline: [
              { $match: { $expr: { $eq: ['$_id', '$$globalId'] } } },
              { $project: { _id: 1, name: 1, graphType: 1, imgPath: 1, city: 1 } },
            ],
            as: 'globalGraphId',
          },
        },
        { $unwind: { path: '$globalGraphId', preserveNullAndEmptyArrays: true } },
      ];

      const hasProjection = options?.projection && Object.keys(options.projection).length > 0;
      if (hasProjection) pipeline.push({ $project: options!.projection! });

      const hasSort = options?.sort && Object.keys(options.sort).length > 0;
      if (hasSort) pipeline.push({ $sort: options!.sort! });
      if (typeof options?.skip === 'number') pipeline.push({ $skip: options.skip });
      pipeline.push({ $limit: options?.limit ?? 50 });

      const docs = await collection.aggregate(pipeline).toArray();
      return docs.map(this.stringifyObjectIds);
    }

    // Special populate for user_activities.userId
    if (collectionName === 'user_activities') {
      const pipeline: any[] = [
        { $match: query },
        // Populate userId
        {
          $lookup: {
            from: 'User',
            let: { userId: '$userId' },
            pipeline: [
              { $match: { $expr: { $eq: ['$_id', '$$userId'] } } },
              { $project: { _id: 1, firstName: 1, lastName: 1, username: 1, avaPath: 1 } },
            ],
            as: 'userId',
          },
        },
        { $unwind: { path: '$userId', preserveNullAndEmptyArrays: true } },
      ];

      const hasProjection = options?.projection && Object.keys(options.projection).length > 0;
      if (hasProjection) pipeline.push({ $project: options!.projection! });

      const hasSort = options?.sort && Object.keys(options.sort).length > 0;
      if (hasSort) pipeline.push({ $sort: options!.sort! });
      if (typeof options?.skip === 'number') pipeline.push({ $skip: options.skip });
      pipeline.push({ $limit: options?.limit ?? 50 });

      const docs = await collection.aggregate(pipeline).toArray();
      return docs.map(this.stringifyObjectIds);
    }

    // Special populate for app_downloads.userId
    if (collectionName === 'app_downloads') {
      const pipeline: any[] = [
        { $match: query },
        {
          $lookup: {
            from: 'User',
            let: { userId: '$userId' },
            pipeline: [
              { $match: { $expr: { $eq: ['$_id', '$$userId'] } } },
              { $project: { _id: 1, firstName: 1, lastName: 1, username: 1, avaPath: 1 } },
            ],
            as: 'userId',
          },
        },
        { $unwind: { path: '$userId', preserveNullAndEmptyArrays: true } },
      ];

      const hasProjection = options?.projection && Object.keys(options.projection).length > 0;
      if (hasProjection) pipeline.push({ $project: options!.projection! });

      const hasSort = options?.sort && Object.keys(options.sort).length > 0;
      if (hasSort) pipeline.push({ $sort: options!.sort! });
      if (typeof options?.skip === 'number') pipeline.push({ $skip: options.skip });
      pipeline.push({ $limit: options?.limit ?? 50 });

      const docs = await collection.aggregate(pipeline).toArray();
      return docs.map(this.stringifyObjectIds);
    }

    const cursor = collection.find(query, {
      projection: options?.projection,
      sort: options?.sort,
      skip: options?.skip,
      limit: options?.limit ?? 50,
    });

    const docs = await cursor.toArray();
    return docs.map(this.stringifyObjectIds);
  }

  async getDocumentById(dbName: string, collectionName: string, id: string) {
    const client = await this.getClient();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    const doc = await collection.findOne({ _id: new ObjectId(id) });
    return this.stringifyObjectIds(doc);
  }

  async updateDocumentById(dbName: string, collectionName: string, id: string, update: any) {
    const client = await this.getClient();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    const normalized = this.normalizeQuery(update || {});
    // If update contains top-level operators ($set, $unset, etc.), pass through; otherwise wrap into $set
    const hasOperator = normalized && typeof normalized === 'object' && Object.keys(normalized).some(k => k.startsWith('$'));
    const finalUpdate = hasOperator ? normalized : { $set: normalized };
    const res = await collection.updateOne({ _id: new ObjectId(id) }, finalUpdate);
    return { matchedCount: res.matchedCount, modifiedCount: res.modifiedCount, upsertedId: res.upsertedId };
  }

  async deleteDocumentById(dbName: string, collectionName: string, id: string) {
    const client = await this.getClient();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    const res = await collection.deleteOne({ _id: new ObjectId(id) });
    return { deletedCount: res.deletedCount };
  }

  // Вставка одного документа
  async insertOneDocument(dbName: string, collectionName: string, document: any) {
    const client = await this.getClient();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    try {
      // Обрабатываем Extended JSON (если есть _id с $oid, например)
      const processedDoc = this.parseExtendedJson(document);
      
      const result = await collection.insertOne(processedDoc);
      
      return {
        insertedId: result.insertedId.toString(),
        message: 'Документ успешно добавлен'
      };
    } catch (error: any) {
      console.error('Error inserting document:', error);
      
      // Обработка дублирования _id
      if (error.code === 11000) {
        throw new Error(`Документ с таким _id уже существует: ${error.message}`);
      }
      
      throw new Error(`Ошибка при вставке документа: ${error.message}`);
    }
  }

  async *exportCollectionIterator(
    dbName: string,
    collectionName: string,
    queryRaw?: any,
    options?: { limit?: number; sort?: Record<string, 1 | -1>; projection?: Record<string, 0 | 1> },
  ): AsyncGenerator<any> {
    const client = await this.getClient();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    const query = this.normalizeQuery(queryRaw || {});
    const cursor = collection.find(query, {
      projection: options?.projection,
      sort: options?.sort,
      limit: options?.limit,
    });

    for await (const doc of cursor) {
      yield this.stringifyObjectIds(doc);
    }
  }

  async importDocuments(dbName: string, collectionName: string, documents: any[]): Promise<{ insertedCount: number; errors: any[] }> {
    const client = await this.getClient();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    const errors: any[] = [];
    let insertedCount = 0;

    // Процесс каждого документа
    const processedDocs = documents.map((doc, index) => {
      try {
        return this.parseExtendedJson(doc);
      } catch (error) {
        errors.push({ index, error: error.message, document: doc });
        return null;
      }
    }).filter(doc => doc !== null);

    if (processedDocs.length === 0) {
      return { insertedCount: 0, errors };
    }

    try {
      const result = await collection.insertMany(processedDocs, { ordered: false });
      insertedCount = result.insertedCount;
    } catch (error: any) {
      // Обработка частичной вставки (когда некоторые документы вставились, а некоторые нет)
      if (error.writeErrors) {
        insertedCount = processedDocs.length - error.writeErrors.length;
        error.writeErrors.forEach((writeError: any) => {
          errors.push({
            index: writeError.index,
            error: writeError.errmsg,
            document: processedDocs[writeError.index],
          });
        });
      } else {
        throw error;
      }
    }

    return { insertedCount, errors };
  }

  private parseExtendedJson(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;

    // Обработка MongoDB Extended JSON формата
    if (obj.$oid && typeof obj.$oid === 'string') {
      return new ObjectId(obj.$oid);
    }

    if (obj.$date && typeof obj.$date === 'string') {
      return new Date(obj.$date);
    }

    // Рекурсивная обработка массивов
    if (Array.isArray(obj)) {
      return obj.map(item => this.parseExtendedJson(item));
    }

    // Обработка populated полей (объектов с _id и name, без других значимых полей)
    // Это характерно для populated Graph документов
    const keys = Object.keys(obj);
    const hasOnlyIdAndName = keys.length <= 3 && obj._id && (obj.name !== undefined || obj.imgPath !== undefined);
    
    if (hasOnlyIdAndName && !obj.$oid && !obj.$date) {
      // Если _id - это объект с $oid
      if (typeof obj._id === 'object' && obj._id.$oid) {
        return new ObjectId(obj._id.$oid);
      }
      // Если _id - это строка
      if (typeof obj._id === 'string' && /^[a-f\d]{24}$/i.test(obj._id)) {
        return new ObjectId(obj._id);
      }
    }

    // Рекурсивная обработка объектов
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = this.parseExtendedJson(value);
    }
    return result;
  }

  private normalizeQuery(query: any): any {
    if (query == null || typeof query !== 'object') return {};

    const convert = (val: any): any => {
      if (typeof val === 'string' && /^[a-f\d]{24}$/i.test(val)) {
        try {
          return new ObjectId(val);
        } catch {
          return val;
        }
      }
      if (Array.isArray(val)) return val.map(convert);
      if (val && typeof val === 'object') {
        const out: Record<string, any> = {};
        for (const [k, v] of Object.entries(val)) out[k] = convert(v);
        return out;
      }
      return val;
    };

    return convert(query);
  }

  private stringifyObjectIds<T = any>(doc: T): T {
    if (!doc) return doc;
    const replacer = (val: any): any => {
      if (val instanceof ObjectId) return { $oid: val.toHexString() } as any;
      if (val instanceof Date) return { $date: val.toISOString() } as any;
      if (Array.isArray(val)) return val.map(replacer);
      if (val && typeof val === 'object') {
        const out: Record<string, any> = {};
        for (const [k, v] of Object.entries(val)) out[k] = replacer(v);
        return out as any;
      }
      return val;
    };
    return replacer(doc);
  }
}



