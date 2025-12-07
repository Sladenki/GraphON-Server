# Руководство по миграции с @m8a/nestjs-typegoose на @nestjs/mongoose

## 📋 Обзор изменений

### 1. **Установка пакетов**

**Удалить:**

```bash
npm uninstall @m8a/nestjs-typegoose @typegoose/typegoose
```

**Установить:**

```bash
npm install @nestjs/mongoose mongoose
```

---

## 2. **Изменения в моделях (9 файлов)**

### Было (Typegoose):

```typescript
import { modelOptions, prop, Ref } from '@typegoose/typegoose';
import { Base, TimeStamps } from '@typegoose/typegoose/lib/defaultClasses';

export interface UserModel extends Base {}

@modelOptions({
  schemaOptions: {
    versionKey: false,
    timestamps: { createdAt: true, updatedAt: false },
  },
})
export class UserModel extends TimeStamps {
  @prop({ enum: ['create', 'admin', 'editor'], default: 'user' })
  role: 'create' | 'admin' | 'editor' | 'user';

  @prop({ ref: () => GraphModel, index: true })
  selectedGraphId: Ref<GraphModel>;

  @prop()
  firstName: string;
}
```

### Стало (Mongoose):

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { GraphModel, GraphSchema } from 'src/graph/graph.model';

export type UserDocument = UserModel & Document;

@Schema({
  collection: 'User',
  versionKey: false,
  timestamps: { createdAt: true, updatedAt: false },
})
export class UserModel {
  _id: Types.ObjectId;

  @Prop({
    enum: ['create', 'admin', 'editor', 'user'],
    default: 'user',
  })
  role: 'create' | 'admin' | 'editor' | 'user';

  @Prop({
    type: Types.ObjectId,
    ref: 'GraphModel',
    index: true,
  })
  selectedGraphId: Types.ObjectId;

  @Prop()
  firstName: string;

  createdAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(UserModel);
```

### Ключевые изменения в моделях:

- ❌ Убрать `@modelOptions` → ✅ Использовать `@Schema({ ... })`
- ❌ Убрать `extends Base` и `extends TimeStamps` → ✅ Добавить `_id: Types.ObjectId` и поля `createdAt`/`updatedAt` вручную
- ❌ `@prop({ ref: () => GraphModel })` → ✅ `@Prop({ type: Types.ObjectId, ref: 'GraphModel' })`
- ❌ `Ref<GraphModel>` → ✅ `Types.ObjectId`
- ❌ `@index({ user: 1, graph: 1 })` → ✅ `UserSchema.index({ user: 1, graph: 1 })`
- ✅ Добавить `export const ModelSchema = SchemaFactory.createForClass(Model)`
- ✅ Добавить `export type ModelDocument = Model & Document`

**Файлы для изменения:**

- `src/user/user.model.ts`
- `src/graph/graph.model.ts`
- `src/event/event.model.ts`
- `src/eventRegs/eventRegs.model.ts`
- `src/graphSubs/graphSubs.model.ts`
- `src/schedule/schedule.model.ts`
- `src/analytics/user-activity.model.ts`
- `src/downloads/app-download.model.ts`
- `src/requestsConnectedGraph/requests-connected-graph.model.ts`

---

## 3. **Изменения в конфигурации MongoDB**

### `src/config/mongo.config.ts`

**Было:**

```typescript
import { TypegooseModuleOptions } from '@m8a/nestjs-typegoose';

export const getMongoConfig = async (
  ConfigService: ConfigService,
): Promise<TypegooseModuleOptions> => ({
  uri: ConfigService.get('MONGO_URL'),
});
```

**Стало:**

```typescript
import { MongooseModuleOptions } from '@nestjs/mongoose';

export const getMongoConfig = async (
  ConfigService: ConfigService,
): Promise<MongooseModuleOptions> => ({
  uri: ConfigService.get('MONGO_URL'),
});
```

---

## 4. **Изменения в app.module.ts**

**Было:**

```typescript
import { TypegooseModule } from '@m8a/nestjs-typegoose';

TypegooseModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: getMongoConfig,
}),
```

**Стало:**

```typescript
import { MongooseModule } from '@nestjs/mongoose';

MongooseModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: getMongoConfig,
}),
```

---

## 5. **Изменения во всех модулях (9+ файлов)**

### `src/user/user.module.ts` (пример)

**Было:**

```typescript
import { TypegooseModule } from '@m8a/nestjs-typegoose';

TypegooseModule.forFeature([
  {
    typegooseClass: UserModel,
    schemaOptions: { collection: 'User' },
  },
  {
    typegooseClass: GraphModel,
    schemaOptions: { collection: 'Graph' },
  },
]),
```

**Стало:**

```typescript
import { MongooseModule } from '@nestjs/mongoose';

