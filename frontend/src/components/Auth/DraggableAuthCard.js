import React, { useState, useRef, useCallback, useEffect } from 'react';

const useDraggable = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 });

  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y,
    };
  }, [position.x, position.y]);

  const handleTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    setIsDragging(true);
    dragStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      posX: position.x,
      posY: position.y,
    };
  }, [position.x, position.y]);

  const handleMove = useCallback((clientX, clientY) => {
    const dx = clientX - dragStart.current.x;
    const dy = clientY - dragStart.current.y;
    setPosition({
      x: dragStart.current.posX + dx,
      y: dragStart.current.posY + dy,
    });
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    e.preventDefault();
    handleMove(e.clientX, e.clientY);
  }, [isDragging, handleMove]);

  const handleTouchMove = useCallback((e) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    handleMove(touch.clientX, touch.clientY);
  }, [isDragging, handleMove]);

  const handleEnd = useCallback(() => setIsDragging(false), []);

  useEffect(() => {
    if (!isDragging) return;
    const onMouseUp = () => handleEnd();
    const onMouseMove = (e) => handleMouseMove(e);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDragging, handleMouseMove, handleEnd]);

  useEffect(() => {
    if (!isDragging) return;
    const onTouchEnd = () => handleEnd();
    const onTouchMove = (e) => {
      handleTouchMove(e);
      e.preventDefault();
    };
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
    return () => {
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [isDragging, handleTouchMove, handleEnd]);

  return {
    position,
    isDragging,
    handleMouseDown,
    handleTouchStart,
  };
};

const DraggableAuthCard = ({ children, className = '' }) => {
  return (
    <div className="draggable-auth-card-wrapper">
      <div className={`draggable-auth-card ${className}`.trim()}>
        {children}
      </div>
    </div>
  );
};

export default DraggableAuthCard;
export { useDraggable };
