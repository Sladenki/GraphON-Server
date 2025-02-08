import { Injectable, OnModuleInit } from '@nestjs/common';
import * as TelegramBot from 'node-telegram-bot-api';

@Injectable()
export class TelegramBotService implements OnModuleInit {
  public bot: TelegramBot;

  constructor() {
    // Токен, который вы получили от BotFather
    // const token = '7910385156:AAG-t9hxo7IpMme864JOwDta1CYS2_Qp2EE';

    // Левый токен
    const token = '7335134596:AAFu23SLsADju1xxcG9bqecwFXoi8MgZeBs';
    
    this.bot = new TelegramBot(token, { polling: true });

    console.log('Bot instance created');
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
      this.bot.sendMessage(chatId, 'Привет! Выберите действие:\n\n' +
        '📌 *Какие данные мы собираем?*\n' +
        'Мы получаем ваш *Telegram ID, имя, фамилию, юзернейм и фото профиля* ' +
        'для авторизации и персонализации вашего профиля.', {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'Перейти на сайт',
                web_app: {
                  url: 'https://graphon-client.onrender.com/', 
                },
              },
            ],
            [
              {
                text: 'Авторизоваться через Telegram',
                web_app: {
                  // url: 'https://graphon.up.railway.app/api/auth/telegram/callback',
                  url: 'https://graphon-server.onrender.com/api/auth/telegram/callback',
                },
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
