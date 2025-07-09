# Настройка соглашения об авторских правах для Telegram бота

## 📋 Описание

Система соглашения об авторских правах для Telegram бота GraphON. Пользователи должны принять соглашение перед авторизацией.

## 🔧 Настройка

### 1. Переменные окружения

Добавьте в ваш `.env` файл:

```env
# Путь к PDF файлу соглашения об авторских правах
COPYRIGHT_AGREEMENT_PDF_PATH=./documents/copyright_agreement.pdf
```

### 2. PDF файл соглашения

1. Создайте папку `documents` в корне проекта
2. Поместите PDF файл соглашения об авторских правах в папку `documents/`
3. Назовите файл `copyright_agreement.pdf`

### 3. Структура папок

```
GraphON-ServerBot/
├── documents/
│   └── copyright_agreement.pdf
├── src/
│   ├── config/
│   │   └── copyright.config.ts
│   ├── telegram/
│   │   ├── telegram.service.ts
│   │   └── telegram.module.ts
│   └── user/
│       ├── user.model.ts
│       └── user.service.ts
└── COPYRIGHT_AGREEMENT_SETUP.md
```

## 🔄 Логика работы

### Поток авторизации:

1. **Пользователь нажимает "Авторизоваться"**
2. **Проверка соглашения:**
   - Если соглашение уже принято → показывается форма авторизации
   - Если соглашение не принято → показывается запрос на принятие

3. **Просмотр соглашения:**
   - Пользователь нажимает "📄 Просмотреть соглашение"
   - Бот отправляет PDF файл с кнопкой "✅ Принять соглашение"

4. **Принятие соглашения:**
   - Пользователь нажимает "✅ Принять соглашение"
   - Система сохраняет принятие в БД
   - Показывается кнопка "🔐 Продолжить авторизацию"

5. **Авторизация:**
   - Пользователь нажимает "🔐 Продолжить авторизацию"
   - Показывается форма авторизации Telegram

## 📊 База данных

### Новые поля в UserModel:

```typescript
// Поля для соглашения об авторских правах
@prop({ default: false })
copyrightAgreementAccepted: boolean

@prop()
copyrightAgreementAcceptedAt: Date
```

### Описание полей:

- `copyrightAgreementAccepted` - флаг принятия соглашения (по умолчанию false)
- `copyrightAgreementAcceptedAt` - дата и время принятия соглашения

## 🛠 API методы

### UserService:

```typescript
// Поиск пользователя по Telegram ID
async findByTelegramId(telegramId: number)

// Принятие соглашения об авторских правах
async acceptCopyrightAgreement(telegramId: number)

// Проверка принятия соглашения
async hasAcceptedCopyrightAgreement(telegramId: number): Promise<boolean>
```

## 🔧 Конфигурация

### copyright.config.ts:

```typescript
export const getCopyrightConfig = (configService: ConfigService) => ({
  pdfPath: configService.get('COPYRIGHT_AGREEMENT_PDF_PATH') || './documents/copyright_agreement.pdf',
});
```

## 📱 Telegram интерфейс

### Кнопки и сообщения:

1. **Запрос на принятие соглашения:**
   ```
   📋 Соглашение об авторских правах
   
   Для продолжения необходимо принять соглашение об авторских правах.
   
   Пожалуйста, ознакомьтесь с документом и примите условия.
   
   [📄 Просмотреть соглашение]
   ```

2. **Отправка PDF:**
   ```
   📋 Соглашение об авторских правах
   
   Пожалуйста, внимательно ознакомьтесь с документом выше.
   
   После ознакомления нажмите кнопку "Принять соглашение".
   
   [✅ Принять соглашение]
   ```

3. **Подтверждение принятия:**
   ```
   ✅ Соглашение принято!
   
   Спасибо за принятие соглашения об авторских правах.
   
   Теперь вы можете продолжить авторизацию.
   
   [🔐 Продолжить авторизацию]
   ```

## 🚀 Запуск

1. Убедитесь, что PDF файл находится в папке `documents/`
2. Проверьте переменную окружения `COPYRIGHT_AGREEMENT_PDF_PATH`
3. Запустите сервер: `npm run start:dev`

## 🔍 Тестирование

1. Отправьте `/auth` в Telegram бот
2. Если соглашение не принято, появится запрос на принятие
3. Нажмите "📄 Просмотреть соглашение"
4. Нажмите "✅ Принять соглашение"
5. Нажмите "🔐 Продолжить авторизацию"
6. Должна появиться форма авторизации Telegram

## ⚠️ Важные моменты

1. **PDF файл должен существовать** по указанному пути
2. **Права доступа** - убедитесь, что сервер может читать файл
3. **Размер файла** - Telegram ограничивает размер файлов до 50MB
4. **Формат** - рекомендуется PDF для лучшей совместимости

## 🐛 Отладка

### Логи:

```typescript
console.log(`User ${telegramId} accepted copyright agreement at ${now}`);
console.error('Error sending copyright agreement:', error);
console.error('Error accepting copyright agreement:', error);
```

### Проверка в БД:

```javascript
// MongoDB
db.users.findOne({ telegramId: 123456789 })

// Проверка полей
{
  copyrightAgreementAccepted: true,
  copyrightAgreementAcceptedAt: ISODate("2024-01-01T12:00:00.000Z")
}
``` 