const DEFAULT_EMOJI_STAMPS = [
  { id: '😊', kind: 'emoji', content: '😊', label: 'Улыбка' },
  { id: '😂', kind: 'emoji', content: '😂', label: 'Смех' },
  { id: '❤️', kind: 'emoji', content: '❤️', label: 'Сердце' },
  { id: '⭐', kind: 'emoji', content: '⭐', label: 'Звезда' },
  { id: '👍', kind: 'emoji', content: '👍', label: 'Лайк' },
  { id: '🔥', kind: 'emoji', content: '🔥', label: 'Огонь' },
  { id: '✨', kind: 'emoji', content: '✨', label: 'Блеск' },
  { id: '🎨', kind: 'emoji', content: '🎨', label: 'Палитра' },
  { id: '💯', kind: 'emoji', content: '💯', label: '100' },
  { id: '🌈', kind: 'emoji', content: '🌈', label: 'Радуга' },
  { id: '🎉', kind: 'emoji', content: '🎉', label: 'Праздник' },
  { id: '💡', kind: 'emoji', content: '💡', label: 'Идея' },
];

let imageStamps = [];

try {
  const stampContext = require.context('../assets/stamps', false, /\.(png|svg|jpg|jpeg|gif|webp)$/);
  imageStamps = stampContext.keys().map((key) => {
    const name = key.replace('./', '').replace(/\.[^.]+$/, '');
    return {
      id: `img:${name}`,
      kind: 'image',
      content: stampContext(key),
      label: name,
    };
  });
} catch (_) {
  imageStamps = [];
}

export function getStampPresets() {
  return [...DEFAULT_EMOJI_STAMPS, ...imageStamps];
}

export function getStampById(id) {
  return getStampPresets().find((s) => s.id === id) || DEFAULT_EMOJI_STAMPS[0];
}
