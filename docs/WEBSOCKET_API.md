# WebSocket API для real-time уведомлений

## Подключение

Клиент должен использовать **Socket.IO клиент** (не чистый WebSocket).

### Установка клиента

```bash
npm install socket.io-client
```

### Пример подключения (JavaScript/TypeScript)

```javascript
import { io } from 'socket.io-client';

// Подключение к WebSocket серверу
const socket = io('http://localhost:4200/ws', {
  query: {
    token: 'YOUR_JWT_TOKEN', // JWT токен из /auth/exchange-code или /auth/dev-login-as
  },
  transports: ['websocket', 'polling'], // Предпочитаем WebSocket, fallback на polling
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
});

// Обработка подключения
socket.on('connect', () => {
  console.log('✅ Connected to WebSocket server');
});

socket.on('connected', (data) => {
  console.log('Server confirmed connection:', data);
  // data.userId - ваш userId из токена
});

// Обработка событий отношений
socket.on('relationship_event', (event) => {
  console.log('Relationship event received:', event);
  
  // event.type: 'friend_request_sent' | 'friend_request_accepted' | 'friend_request_declined' | 'friend_removed'
  // event.data: { fromUserId, toUserId, timestamp }
  
  switch (event.type) {
    case 'friend_request_sent':
      // Пользователь отправил вам заявку в друзья
      console.log(`User ${event.data.fromUserId} sent you a friend request`);
      break;
      
    case 'friend_request_accepted':
      // Ваша заявка в друзья была принята
      console.log(`User ${event.data.fromUserId} accepted your friend request`);
      break;
      
    case 'friend_request_declined':
      // Ваша заявка в друзья была отклонена
      console.log(`User ${event.data.fromUserId} declined your friend request`);
      break;
      
    case 'friend_removed':
      // Вас удалили из друзей
      console.log(`User ${event.data.fromUserId} removed you from friends`);
      break;
  }
});

// Обработка ошибок
socket.on('error', (error) => {
  console.error('WebSocket error:', error);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});

// Отключение при необходимости
// socket.disconnect();
```

### React Hook пример

```typescript
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export function useWebSocket(token: string | null) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) return;

    const newSocket = io('http://localhost:4200/ws', {
      query: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
    });

    newSocket.on('connect', () => {
      setConnected(true);
      console.log('WebSocket connected');
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
      console.log('WebSocket disconnected');
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [token]);

  return { socket, connected };
}

// Использование в компоненте
function MyComponent() {
  const { token } = useAuth(); // Ваш хук авторизации
  const { socket, connected } = useWebSocket(token);

  useEffect(() => {
    if (!socket) return;

    const handleRelationshipEvent = (event: any) => {
      // Обновить UI, показать уведомление и т.д.
      console.log('Relationship event:', event);
    };

    socket.on('relationship_event', handleRelationshipEvent);

    return () => {
      socket.off('relationship_event', handleRelationshipEvent);
    };
  }, [socket]);

  return <div>WebSocket: {connected ? '✅ Connected' : '❌ Disconnected'}</div>;
}
```

## Формат событий

Все события приходят в формате:

```typescript
{
  type: 'friend_request_sent' | 'friend_request_accepted' | 'friend_request_declined' | 'friend_removed',
  data: {
    fromUserId: string,  // ID пользователя, который выполнил действие
    toUserId: string,    // ID пользователя, который должен получить уведомление (ваш userId)
    timestamp?: string   // ISO timestamp события
  }
}
```

### События

#### `friend_request_sent`
Пользователь отправил вам заявку в друзья.
- `fromUserId`: ID пользователя, который отправил заявку
- `toUserId`: ваш ID

#### `friend_request_accepted`
Ваша заявка в друзья была принята.
- `fromUserId`: ID пользователя, который принял заявку
- `toUserId`: ваш ID

#### `friend_request_declined`
Ваша заявка в друзья была отклонена.
- `fromUserId`: ID пользователя, который отклонил заявку
- `toUserId`: ваш ID

#### `friend_removed`
Вас удалили из друзей.
- `fromUserId`: ID пользователя, который удалил вас
- `toUserId`: ваш ID

## Важные замечания

1. **Токен обязателен**: Без валидного JWT токена подключение будет отклонено
2. **Автоматическое переподключение**: Socket.IO клиент автоматически пытается переподключиться при обрыве соединения
3. **Множественные соединения**: Если пользователь открыл несколько вкладок, все получат события
4. **События только после сохранения**: Сервер отправляет события только после успешного сохранения в БД
5. **Офлайн режим**: Если пользователь не онлайн, событие теряется (данные синхронизируются при следующей загрузке страницы)

## Тестирование

Для тестирования можно использовать [Socket.IO клиент в браузере](https://socket.io/docs/v4/client-api/) или инструменты типа [Postman](https://www.postman.com/) с WebSocket поддержкой.

### Пример теста в браузере (консоль)

```javascript
// Получите токен через /api/auth/exchange-code или /api/auth/dev-login-as
const token = 'YOUR_JWT_TOKEN';

const socket = io('http://localhost:4200/ws', {
  query: { token },
  transports: ['websocket'],
});

socket.on('relationship_event', (event) => {
  console.log('Event:', event);
});
```

