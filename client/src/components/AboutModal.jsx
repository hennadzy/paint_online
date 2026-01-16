import React from 'react';
import { observer } from 'mobx-react-lite';
import canvasState from '../store/canvasState';
import '../styles/room-interface.scss';

const AboutModal = observer(() => {
  if (!canvasState.showAboutModal) return null;

  return (
    <div className="room-interface-overlay" onClick={() => canvasState.setShowAboutModal(false)}>
      <div className="room-interface" onClick={(e) => e.stopPropagation()}>
        <button className="room-close-btn" onClick={() => canvasState.setShowAboutModal(false)}>×</button>
        
        <div className="room-welcome">
          <h1 itemProp="name">Рисование.Онлайн - Онлайн редактор для рисования</h1>
          <p itemProp="description">Бесплатный графический редактор для совместного рисования в реальном времени</p>
        </div>

        <div className="room-card about-content" itemScope itemType="https://schema.org/SoftwareApplication">
          <meta itemProp="name" content="Рисование.Онлайн - Онлайн редактор для рисования" />
          <meta itemProp="applicationCategory" content="GraphicsApplication" />
          <meta itemProp="operatingSystem" content="Web Browser" />
          <meta itemProp="offers" itemScope itemType="https://schema.org/Offer" />
          <meta itemProp="price" content="0" />
          <meta itemProp="priceCurrency" content="RUB" />
          
          <div className="about-section">
            <h2>О программе Рисование.Онлайн</h2>
            <p itemProp="description">
              <strong>Рисование.Онлайн</strong> — это современный бесплатный онлайн редактор для рисования, 
              который работает прямо в браузере без установки. Наше веб-приложение позволяет рисовать 
              онлайн как в одиночку, так и совместно с друзьями в режиме реального времени.
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
              <li><strong>Автосохранение</strong> — рисунки в комнатах сохраняются автоматически до 3 дней</li>
              <li><strong>Чат в реальном времени</strong> — общайтесь с другими художниками</li>
              <li><strong>Мобильная версия</strong> — рисуйте на планшете или смартфоне с оптимизированным интерфейсом</li>
            </ul>
          </div>

          <div className="about-section">
            <h3>Для кого подходит Рисование.Онлайн?</h3>
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
              <strong>Бесплатно</strong> — все функции доступны без регистрации и оплаты. 
              <strong>Кроссплатформенность</strong> — рисуйте на Windows, macOS, Linux, Android, iOS. 
              <strong>Совместная работа</strong> — уникальная функция рисования вместе в реальном времени. 
              <strong>Быстрый старт</strong> — начните рисовать за несколько секунд.
            </p>
          </div>

          <div className="about-section">
            <h3>Как начать рисовать онлайн?</h3>
            <ol>
              <li>Откройте Рисование.Онлайн в браузере</li>
              <li>Выберите инструмент рисования на панели слева или используйте горячие клавиши</li>
              <li>Настройте цвет, размер и прозрачность на панели настроек</li>
              <li>Начните рисовать на белом холсте</li>
              <li>Используйте Ctrl+Z для отмены, +/- для масштабирования, G для сетки</li>
              <li>Для совместного рисования нажмите «Совместное рисование»</li>
              <li>Создайте комнату (публичную или приватную) и поделитесь ссылкой с друзьями</li>
              <li>Ваши рисунки сохраняются автоматически в течение 3 дней</li>
            </ol>
          </div>

          <div className="about-section">
            <p className="copyright">
              © 2024-2026 Рисование.Онлайн. Бесплатный онлайн редактор для совместного рисования.
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
