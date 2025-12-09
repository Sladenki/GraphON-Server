import { Injectable, OnModuleInit, OnModuleDestroy, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf, Context } from 'telegraf';
import * as fs from 'fs';
import * as path from 'path';
import { UserService } from 'src/user/user.service';
import { getCopyrightConfig } from 'src/config/copyright.config';

@Injectable()
export class TelegramBotService implements OnModuleInit, OnApplicationBootstrap, OnModuleDestroy {
  public bot: Telegraf;
  private WEB_APP_URL: string;
  private SERVER_URL: string;
  private SUPPORT_URL: string;
  private COPYRIGHT_PDF_PATH: string;
  private COPYRIGHT_PDF_PATHS: string[];

  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
  ) {
    // Подключаем бота
    const token = this.configService.get<string>('BOT_TOKEN');
    
    if (!token) {
      console.error('❌ BOT_TOKEN is not set in environment variables!');
      console.error('   Please set BOT_TOKEN in your .env file');
      throw new Error('BOT_TOKEN is required');
    }
    
    // Проверяем формат токена
    if (!token.match(/^\d+:[A-Za-z0-9_-]+$/)) {
      console.error('❌ Invalid BOT_TOKEN format!');
      console.error('   Expected format: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz');
      throw new Error('Invalid BOT_TOKEN format');
    }
    
    this.bot = new Telegraf(token, {
      // Настройки для лучшей диагностики
      handlerTimeout: 30000,
    });
    console.log('✅ Telegram bot instance created');

    // Ссылка на приложение 
    const webAppString = this.configService.get<string>('WEB_APP_URL');
    this.WEB_APP_URL = webAppString

    // Ссылка на авторизацию
    const authLoginString = this.configService.get<string>('SERVER_URL');
    this.SERVER_URL = authLoginString
    
    // Ссылка на поддержку
    const supportUrlString = this.configService.get<string>('SUPPORT_URL');
    this.SUPPORT_URL = supportUrlString

    // Пути к PDF файлам соглашения
    const copyrightConfig = getCopyrightConfig(this.configService);
    this.COPYRIGHT_PDF_PATH = copyrightConfig.pdfPath; // Для обратной совместимости
    this.COPYRIGHT_PDF_PATHS = copyrightConfig.pdfPaths; // Массив файлов
  }

  async onModuleInit() {
    // Настраиваем команды и обработчики
    await this.setupBotCommands();
    this.handleStartCommand();
    this.handleAuthCommand();
    this.handleSupportCommand();
    this.handleCallbackQueries();
    // Запуск бота перенесен в onApplicationBootstrap, чтобы не блокировать запуск сервера
  }

  async onApplicationBootstrap() {
    // Запускаем бота после того, как сервер запущен
    console.log('🤖 Starting Telegram bot...');
    
    // Добавляем обработчики событий бота для диагностики
    this.bot.catch((err, ctx) => {
      console.error('❌ Telegram bot error:', err);
    });
    
    // Проверяем токен через Telegram API перед запуском
    const token = this.configService.get<string>('BOT_TOKEN');
    try {
      console.log('🔍 Verifying bot token...');
      const testResponse = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const testData = await testResponse.json();
      
      if (!testData.ok) {
        console.error('❌ Invalid bot token!');
        console.error('   Telegram API error:', testData.description);
        return;
      }
      
      console.log(`✅ Bot verified: @${testData.result.username} (${testData.result.first_name})`);
    } catch (error) {
      console.error('❌ Failed to verify bot token:', error.message);
      console.error('   Check your internet connection and BOT_TOKEN');
      return;
    }
    
    // Проверяем, не установлен ли webhook (это может блокировать launch)
    try {
      console.log('🔍 Checking for existing webhook...');
      const webhookInfo = await this.bot.telegram.getWebhookInfo();
      if (webhookInfo.url) {
        console.log(`⚠️  Webhook is set: ${webhookInfo.url}`);
        console.log('   Deleting webhook to enable polling...');
        await this.bot.telegram.deleteWebhook({ drop_pending_updates: true });
        console.log('✅ Webhook deleted');
      } else {
        console.log('✅ No webhook found, using polling');
      }
    } catch (error) {
      console.error('⚠️  Error checking webhook:', error.message);
    }
    
    // Запускаем бота БЕЗ await, чтобы не блокировать выполнение
    // bot.launch() в polling режиме блокирует выполнение - это нормально
    console.log('🚀 Launching bot with polling...');
    console.log('   Note: bot.launch() will run continuously in the background');
    
    // Запускаем бота в фоне (не блокируя выполнение)
    this.bot.launch({
      dropPendingUpdates: true,
    })
      .then(() => {
        // Этот код не выполнится, пока бот работает (это нормально)
        console.log('✅ Telegram bot started successfully');
      })
      .catch((error) => {
        console.error('❌ Error starting Telegram bot:');
        console.error('   Message:', error.message);
        if (error.response) {
          console.error('   Telegram API response:', JSON.stringify(error.response, null, 2));
        }
        if (error.code) {
          console.error('   Error code:', error.code);
        }
        if (error.description) {
          console.error('   Description:', error.description);
        }
      });
    
    // Проверяем, что бот запустился через небольшую задержку
    setTimeout(async () => {
      try {
        // Пробуем получить информацию о боте через API
        const botInfo = await this.bot.telegram.getMe();
        console.log('✅ Bot is running and responding');
        console.log(`   Bot: @${botInfo.username} (${botInfo.first_name})`);
      } catch (error) {
        console.error('⚠️  Bot might not be running:', error.message);
      }
    }, 2000);
    
    // Обработка graceful shutdown
    process.once('SIGINT', () => {
      console.log('🛑 Stopping bot...');
      this.bot.stop('SIGINT');
    });
    process.once('SIGTERM', () => {
      console.log('🛑 Stopping bot...');
      this.bot.stop('SIGTERM');
    });
  }

  async onModuleDestroy() {
    await this.bot.stop();
  }

  // Метод для получения профиля пользователя
  async getUserProfilePhotos(id: number) {
    return await this.bot.telegram.getUserProfilePhotos(id);
  }

  // Настройка команд бота (отображаются в меню)
  async setupBotCommands() {
    try {
      await this.bot.telegram.setMyCommands([
        {
          command: 'start',
          description: '🌟 Главное меню'
        },
        {
          command: 'auth',
          description: '🔐 Авторизация'
        },
        {
          command: 'support',
          description: '🛠 Техподдержка'
        }
      ]);
    } catch (error) {
      console.error('Error setting bot commands:', error);
    }
  }

  // Метод для обработки команды /start
  handleStartCommand() {
    this.bot.command('start', async (ctx: Context) => {
      const chatId = ctx.chat.id;
      const parameter = (ctx.message as any).text?.split(' ')[1]?.trim(); // Получаем параметр после /start
      
      // Если есть параметр "auth", сразу показываем форму авторизации
      if (parameter === 'auth') {
        await this.sendAuthMessage(chatId);
        return;
      }

      // Обычное приветствие без параметров
      await ctx.reply(
        '👋 *Добро пожаловать в GraphON!*\n\n' +
        'Ваш личный гид по мероприятиям.\n\n', 
        {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '🌐 Открыть приложение',
                web_app: {
                  url: this.WEB_APP_URL,
                },
              },
            ],        
            [
              {
                text: '📢 Telegram-канал',
                url: 'https://t.me/graph_ON', 
              },
            ],
          ],
        },
      });
    });
  }

  // Метод для обработки команды /auth
  handleAuthCommand() {
    this.bot.command('auth', async (ctx: Context) => {
      const chatId = ctx.chat.id;
      await this.sendAuthMessage(chatId);
    });
  }

  // Метод для обработки команды /support
  handleSupportCommand() {
    this.bot.command('support', async (ctx: Context) => {
      const chatId = ctx.chat.id;
      await this.sendSupportMessage(chatId);
    });
  }

  // Обработка callback запросов (нажатия на кнопки)
  handleCallbackQueries() {
    this.bot.action('show_copyright_agreement', async (ctx: Context) => {
      const chatId = ctx.chat.id;
      await this.sendCopyrightAgreement(chatId);
      await ctx.answerCbQuery();
    });

    this.bot.action('accept_copyright_agreement', async (ctx: Context) => {
      const chatId = ctx.chat.id;
      const telegramId = ctx.from.id;
      await this.acceptCopyrightAgreement(chatId, telegramId);
      await ctx.answerCbQuery();
    });

    this.bot.action('proceed_to_auth', async (ctx: Context) => {
      const chatId = ctx.chat.id;
      await this.sendAuthMessage(chatId);
      await ctx.answerCbQuery();
    });
  }

  // Отдельный метод для отправки сообщения об авторизации
  async sendAuthMessage(chatId: number) {
    try {
      // Проверяем, принял ли пользователь соглашение
      const user = await this.userService.findByTelegramId(chatId);
      
      // Детальная диагностика
      console.log(`[sendAuthMessage] chatId=${chatId}, user=${user ? 'found' : 'not found'}`);
      if (user) {
        console.log(`[sendAuthMessage] copyrightAgreementAccepted=${user.copyrightAgreementAccepted}, type=${typeof user.copyrightAgreementAccepted}`);
      }
      
      // Проверяем, принял ли пользователь соглашение
      // Проверяем строго на boolean true (не undefined, не null, не false)
      const hasAccepted = user && user.copyrightAgreementAccepted === true;
      
      console.log(`[sendAuthMessage] hasAccepted=${hasAccepted}`);
      
      if (hasAccepted) {
        // Пользователь уже принял соглашение - показываем форму авторизации
        await this.bot.telegram.sendMessage(chatId, 
          '🔐 *Авторизация в GraphON*\n\n' +
          'Для доступа к приложению авторизуйтесь, нажав на кнопку ⬇️\n\n' +
          '---\n\n' +
          '📌 *Какие данные мы получим после авторизации?*\n\n' +
          '- *Telegram ID*\n' +
          '- *Имя*\n' +
          '- *Фамилию*\n' +
          '- *Юзернейм*\n' +
          '- *Фото профиля*', 
          {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '🔐 Авторизоваться',
                  login_url: {
                    url: `${this.SERVER_URL}/auth/telegram/callback`, 
                  },
                },
              ],
            ],
          },
        });
      } else {
        // Пользователь не принял соглашение - отправляем сообщение и сразу PDF файл
        await this.bot.telegram.sendMessage(chatId, 
          '📋 *Вопросы обработки персональных данных*\n\n' +
          'Для продолжения необходимо принять соглашение об авторских правах.\n\n' +
          'Пожалуйста, ознакомьтесь с документом и примите условия.', 
          {
          parse_mode: "Markdown",
        });
        
        // Затем сразу отправляем PDF файл с кнопкой принять
        await this.sendCopyrightAgreement(chatId);
      }
    } catch (error) {
      console.error('Error in sendAuthMessage:', error);
      console.error('Error details:', error.message, error.stack);
      
      // В случае ошибки пытаемся снова проверить пользователя
      try {
        const user = await this.userService.findByTelegramId(chatId);
        const hasAccepted = user && user.copyrightAgreementAccepted === true;
        
        if (hasAccepted) {
          // Пользователь принял соглашение - показываем форму авторизации
          await this.bot.telegram.sendMessage(chatId, 
            '🔐 *Авторизация в GraphON*\n\n' +
            'Для доступа к приложению авторизуйтесь, нажав на кнопку ⬇️', 
            {
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: '🔐 Авторизоваться',
                    login_url: {
                      url: `${this.SERVER_URL}/auth/telegram/callback`, 
                    },
                  },
                ],
              ],
            },
          });
        } else {
          // Пользователь не принял соглашение - отправляем запрос
          await this.bot.telegram.sendMessage(chatId, 
            '📋 *Вопросы обработки персональных данных*\n\n' +
            'Для продолжения необходимо принять соглашение об авторских правах.\n\n' +
            'Пожалуйста, ознакомьтесь с документом и примите условия.', 
            {
            parse_mode: "Markdown",
          });
          await this.sendCopyrightAgreement(chatId);
        }
      } catch (fallbackError) {
        console.error('Error in fallback auth message:', fallbackError);
      }
    }
  }

  // Отправка соглашения об авторских правах
  async sendCopyrightAgreement(chatId: number) {
    try {
      // Если есть несколько файлов, отправляем их как медиагруппу
      if (this.COPYRIGHT_PDF_PATHS && this.COPYRIGHT_PDF_PATHS.length > 1) {
        // Проверяем существование файлов перед отправкой
        const existingFiles: string[] = [];
        const missingFiles: string[] = [];

        for (const filePath of this.COPYRIGHT_PDF_PATHS) {
          try {
            // Преобразуем относительный путь в абсолютный
            const absolutePath = path.isAbsolute(filePath) 
              ? filePath 
              : path.resolve(process.cwd(), filePath);
            
            if (fs.existsSync(absolutePath)) {
              existingFiles.push(filePath);
            } else {
              missingFiles.push(filePath);
              console.error(`File not found: ${filePath} (absolute: ${absolutePath})`);
            }
          } catch (err) {
            console.error(`Error checking file ${filePath}:`, err);
            missingFiles.push(filePath);
          }
        }

        if (existingFiles.length === 0) {
          throw new Error(`Все файлы не найдены. Отсутствующие файлы: ${missingFiles.join(', ')}`);
        }

        if (missingFiles.length > 0) {
          console.warn(`Некоторые файлы не найдены: ${missingFiles.join(', ')}. Отправляем только существующие.`);
        }

        // Создаем массив медиа для отправки только из существующих файлов (без caption, так как текст уже отправлен)
        const media = existingFiles.slice(0, 10).map((filePath) => ({
          type: 'document' as const,
          media: { source: filePath },
        }));

        // Отправляем медиагруппу (первые 10 файлов, так как Telegram ограничивает медиагруппы 10 файлами)
        await this.bot.telegram.sendMediaGroup(chatId, media);

        // Отправляем сообщение с кнопкой "Принять соглашение" после медиагруппы
        await this.bot.telegram.sendMessage(chatId, 
          'Пожалуйста, ознакомьтесь с прикрепленными документами.',
          {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '✅ Принять соглашение',
                  callback_data: 'accept_copyright_agreement'
                },
              ],
            ],
          },
        });
      } else {
        // Для одного файла используем старый метод
        const filePath = this.COPYRIGHT_PDF_PATHS?.[0] || this.COPYRIGHT_PDF_PATH;
        const absolutePath = path.isAbsolute(filePath) 
          ? filePath 
          : path.resolve(process.cwd(), filePath);
        
        if (!fs.existsSync(absolutePath)) {
          throw new Error(`Файл не найден: ${filePath} (absolute: ${absolutePath})`);
        }

        await this.bot.telegram.sendDocument(chatId, { source: filePath }, {
          caption: '📋 *Вопросы обработки персональных данных*\n\n' +
                  'Даю свое согласие на обработку моих персональных данных и подтверждаю, что ознакомлен(а) с Политикой конфиденциальности, Положением об обработке данных, Политикой использования файлов cookies.\n\n',
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '✅ Принять соглашение',
                  callback_data: 'accept_copyright_agreement'
                },
              ],
            ],
          },
        });
      }
    } catch (error: any) {
      console.error('Error sending copyright agreement:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        pdfPaths: this.COPYRIGHT_PDF_PATHS,
      });
      
      // Если не удалось отправить файл, отправляем текстовое сообщение с подробностями ошибки
      const errorMessage = error.message || 'Неизвестная ошибка';
      await this.bot.telegram.sendMessage(chatId, 
        '📋 *Вопросы обработки персональных данных*\n\n' +
        'К сожалению, не удалось загрузить документ.\n\n' +
        `Ошибка: ${errorMessage}\n\n` +
        'Пожалуйста, свяжитесь с поддержкой для получения соглашения.', 
        {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '💬 Обратиться в поддержку',
                url: this.SUPPORT_URL,
              },
            ],
          ],
        },
      });
    }
  }

  // Принятие соглашения об авторских правах
  async acceptCopyrightAgreement(chatId: number, telegramId: number) {
    try {
      // Обновляем или создаем пользователя с принятым соглашением
      await this.userService.acceptCopyrightAgreement(telegramId);
      
      await this.bot.telegram.sendMessage(chatId, 
        '✅ *Соглашение принято!*\n\n' +
        'Теперь вы можете продолжить авторизацию.', 
        {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '🔐 Продолжить авторизацию',
                callback_data: 'proceed_to_auth'
              },
            ],
          ],
        },
      });
    } catch (error) {
      console.error('Error accepting copyright agreement:', error);
      await this.bot.telegram.sendMessage(chatId, 
        '❌ *Ошибка*\n\n' +
        'Не удалось сохранить принятие соглашения.\n\n' +
        'Пожалуйста, попробуйте еще раз или обратитесь в поддержку.', 
        {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '💬 Обратиться в поддержку',
                url: this.SUPPORT_URL,
              },
            ],
          ],
        },
      });
    }
  }

  // Отдельный метод для отправки сообщения о техподдержке
  async sendSupportMessage(chatId: number) {
    await this.bot.telegram.sendMessage(chatId, 
      '🛠 *Техподдержка GraphON*\n\n' +
      '📞 *Как получить помощь?*\n\n' +
      '• Опишите проблему в чате поддержки\n\n', 
      {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '💬 Чат поддержки',
              url: this.SUPPORT_URL, 
            },
          ],
        ],
      },
    });
  }

  // Метод для отправки сообщений
  async sendMessage(chatId: number, message: string) {
    await this.bot.telegram.sendMessage(chatId, message);
  }
}
