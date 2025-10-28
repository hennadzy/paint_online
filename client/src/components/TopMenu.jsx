import React from 'react';
import canvasState from '../store/canvasState';

const TopMenu = () => {
  const download = () => {
    const dataUrl = canvasState.canvas.toDataURL();
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = canvasState.sessionid + ".jpg";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="top-menu">
      <button className="top-menu__btn undo" onClick={() => canvasState.undo()} />
      <button className="top-menu__btn redo" onClick={() => canvasState.redo()} />
      <button className="top-menu__btn save" onClick={download} />
    </div>
  );
};

export default TopMenu;
