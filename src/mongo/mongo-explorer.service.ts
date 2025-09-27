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
    const collections = await db.listCollections(undefined, { nameOnly: true }).toArray();
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

    // Special populate for User.selectedGraphId → Graph document
    if (collectionName === 'User') {
      const pipeline: any[] = [
        { $match: query },
        {
          $lookup: {
            from: 'Graph',
            localField: 'selectedGraphId',
            foreignField: '_id',
            as: 'selectedGraphId',
          },
        },
        { $unwind: { path: '$selectedGraphId', preserveNullAndEmptyArrays: true } },
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



