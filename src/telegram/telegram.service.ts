import { Injectable, OnModuleInit } from '@nestjs/common';
import * as TelegramBot from 'node-telegram-bot-api';

@Injectable()
export class TelegramBotService implements OnModuleInit {
  public bot: TelegramBot;

  constructor() {
    // Токен, который вы получили от BotFather
    const token = '7910385156:AAG-t9hxo7IpMme864JOwDta1CYS2_Qp2EE';
    this.bot = new TelegramBot(token, { polling: true });
  }

  onModuleInit() {
    console.log('Bot initialized');
  }

  // Метод для получения профиля пользователя
  async getUserProfilePhotos(id: number) {
    return await this.bot.getUserProfilePhotos(id);
  }

  // Метод для обработки команды /start
  handleStartCommand() {
    this.bot.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id;
      this.bot.sendMessage(chatId, 'Привет! Выберите действие:', {
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
                login_url: {
                  url: 'https://graphon.up.railway.app/api/auth/telegram/callback',
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
