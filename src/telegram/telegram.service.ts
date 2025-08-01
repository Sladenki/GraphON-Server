import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as TelegramBot from 'node-telegram-bot-api';

@Injectable()
export class TelegramBotService implements OnModuleInit {
  public bot: TelegramBot;
  private WEB_APP_URL: string;
  private SERVER_URL: string;
  private SUPPORT_URL: string;

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
    
    // Ссылка на поддержку
    const supportUrlString = this.configService.get<string>('SUPPORT_URL');
    this.SUPPORT_URL = supportUrlString
    
  }

  onModuleInit() {
    console.log('Bot initialized');
    // Даем немного времени для инициализации перед началом polling
    setTimeout(() => {
      this.setupBotCommands();
      this.handleStartCommand();
      this.handleAuthCommand();
      this.handleSupportCommand();
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
        'Ваш личный гид по менеджменту внеучебных мероприятий.\n\n', 
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

  // Метод для обработки команды /support
  handleSupportCommand() {
    this.bot.onText(/\/support/, (msg) => {
      const chatId = msg.chat.id;
      this.sendSupportMessage(chatId);
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

  // Отдельный метод для отправки сообщения о техподдержке
  sendSupportMessage(chatId: number) {
    this.bot.sendMessage(chatId, 
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
  sendMessage(chatId: number, message: string) {
    this.bot.sendMessage(chatId, message);
  }
}
