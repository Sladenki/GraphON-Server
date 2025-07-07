# Настройка Redis для GraphON ServerBot

## Установка Redis

### Windows

1. Скачайте Redis для Windows с [GitHub](https://github.com/microsoftarchive/redis/releases)
2. Установите и запустите Redis сервер
3. Или используйте Docker:
   ```bash
   docker run -d -p 6379:6379 redis:alpine
   ```

### Linux/Mac

```bash
# Ubuntu/Debian
sudo apt-get install redis-server

# macOS
brew install redis
brew services start redis
```

## Переменные окружения

Добавьте следующие переменные в ваш `.env` файл:

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_TTL=3600
```

## Функциональность кэширования

### Кэшируемые операции:

1. **getGraphById** - кэш на 1 час
2. **getParentGraphs** - кэш на 15-30 минут (зависит от авторизации)
3. **getAllChildrenGraphs** - кэш на 15-30 минут (зависит от авторизации)
4. **getGlobalGraphs** - кэш на 1 час
5. **getTopicGraphsWithMain** - кэш на 30 минут

### Автоматическая инвалидация кэша:

- При создании нового графа
- При создании глобального графа
- При создании графа-тематики

### Ключи кэша:

- Формат: `graph:{method}:{params}`
- Пример: `graph:getGraphById:{"id":"507f1f77bcf86cd799439011"}`

## Мониторинг

Для мониторинга Redis можно использовать:

```bash
# Подключение к Redis CLI
redis-cli

# Просмотр всех ключей
KEYS *

# Просмотр информации о памяти
INFO memory

# Очистка всех данных
FLUSHALL
```

## Производительность

Кэширование значительно ускоряет:

- Получение списков графов
- Получение отдельных графов
- Запросы с пагинацией

Время отклика сокращается с ~100-500ms до ~1-10ms для кэшированных данных.
