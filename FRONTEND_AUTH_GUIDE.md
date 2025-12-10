# Инструкция для фронтенда: Обработка авторизации через Telegram

## Проблема

После редиректа с Telegram пользователь видит "Redirecting...", но не авторизуется.

## Что происходит на бэкенде

1. Бэкенд получает данные от Telegram и валидирует их
2. Создается одноразовый `authCode` (действителен 5 минут)
3. Токен сохраняется в HTTP-only cookie (для веб-приложений)
4. Редирект на: `${CLIENT_URL}/profile?code=${authCode}`

## Что нужно сделать на фронтенде

### 1. На странице `/profile` (или там, куда редиректит бэкенд)

**Извлечь `code` из URL и обменять на токен:**

```typescript
// Пример для React/Next.js
import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation'; // или useRouter из react-router

function ProfilePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get('code');

  useEffect(() => {
    if (code) {
      exchangeCodeForToken(code);
    }
  }, [code]);

  async function exchangeCodeForToken(code: string) {
    try {
      const response = await fetch('/api/auth/exchange-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
        credentials: 'include', // Важно! Для работы с cookies
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to exchange code');
      }

      const data = await response.json();
      const { accessToken } = data;

      // Сохранить токен
      // Вариант 1: localStorage (для мобильных приложений)
      localStorage.setItem('accessToken', accessToken);

      // Вариант 2: sessionStorage (для веб-приложений)
      // sessionStorage.setItem('accessToken', accessToken);

      // Вариант 3: Если используете cookie (но HTTP-only cookie уже установлен бэкендом)
      // Просто используйте токен из ответа для последующих запросов

      // Убрать code из URL (опционально, для безопасности)
      router.replace('/profile'); // или window.location.replace('/profile')

      // Обновить состояние авторизации в приложении
      // Например, вызвать функцию для обновления контекста/стора авторизации

    } catch (error) {
      console.error('Error exchanging code:', error);
      // Показать ошибку пользователю
    }
  }

  return <div>Profile page...</div>;
}
```

### 2. Использование токена в последующих запросах

**Вариант A: Из localStorage/sessionStorage (рекомендуется для мобильных приложений)**

```typescript
async function makeAuthenticatedRequest(
  url: string,
  options: RequestInit = {},
) {
  const token = localStorage.getItem('accessToken');

  if (!token) {
    throw new Error('No access token found');
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  return response;
}
```

**Вариант B: Из HTTP-only cookie (для веб-приложений)**

Если бэкенд установил HTTP-only cookie, она автоматически отправляется с каждым запросом.
Но для мобильных приложений нужно использовать токен из ответа `/exchange-code`.

```typescript
async function makeAuthenticatedRequest(
  url: string,
  options: RequestInit = {},
) {
  const response = await fetch(url, {
    ...options,
    credentials: 'include', // Важно! Для отправки cookies
    headers: {
      ...options.headers,
      'Content-Type': 'application/json',
    },
  });

  return response;
}
```

### 3. Проверка текущей реализации

**Проверьте следующие моменты:**

1. ✅ **Извлечение кода из URL:**

   ```typescript
   // Правильно:
   const code = new URLSearchParams(window.location.search).get('code');
   // или
   const code = searchParams.get('code'); // Next.js
   ```

2. ✅ **Правильный метод и тело запроса:**

   ```typescript
   // Правильно:
   POST /api/auth/exchange-code
   Body: { "code": "ваш_код_здесь" }
   Headers: { "Content-Type": "application/json" }
   ```

3. ✅ **Обработка ответа:**

   ```typescript
   // Правильно:
   const { accessToken } = await response.json();
   ```

4. ✅ **Сохранение токена:**

   ```typescript
   // Правильно:
   localStorage.setItem('accessToken', accessToken);
   // или
   sessionStorage.setItem('accessToken', accessToken);
   ```

5. ✅ **Использование токена в запросах:**
   ```typescript
   // Правильно:
   headers: { 'Authorization': `Bearer ${token}` }
   ```

### 4. Отладка

**Если запрос на `/exchange-code` не приходит на бэкенд:**

1. Проверьте консоль браузера на наличие ошибок
2. Проверьте Network tab в DevTools:
   - Отправляется ли запрос?
   - Какой статус ответа?
   - Что в теле ответа?

**Если запрос приходит, но токен не сохраняется:**

1. Проверьте, что токен извлекается из ответа: `const { accessToken } = await response.json()`
2. Проверьте, что токен сохраняется: `localStorage.getItem('accessToken')`
3. Проверьте, что токен используется в последующих запросах

**Проверка кода вручную (для отладки):**

```bash
# Проверить, существует ли код (GET запрос)
GET /api/auth/check-code?code=ВАШ_КОД

# Ответ:
{
  "valid": true,
  "expiresAt": "2025-01-10T12:00:00.000Z",
  "expiresIn": "300 seconds"
}
```

### 5. Типичные ошибки

❌ **Неправильно:**

```typescript
// Неправильный метод
GET /api/auth/exchange-code?code=...

// Неправильное тело
POST /api/auth/exchange-code
Body: "code=..."

// Неправильное извлечение токена
const token = await response.text();
```

✅ **Правильно:**

```typescript
// Правильный метод
POST /api/auth/exchange-code
Body: { "code": "..." }

// Правильное извлечение токена
const { accessToken } = await response.json();
```

## Пример полной реализации (React)

```typescript
// hooks/useAuth.ts
import { useState, useEffect } from 'react';

export function useAuth() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Загрузить токен при монтировании
    const savedToken = localStorage.getItem('accessToken');
    setToken(savedToken);
    setLoading(false);

    // Проверить code в URL
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (code) {
      exchangeCode(code);
    }
  }, []);

  async function exchangeCode(code: string) {
    try {
      const response = await fetch('/api/auth/exchange-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to exchange code');
      }

      const { accessToken } = await response.json();
      localStorage.setItem('accessToken', accessToken);
      setToken(accessToken);

      // Убрать code из URL
      window.history.replaceState({}, '', window.location.pathname);
    } catch (error) {
      console.error('Auth error:', error);
    }
  }

  return { token, loading, exchangeCode };
}
```

## Резюме

**Что нужно проверить на фронтенде:**

1. ✅ Код извлекается из URL: `?code=...`
2. ✅ Отправляется POST запрос на `/api/auth/exchange-code` с телом `{ code: "..." }`
3. ✅ Токен извлекается из ответа: `const { accessToken } = await response.json()`
4. ✅ Токен сохраняется: `localStorage.setItem('accessToken', accessToken)`
5. ✅ Токен используется в запросах: `Authorization: Bearer ${token}`
6. ✅ После обмена кода, `code` удаляется из URL

Если все это уже реализовано, проверьте логи на бэкенде - они покажут, приходит ли запрос и что в нем.
