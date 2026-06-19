import React from 'react';
import { observer } from 'mobx-react-lite';
import toolState from '../store/toolState';
import { getStampPresets } from '../utils/stampPresets';
import '../styles/stamp-palette.scss';

const StampPalette = observer(() => {
  if (toolState.toolName !== 'stamp') return null;

  const presets = getStampPresets();
  const selected = toolState.getToolParams('stamp').selectedStamp ?? '😊';
  const stampSize = toolState.lineWidths.stamp ?? 48;

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
      <span className="stamp-palette__size">{stampSize}px</span>
    </div>
  );
});

export default StampPalette;
