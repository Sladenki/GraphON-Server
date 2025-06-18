import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as TelegramBot from 'node-telegram-bot-api';

@Injectable()
export class TelegramBotService implements OnModuleInit {
  public bot: TelegramBot;
  private WEB_APP_URL: string;
  private SERVER_URL: string;

  constructor(
    private readonly configService: ConfigService,
  ) {
    // Подключаем бота
    const token = this.configService.get<string>('BOT_TOKEN');
    // const token = "7335134596:AAFu23SLsADju1xxcG9bqecwFXoi8MgZeBs"
    this.bot = new TelegramBot(token, { polling: true });

    console.log('Bot instance created');

    // Ссылка на приложение 
    const webAppString = this.configService.get<string>('WEB_APP_URL');
    this.WEB_APP_URL = webAppString

    // Ссылка на авторизацию
    const authLoginString = this.configService.get<string>('SERVER_URL');
    this.SERVER_URL = authLoginString
  }

  onModuleInit() {
    console.log('Bot initialized');
    // Даем немного времени для инициализации перед началом polling
    setTimeout(() => {
      this.setupBotCommands();
      this.handleStartCommand();
      this.handleAuthCommand();
    }, 1000); // 1 секунда задержки
  }

  // Метод для получения профиля пользователя
  async getUserProfilePhotos(id: number) {
    return await this.bot.getUserProfilePhotos(id);
  }

  // Настройка команд бота (отображаются в меню)
  async setupBotCommands() {
    try {
      await this.bot.setMyCommands([
        {
          command: 'start',
          description: '🌟 Главное меню'
        },
        {
          command: 'auth',
          description: '🔐 Авторизация'
        }
      ]);
      console.log('Bot commands set successfully');
    } catch (error) {
      console.error('Error setting bot commands:', error);
    }
  }

  // Метод для обработки команды /start
  handleStartCommand() {
    this.bot.onText(/\/start(.*)/, (msg, match) => {
      const chatId = msg.chat.id;
      const parameter = match[1]?.trim(); // Получаем параметр после /start
      
      // Если есть параметр "auth", сразу показываем форму авторизации
      if (parameter === 'auth') {
        this.sendAuthMessage(chatId);
        return;
      }

      // Обычное приветствие без параметров
      this.bot.sendMessage(chatId, 
        '🌟 *Добро пожаловать в GraphON!* 🌟\n\n' +
        'Ваш личный гид по менеджменту внеучебных мероприятий.\n\n' +
        'Используйте команды:\n' +
        '• `/auth` - для авторизации\n' +
        '• Кнопку ниже - для открытия приложения', 
        {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '🌐 Открыть приложение',
                web_app: {
                  url: this.WEB_APP_URL,
                  hide_webapp_header: true
                },
              },
            ],        
            [
              {
                text: '📢 Telegram канал',
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
    this.bot.onText(/\/auth/, (msg) => {
      const chatId = msg.chat.id;
      this.sendAuthMessage(chatId);
    });
  }

  // Отдельный метод для отправки сообщения об авторизации
  sendAuthMessage(chatId: number) {
    this.bot.sendMessage(chatId, 
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
  }

  // Метод для отправки сообщений
  sendMessage(chatId: number, message: string) {
    this.bot.sendMessage(chatId, message);
  }
}
