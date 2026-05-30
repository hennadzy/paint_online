import React, { useEffect } from 'react';
import { useSeo } from './SeoMeta';
import '../styles/help-page.scss';
import '../styles/room-interface.scss';

const HelpPage = () => {
  const { setSeoData } = useSeo();

  useEffect(() => {
    setSeoData({
      title: 'Справка — Рисование.Онлайн | Ответы на вопросы',
      description: 'Справка по рисованию онлайн: как начать рисовать, настройки инструментов, создание комнат, авторизация, галерея, личные сообщения. Ответы на частые вопросы.',
      keywords: 'справка рисование онлайн, как рисовать, инструкции, настройки инструментов, создание комнат, авторизация, галерея, личные сообщения, частые вопросы'
    });

    return () => setSeoData(null);
  }, [setSeoData]);

  return (
    <div className="help-page-overlay fullscreen" onClick={() => window.history.back()}>
      <div className="help-page full-screen" onClick={(e) => e.stopPropagation()}>
        <button className="help-page-close-btn" onClick={() => window.history.back()}>×</button>

        <div className="room-welcome">
          <h1>📖 Справка</h1>
          <p>Ответы на вопросы и инструкции по использованию</p>
        </div>

        <div className="room-card about-content fullscreen" itemScope itemType="https://schema.org/SoftwareApplication">
          <meta itemProp="name" content="Рисование.Онлайн - Онлайн редактор для рисования" />
          <meta itemProp="applicationCategory" content="GraphicsApplication" />
          <meta itemProp="operatingSystem" content="Web Browser" />
          <meta itemProp="offers" itemScope itemType="https://schema.org/Offer" />
          <meta itemProp="price" content="0" />
          <meta itemProp="priceCurrency" content="RUB" />

          <div className="about-section">
            <h2 itemProp="name">О программе</h2>
            <p itemProp="description">
              <strong>Рисование онлайн</strong> — это бесплатный графический редактор,
              который работает прямо в браузере без установки. Наше веб-приложение позволяет рисовать
              онлайн как в одиночку, так и совместно с друзьями в режиме реального времени.
            </p>
          </div>

          <div className="about-section auth-highlight">
            <h2>🔐 Авторизация — откройте больше возможностей</h2>
            <p className="auth-highlight-lead">
              <strong>Зарегистрируйтесь и войдите в аккаунт</strong>, чтобы использовать весь функционал платформы:
              личные сообщения, публикации в галерее, управление комнатами и удобный вход без постоянного ввода имени.
            </p>
            <h3>Преимущества авторизованных пользователей:</h3>
            <ul>
              <li><strong>Без постоянного ввода имени</strong> — при входе в комнаты ваше имя подставляется автоматически, нет необходимости вводить его каждый раз</li>
              <li><strong>Визуальная идентификация</strong> — ваш ник в чате помечается галочкой ✓, что позволяет другим пользователям видеть, что вы авторизованный пользователь</li>
              <li><strong>Личные сообщения</strong> — возможность общаться в личных сообщениях с другими авторизованными пользователями прямо из комнаты, не выходя из рисования</li>
              <li><strong>Галерея работ</strong> — возможность добавлять свои рисунки в общую галерею для демонстрации творчества</li>
              <li><strong>Комментарии в галерее</strong> — возможность оставлять комментарии под рисунками других пользователей и отвечать на комментарии к своим работам</li>
              <li><strong>Лайки</strong> — возможность ставить лайки рисункам в галерее и видеть, кому понравились ваши работы</li>
              <li><strong>Управление комнатами</strong> — авторизованные пользователи могут удалять свои комнаты и менять статус с приватного на публичный и наоборот</li>
              <li><strong>Профиль</strong> — личный кабинет для управления настройками и просмотра истории</li>
            </ul>
            <p>
              Регистрация занимает всего пару минут и требует только указания имени, email и пароля.
              После регистрации вы сразу получаете доступ ко всем преимуществам авторизованного пользователя.
            </p>
            <p className="auth-highlight-cta">
              ✅ Если хотите максимум возможностей — начните с регистрации и авторизации.
            </p>
          </div>

          <div className="about-section">
            <h3>Основные возможности графического редактора:</h3>
            <ul itemProp="featureList">
              <li><strong>Рисование онлайн</strong> — создавайте цифровые рисунки прямо в браузере</li>
              <li><strong>Совместное рисование</strong> — рисуйте вместе с друзьями в реальном времени</li>
              <li><strong>Богатый набор инструментов</strong>: кисть, ластик, линия, стрелка, круг, прямоугольник, многоугольник, заливка, пипетка, текст</li>
              <li><strong>Настройка инструментов</strong> — выбор цвета, размера, прозрачности для всех инструментов</li>
              <li><strong>Горячие клавиши</strong> — быстрый доступ к инструментам (B, E, L, R, C, T, G) и функциям (Ctrl+Z/Y, +/-)</li>
              <li><strong>Сетка и масштабирование</strong> — включайте сетку для точности, масштабируйте холст</li>
              <li><strong>Очистка холста</strong> — быстрое удаление всех элементов одной кнопкой</li>
              <li><strong>Отмена и повтор действий</strong> — полный контроль над процессом рисования</li>
              <li><strong>Сохранение рисунков</strong> — экспорт изображений в формате JPG</li>
              <li><strong>Приватные и публичные комнаты</strong> — создавайте защищенные паролем сессии</li>
              <li><strong>Управление комнатами</strong> — авторизованные пользователи могут удалять свои комнаты, а также менять статус с приватного на публичный и наоборот</li>
              <li><strong>Вход без имени</strong> — авторизованные пользователи могут входить в комнаты без ввода имени</li>
              <li><strong>Автосохранение</strong> — рисунки в комнатах сохраняются автоматически до 7 дней</li>
              <li><strong>Чат в реальном времени</strong> — общайтесь с другими художниками</li>
              <li><strong>Мобильная версия</strong> — рисуйте на планшете или смартфоне с оптимизированным интерфейсом</li>
            </ul>
          </div>

          <div className="about-section">
            <h3>Для кого подходит рисование онлайн?</h3>
            <p>
              Наш онлайн редактор идеально подходит для:
            </p>
            <ul>
              <li><strong>Художников и иллюстраторов</strong> — быстрые скетчи и эскизы</li>
              <li><strong>Дизайнеров</strong> — создание концептов и макетов</li>
              <li><strong>Преподавателей</strong> — онлайн-уроки рисования с учениками</li>
              <li><strong>Детей и начинающих</strong> — простой и понятный интерфейс</li>
              <li><strong>Команд и друзей</strong> — совместное творчество и развлечения</li>
            </ul>
          </div>

          <div className="about-section" itemScope itemType="https://schema.org/FAQPage">
            <h3>Горячие клавиши для быстрой работы</h3>
            <div className="help-hotkeys-grid">
              <div className="help-hotkey-item" itemProp="mainEntity" itemScope itemType="https://schema.org/Question">
                <meta itemProp="name" content="Какая клавиша для кисти?" />
                <span className="help-hotkey-key" itemProp="acceptedAnswer" itemScope itemType="https://schema.org/Answer"><meta itemProp="text" content="B" />B</span>
                <span className="help-hotkey-desc">— Кисть</span>
              </div>
              <div className="help-hotkey-item" itemProp="mainEntity" itemScope itemType="https://schema.org/Question">
                <meta itemProp="name" content="Какая клавиша для ластика?" />
                <span className="help-hotkey-key" itemProp="acceptedAnswer" itemScope itemType="https://schema.org/Answer"><meta itemProp="text" content="E" />E</span>
                <span className="help-hotkey-desc">— Ластик</span>
              </div>
              <div className="help-hotkey-item" itemProp="mainEntity" itemScope itemType="https://schema.org/Question">
                <meta itemProp="name" content="Какая клавиша для линии?" />
                <span className="help-hotkey-key" itemProp="acceptedAnswer" itemScope itemType="https://schema.org/Answer"><meta itemProp="text" content="L" />L</span>
                <span className="help-hotkey-desc">— Линия</span>
              </div>
              <div className="help-hotkey-item" itemProp="mainEntity" itemScope itemType="https://schema.org/Question">
                <meta itemProp="name" content="Какая клавиша для прямоугольника?" />
                <span className="help-hotkey-key" itemProp="acceptedAnswer" itemScope itemType="https://schema.org/Answer"><meta itemProp="text" content="R" />R</span>
                <span className="help-hotkey-desc">— Прямоугольник</span>
              </div>
              <div className="help-hotkey-item" itemProp="mainEntity" itemScope itemType="https://schema.org/Question">
                <meta itemProp="name" content="Какая клавиша для круга?" />
                <span className="help-hotkey-key" itemProp="acceptedAnswer" itemScope itemType="https://schema.org/Answer"><meta itemProp="text" content="C" />C</span>
                <span className="help-hotkey-desc">— Круг</span>
              </div>
              <div className="help-hotkey-item" itemProp="mainEntity" itemScope itemType="https://schema.org/Question">
                <meta itemProp="name" content="Какая клавиша для текста?" />
                <span className="help-hotkey-key" itemProp="acceptedAnswer" itemScope itemType="https://schema.org/Answer"><meta itemProp="text" content="T" />T</span>
                <span className="help-hotkey-desc">— Текст</span>
              </div>
              <div className="help-hotkey-item" itemProp="mainEntity" itemScope itemType="https://schema.org/Question">
                <meta itemProp="name" content="Какая клавиша для сетки?" />
                <span className="help-hotkey-key" itemProp="acceptedAnswer" itemScope itemType="https://schema.org/Answer"><meta itemProp="text" content="G" />G</span>
                <span className="help-hotkey-desc">— Включить/выключить сетку</span>
              </div>
              <div className="help-hotkey-item" itemProp="mainEntity" itemScope itemType="https://schema.org/Question">
                <meta itemProp="name" content="Как отменить действие?" />
                <span className="help-hotkey-key" itemProp="acceptedAnswer" itemScope itemType="https://schema.org/Answer"><meta itemProp="text" content="Ctrl+Z" />Ctrl+Z</span>
                <span className="help-hotkey-desc">— Отменить действие</span>
              </div>
              <div className="help-hotkey-item" itemProp="mainEntity" itemScope itemType="https://schema.org/Question">
                <meta itemProp="name" content="Как повторить действие?" />
                <span className="help-hotkey-key" itemProp="acceptedAnswer" itemScope itemType="https://schema.org/Answer"><meta itemProp="text" content="Ctrl+Y или Ctrl+Shift+Z" />Ctrl+Y</span>
                <span className="help-hotkey-desc">— Повторить действие</span>
              </div>
              <div className="help-hotkey-item" itemProp="mainEntity" itemScope itemType="https://schema.org/Question">
                <meta itemProp="name" content="Как увеличить масштаб?" />
                <span className="help-hotkey-key" itemProp="acceptedAnswer" itemScope itemType="https://schema.org/Answer"><meta itemProp="text" content="+ или Ctrl++" />+</span>
                <span className="help-hotkey-desc">— Увеличить масштаб</span>
              </div>
              <div className="help-hotkey-item" itemProp="mainEntity" itemScope itemType="https://schema.org/Question">
                <meta itemProp="name" content="Как уменьшить масштаб?" />
                <span className="help-hotkey-key" itemProp="acceptedAnswer" itemScope itemType="https://schema.org/Answer"><meta itemProp="text" content="- или Ctrl+-" />-</span>
                <span className="help-hotkey-desc">— Уменьшить масштаб</span>
              </div>
            </div>
          </div>

          <div className="about-section">
            <h3>Преимущества онлайн рисования</h3>
            <p itemProp="featureList">
              <strong>Не требует установки</strong> — работает в любом современном браузере (Chrome, Firefox, Safari, Edge).
              <strong> Бесплатно</strong> — все функции доступны без регистрации и оплаты.
              <strong> Кроссплатформенность</strong> — рисуйте на Windows, macOS, Linux, Android, iOS.
              <strong> Совместная работа</strong> — уникальная функция рисования вместе в реальном времени.
              <strong> Быстрый старт</strong> — начните рисовать за несколько секунд.
            </p>
          </div>

          <div className="about-section">
            <h3>Как начать рисовать онлайн?</h3>
            <ol>
              <li>Откройте редактор в браузере</li>
              <li>Выберите инструмент рисования на панели слева или используйте горячие клавиши</li>
              <li>Настройте цвет, размер и прозрачность на панели настроек</li>
              <li>Начните рисовать на белом холсте</li>
              <li>Используйте Ctrl+Z для отмены, +/- для масштабирования, G для сетки</li>
              <li>Для совместного рисования нажмите «Совместное рисование»</li>
              <li>Создайте комнату (публичную или приватную) и поделитесь ссылкой с друзьями</li>
              <li>Ваши рисунки сохраняются автоматически в течение 7 дней</li>
            </ol>
          </div>

          <div className="about-section">
            <h2>Обратная связь</h2>
            <p>
              На сайте проводятся технические работы, поэтому возможны временные сбои в работе сервиса.
              Мы делаем всё возможное, чтобы улучшить ваше взаимодействие с платформой и добавить новые функции. Приносим извинения за возможные неудобства.
            </p>
            <p>
              Если у вас возникли вопросы или вы хотите сообщить о проблеме, напишите нам:
            </p>
            <p>
              📧 <a href="mailto:admin@risovanie.online">admin@risovanie.online</a>
            </p>
            <p>
              Вернуться на <a href="/">главную страницу</a> — начать рисовать онлайн без регистрации.
            </p>
            <p>
              Спасибо за понимание! ❤️
            </p>
          </div>

          <div className="about-section">
            <p className="copyright">
              © 2024-2026 Рисование онлайн. Бесплатный графический редактор для совместного рисования.
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
            <button
              className="room-btn room-btn-primary"
              onClick={() => window.history.back()}
            >
              Понятно
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpPage;