MongooseModule.forFeature([
  { name: UserModel.name, schema: UserSchema },
  { name: GraphModel.name, schema: GraphSchema },
]),
```

**Файлы для изменения:**

- `src/user/user.module.ts`
- `src/graph/graph.module.ts`
- `src/event/event.module.ts`
- `src/eventRegs/eventRegs.module.ts`
- `src/graphSubs/graphSubs.module.ts`
- `src/schedule/schedule.module.ts`
- `src/analytics/analytics.module.ts`
- `src/downloads/downloads.module.ts`
- `src/auth/auth.module.ts`
- `src/admin/admin.module.ts`
- `src/requestsConnectedGraph/requests-connected-graph.module.ts`

---

## 6. **Изменения во всех сервисах (14 файлов)**

### `src/user/user.service.ts` (пример)

**Было:**

```typescript
import { ModelType } from '@typegoose/typegoose/lib/types';
import { InjectModel } from '@m8a/nestjs-typegoose';

@InjectModel(UserModel) private readonly UserModel: ModelType<UserModel>
```

**Стало:**

```typescript
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

@InjectModel(UserModel.name) private readonly userModel: Model<UserDocument>
```

**Важно:**

- `ModelType<UserModel>` → `Model<UserDocument>`
- `UserModel` (класс) → `UserModel.name` (строка)
- Переименовать переменные: `UserModel` → `userModel` (чтобы не конфликтовало с классом)

**Файлы для изменения:**

- `src/user/user.service.ts`
- `src/graph/graph.service.ts`
- `src/event/event.service.ts`
- `src/eventRegs/eventRegs.service.ts`
- `src/graphSubs/graphSubs.service.ts`
- `src/schedule/schedule.service.ts`
- `src/analytics/analytics.service.ts`
- `src/downloads/downloads.service.ts`
- `src/requestsConnectedGraph/requests-connected-graph.service.ts`
- `src/admin/admin.service.ts`

---

## 7. **Изменения в контроллерах (4 файла)**

### `src/user/user.controller.ts` (пример)

**Было:**

```typescript
import { InjectModel } from '@m8a/nestjs-typegoose';
import { ModelType } from '@typegoose/typegoose/lib/types';

@InjectModel(UserModel) private readonly UserModel: ModelType<UserModel>
```

**Стало:**

```typescript
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@InjectModel(UserModel.name) private readonly userModel: Model<UserDocument>
```

**Файлы для изменения:**

- `src/user/user.controller.ts`
- `src/event/event.controller.ts`
- `src/auth/auth.controller.ts`

---

## 8. **Изменения в стратегиях**

### `src/user/jwt.strategy.ts`

**Было:**

```typescript
import { InjectModel } from '@m8a/nestjs-typegoose';
import { ModelType } from '@typegoose/typegoose/lib/types';

@InjectModel(UserModel) private readonly UserModel: ModelType<UserModel>
```

**Стало:**

```typescript
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@InjectModel(UserModel.name) private readonly userModel: Model<UserDocument>
```

---

## 9. **Изменения в использовании моделей**

### Запросы к БД остаются теми же, но типы меняются:

**Было:**

```typescript
const user = await this.UserModel.findOne({ _id: userId });
const users = await this.UserModel.find({ role: 'user' });
await this.UserModel.create({ firstName: 'John' });
```

**Стало:**

```typescript
const user = await this.userModel.findOne({ _id: userId });
const users = await this.userModel.find({ role: 'user' });
await this.userModel.create({ firstName: 'John' });
```

**Важно:** Методы Mongoose остаются теми же, но нужно:

- Использовать `userModel` вместо `UserModel` (переименованная переменная)
- Типы результатов: `UserDocument` вместо `UserModel`

---

## 10. **Обработка Ref типов**

**Было:**

```typescript
@prop({ ref: () => GraphModel })
selectedGraphId: Ref<GraphModel>;

// В коде:
user.selectedGraphId // может быть ObjectId или GraphModel (после populate)
```

**Стало:**

```typescript
@Prop({ type: Types.ObjectId, ref: 'GraphModel' })
selectedGraphId: Types.ObjectId;

// В коде:
user.selectedGraphId // всегда ObjectId, нужно populate для получения GraphModel
```

---

## 11. **Проверка типов TypeScript**

После миграции нужно будет:

- Исправить все ошибки типов, связанные с `ModelType` → `Model`
- Обновить типы для `Ref<T>` → `Types.ObjectId`
- Проверить все `as any` и `@ts-ignore` - возможно, некоторые больше не нужны

---

## 📊 Итоговая статистика

- **Модели:** 9 файлов
- **Модули:** 11 файлов
- **Сервисы:** 10 файлов
- **Контроллеры:** 3 файла
- **Стратегии:** 1 файл
- **Конфигурация:** 1 файл
- **App Module:** 1 файл

**Всего: ~36 файлов для изменения**

---

## ⚠️ Потенциальные проблемы

1. **Ref типы:** Typegoose автоматически обрабатывает `Ref<T>`, в Mongoose нужно явно указывать `Types.ObjectId`
2. **Populate:** Синтаксис может немного отличаться
3. **Timestamps:** В Typegoose через `TimeStamps`, в Mongoose через опции схемы
4. **Индексы:** В Typegoose через декоратор `@index`, в Mongoose через `Schema.index()`
5. **Валидация:** Может потребоваться дополнительная настройка

---

## ✅ Рекомендации

1. Создайте отдельную ветку для миграции
2. Мигрируйте по одному модулю за раз
3. Тестируйте после каждого модуля
4. Используйте TypeScript строгий режим для выявления ошибок
5. Обновите все тесты, если они есть

