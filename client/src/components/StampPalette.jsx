import React from 'react';
import { observer } from 'mobx-react-lite';
import toolState from '../store/toolState';
import { getStampPresets } from '../utils/stampPresets';
import '../styles/stamp-palette.scss';

const StampPalette = observer(() => {
  if (toolState.toolName !== 'stamp' || !toolState.stampPaletteOpen) return null;

  const presets = getStampPresets();
  const selected = toolState.getToolParams('stamp').selectedStamp ?? '😊';

  return (
    <div className="stamp-palette" data-nosnippet>
      <span className="stamp-palette__label">Штамп:</span>
      <div className="stamp-palette__grid">
        {presets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={`stamp-palette__item ${selected === preset.id ? 'active' : ''}`}
            title={preset.label}
            onClick={() => toolState.setToolParam('stamp', 'selectedStamp', preset.id)}
          >
            {preset.kind === 'emoji' ? (
              <span className="stamp-palette__emoji">{preset.content}</span>
            ) : (
              <img src={preset.content} alt={preset.label} className="stamp-palette__img" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
});

export default StampPalette;
