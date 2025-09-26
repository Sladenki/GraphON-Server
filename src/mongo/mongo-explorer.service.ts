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
    return collections.map((c) => ({ name: c.name, type: (c as any).type ?? 'collection' }));
  }

  async findDocuments(dbName: string, collectionName: string, queryRaw?: any, options?: FindOptions) {
    const client = await this.getClient();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    const query = this.normalizeQuery(queryRaw || {});

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



