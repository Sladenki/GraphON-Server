import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as TelegramBot from 'node-telegram-bot-api';
import { UserService } from 'src/user/user.service';
import { getCopyrightConfig } from 'src/config/copyright.config';

@Injectable()
export class TelegramBotService implements OnModuleInit {
  public bot: TelegramBot;
  private WEB_APP_URL: string;
  private SERVER_URL: string;
  private SUPPORT_URL: string;
  private COPYRIGHT_PDF_PATH: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
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

    // Путь к PDF файлу соглашения
    const copyrightConfig = getCopyrightConfig(this.configService);
    this.COPYRIGHT_PDF_PATH = copyrightConfig.pdfPath;
  }

  onModuleInit() {
    console.log('Bot initialized');
    // Даем немного времени для инициализации перед началом polling
    setTimeout(() => {
      this.setupBotCommands();
      this.handleStartCommand();
      this.handleAuthCommand();
      this.handleSupportCommand();
      this.handleCallbackQueries();
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
    this.bot.onText(/\/start(.*)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const parameter = match[1]?.trim(); // Получаем параметр после /start
      
      // Если есть параметр "auth", сразу показываем форму авторизации
      if (parameter === 'auth') {
        await this.sendAuthMessage(chatId);
        return;
      }

      // Обычное приветствие без параметров
      this.bot.sendMessage(chatId, 
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
                  hide_webapp_header: true
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
    this.bot.onText(/\/auth/, async (msg) => {
      const chatId = msg.chat.id;
      await this.sendAuthMessage(chatId);
    });
  }

  // Метод для обработки команды /support
  handleSupportCommand() {
    this.bot.onText(/\/support/, (msg) => {
      const chatId = msg.chat.id;
      this.sendSupportMessage(chatId);
    });
  }

  // Обработка callback запросов (нажатия на кнопки)
  handleCallbackQueries() {
    this.bot.on('callback_query', async (callbackQuery) => {
      const chatId = callbackQuery.message.chat.id;
      const data = callbackQuery.data;

      if (data === 'show_copyright_agreement') {
        await this.sendCopyrightAgreement(chatId);
      } else if (data === 'accept_copyright_agreement') {
        await this.acceptCopyrightAgreement(chatId, callbackQuery.from.id);
      } else if (data === 'proceed_to_auth') {
        await this.sendAuthMessage(chatId);
      }

      // Отвечаем на callback query
      await this.bot.answerCallbackQuery(callbackQuery.id);
    });
  }

  // Отдельный метод для отправки сообщения об авторизации
  async sendAuthMessage(chatId: number) {
    try {
      // Проверяем, принял ли пользователь соглашение
      const user = await this.userService.findByTelegramId(chatId);
      
      if (user && user.copyrightAgreementAccepted) {
        // Пользователь уже принял соглашение - показываем форму авторизации
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
      } else {
        // Пользователь не принял соглашение - показываем запрос на принятие
        this.bot.sendMessage(chatId, 
          '📋 *Соглашение об авторских правах*\n\n' +
          'Для продолжения необходимо принять соглашение об авторских правах.\n\n' +
          'Пожалуйста, ознакомьтесь с документом и примите условия.', 
          {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '📄 Просмотреть соглашение',
                  callback_data: 'show_copyright_agreement'
                },
              ],
            ],
          },
        });
      }
    } catch (error) {
      console.error('Error in sendAuthMessage:', error);
      // В случае ошибки показываем запрос на принятие соглашения
      this.bot.sendMessage(chatId, 
        '📋 *Соглашение об авторских правах*\n\n' +
        'Для продолжения необходимо принять соглашение об авторских правах.\n\n' +
        'Пожалуйста, ознакомьтесь с документом и примите условия.', 
        {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '📄 Просмотреть соглашение',
                callback_data: 'show_copyright_agreement'
              },
            ],
          ],
        },
      });
    }
  }

  // Отправка соглашения об авторских правах
  async sendCopyrightAgreement(chatId: number) {
    try {
      // Отправляем PDF файл
      await this.bot.sendDocument(chatId, this.COPYRIGHT_PDF_PATH, {
        caption: '📋 *Соглашение об авторских правах*\n\n' +
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
    } catch (error) {
      console.error('Error sending copyright agreement:', error);
      // Если не удалось отправить файл, отправляем текстовое сообщение
      this.bot.sendMessage(chatId, 
        '📋 *Соглашение об авторских правах*\n\n' +
        'К сожалению, не удалось загрузить документ.\n\n' +
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
      
      this.bot.sendMessage(chatId, 
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
      this.bot.sendMessage(chatId, 
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
