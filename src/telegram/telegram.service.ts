import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as TelegramBot from 'node-telegram-bot-api';

@Injectable()
export class TelegramBotService implements OnModuleInit {
  public bot: TelegramBot;
  private WEB_APP_URL: string;
  private AUTH_LOGIN_URL: string;

  constructor(
    private readonly configService: ConfigService,
  ) {
    // Подключаем бота
    // const token = this.configService.get<string>('BOT_TOKEN');
    const token = "7335134596:AAFu23SLsADju1xxcG9bqecwFXoi8MgZeBs"
    this.bot = new TelegramBot(token, { polling: true });

    console.log('Bot instance created');

    // Ссылка на приложение 
    const webAppString = this.configService.get<string>('WEB_APP_URL');
    this.WEB_APP_URL = webAppString

    // Ссылка на авторизацию
    const authLoginString = this.configService.get<string>('AUTH_LOGIN_URL');
    this.AUTH_LOGIN_URL = authLoginString
  }

  onModuleInit() {
    console.log('Bot initialized');
    // Даем немного времени для инициализации перед началом polling
    setTimeout(() => {
      this.handleStartCommand();
    }, 1000); // 1 секунда задержки
  }

  // Метод для получения профиля пользователя
  async getUserProfilePhotos(id: number) {
    return await this.bot.getUserProfilePhotos(id);
  }

  // Метод для обработки команды /start
  handleStartCommand() {
    this.bot.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id;
      this.bot.sendMessage(chatId, 
        '🌟 *Добро пожаловать в GraphON!* 🌟\n\n' +
        'Ваш личный гид по менеджменту внеучебных мероприятий.\n\n' +
        'Для доступа к приложению зарегистрируйтесь, нажав на кнопку "Авторизоваться" ⬇️\n\n' +
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
                text: '🌐 Открыть приложение',
                web_app: {
                  url: this.WEB_APP_URL, 
                },
              },
            ],
            [
              {
                text: '🔐 Авторизоваться',
                login_url: {
                  url: this.AUTH_LOGIN_URL,
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

  // Метод для отправки сообщений
  sendMessage(chatId: number, message: string) {
    this.bot.sendMessage(chatId, message);
  }
}
