import { useRef, useState } from 'react';

interface Options {
  // Runs once a slot is dropped onto a different slot. Receives the slot the
  // drag started from and the slot it landed on.
  onSwap: (sourceSlot: number, targetSlot: number) => void | Promise<void>;
}

// Drag-to-reorder for the fixed photo-slot grid. The source slot lives in a
// ref rather than state because it is read inside the drop handler and must
// not trigger a re-render mid-drag; the two highlight values are state because
// the grid renders from them.
export const usePhotoSlotDragAndDrop = ({ onSwap }: Options) => {
  const dragSlotRef = useRef<number | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);
  const [isDraggingSlot, setIsDraggingSlot] = useState<number | null>(null);

  const reset = () => {
    setDragOverSlot(null);
    setIsDraggingSlot(null);
    dragSlotRef.current = null;
  };

  const handleDragStart = (slot: number) => {
    dragSlotRef.current = slot;
    setIsDraggingSlot(slot);
  };

  const handleDragOver = (e: React.DragEvent, slot: number) => {
    e.preventDefault();
    setDragOverSlot(slot);
  };

  const handleDrop = async (e: React.DragEvent, targetSlot: number) => {
    e.preventDefault();
    const sourceSlot = dragSlotRef.current;
    reset();
    if (sourceSlot === null || sourceSlot === targetSlot) return;
    await onSwap(sourceSlot, targetSlot);
  };

  // Clears only the hover highlight. The drag itself is still in progress, so
  // unlike handleDragEnd this must leave the source slot intact.
  const handleDragLeave = () => setDragOverSlot(null);

  return {
    dragOverSlot,
    isDraggingSlot,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragLeave,
    handleDragEnd: reset,
  };
};
