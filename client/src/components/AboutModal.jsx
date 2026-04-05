import React from 'react';
import { observer } from 'mobx-react-lite';
import canvasState from '../store/canvasState';
import '../styles/room-interface.scss';

const AboutModal = observer(() => {
  if (!canvasState.showAboutModal) return null;

  return (
    <div className="room-interface-overlay fullscreen" onClick={() => canvasState.setShowAboutModal(false)}>
      <div className="room-interface fullscreen" onClick={(e) => e.stopPropagation()}>
        <button className="room-close-btn" onClick={() => canvasState.setShowAboutModal(false)}>×</button>

        <div className="room-welcome">
          <h1 itemProp="name">Рисование онлайн - Бесплатный графический редактор</h1>
          <p itemProp="description">Рисуйте онлайн в браузере бесплатно. Совместное рисование в реальном времени</p>
        </div>

        <div className="room-card about-content fullscreen" itemScope itemType="https://schema.org/SoftwareApplication">
          <meta itemProp="name" content="Рисование.Онлайн - Онлайн редактор для рисования" />
          <meta itemProp="applicationCategory" content="GraphicsApplication" />
          <meta itemProp="operatingSystem" content="Web Browser" />
          <meta itemProp="offers" itemScope itemType="https://schema.org/Offer" />
          <meta itemProp="price" content="0" />
          <meta itemProp="priceCurrency" content="RUB" />

<div className="about-section">
            <h2>О программе</h2>
            <p itemProp="description">
              <strong>Рисование онлайн</strong> — это бесплатный графический редактор,
              который работает прямо в браузере без установки. Наше веб-приложение позволяет рисовать
              онлайн как в одиночку, так и совместно с друзьями в режиме реального времени.
            </p>
          </div>

          <div className="about-section">
            <h2>Авторизация</h2>
            <p>
              Авторизация на нашем сайте открывает дополнительные возможности и делает работу с сервисом более удобной. Зарегистрированные пользователи получают доступ к расширенному функционалу, который недоступен гостям.
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
              Регистрация занимает всего пару минут и требует только указания имени, email и пароля. После регистрации вы сразу получаете доступ ко всем преимуществам авторизованного пользователя.
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

          <div className="about-section">
            <h3>Горячие клавиши для быстрой работы</h3>
            <ul>
              <li><strong>B</strong> — Кисть</li>
              <li><strong>E</strong> — Ластик</li>
              <li><strong>L</strong> — Линия</li>
              <li><strong>R</strong> — Прямоугольник</li>
              <li><strong>C</strong> — Круг</li>
              <li><strong>T</strong> — Текст</li>
              <li><strong>G</strong> — Включить/выключить сетку</li>
              <li><strong>Ctrl+Z</strong> — Отменить действие</li>
              <li><strong>Ctrl+Y</strong> или <strong>Ctrl+Shift+Z</strong> — Повторить действие</li>
              <li><strong>+</strong> — Увеличить масштаб</li>
              <li><strong>-</strong> — Уменьшить масштаб</li>
            </ul>
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
              📧 <a href="mailto:admin@paint-art.ru" style={{ color: '#ffcc00' }}>admin@paint-art.ru</a>
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
              onClick={() => canvasState.setShowAboutModal(false)}
            >
              Начать рисовать
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default AboutModal;
