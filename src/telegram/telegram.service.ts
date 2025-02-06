import { Injectable, OnModuleInit } from '@nestjs/common';
import * as TelegramBot from 'node-telegram-bot-api';

@Injectable()
export class TelegramBotService implements OnModuleInit {
  private bot: TelegramBot;

  constructor() {
    // Токен, который вы получили от BotFather
    const token = '7910385156:AAG-t9hxo7IpMme864JOwDta1CYS2_Qp2EE';
    this.bot = new TelegramBot(token, { polling: true });
  }

  onModuleInit() {
    // Обработка команды /start
    this.bot.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id;

      // Отправка сообщения с кнопками
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
                  url: 'https://graphon-server.onrender.com/api/auth/telegram/callback',
                },
              },
            ],
          ],
        },
      });
    });
    }
}
