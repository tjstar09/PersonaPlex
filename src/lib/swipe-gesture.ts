"use client";

import { useEffect, useRef, useState } from "react";

interface SwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
  preventDefault?: boolean;
}

type Direction = "left" | "right" | "up" | "down" | null;

interface SwipeState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  isSwiping: boolean;
  direction: Direction;
}

const IDLE_SWIPE_STATE: SwipeState = {
  startX: 0,
  startY: 0,
  currentX: 0,
  currentY: 0,
  isSwiping: false,
  direction: null,
};

export function useSwipeGesture(
  elementRef: React.RefObject<HTMLElement | null>,
  options: SwipeOptions = {}
) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 50,
    preventDefault = false,
  } = options;

  const [swipeState, setSwipeState] = useState<SwipeState>(IDLE_SWIPE_STATE);
  const stateRef = useRef<SwipeState>(IDLE_SWIPE_STATE);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    function handleTouchStart(e: TouchEvent) {
      const touch = e.touches[0];
      stateRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        currentX: touch.clientX,
        currentY: touch.clientY,
        isSwiping: true,
        direction: null,
      };
      setSwipeState(stateRef.current);
    }

    function handleTouchMove(e: TouchEvent) {
      if (!stateRef.current.isSwiping) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - stateRef.current.startX;
      const deltaY = touch.clientY - stateRef.current.startY;

      let direction: Direction = null;
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        direction = deltaX > 0 ? "right" : "left";
      } else {
        direction = deltaY > 0 ? "down" : "up";
      }

      stateRef.current = {
        ...stateRef.current,
        currentX: touch.clientX,
        currentY: touch.clientY,
        direction,
      };
      setSwipeState(stateRef.current);

      if (preventDefault && (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10)) {
        e.preventDefault();
      }
    }

    function handleTouchEnd() {
      if (!stateRef.current.isSwiping) return;
      const deltaX = stateRef.current.currentX - stateRef.current.startX;
      const deltaY = stateRef.current.currentY - stateRef.current.startY;

      if (Math.abs(deltaX) > threshold && Math.abs(deltaX) > Math.abs(deltaY)) {
        if (stateRef.current.direction === "left") onSwipeLeft?.();
        else if (stateRef.current.direction === "right") onSwipeRight?.();
      } else if (Math.abs(deltaY) > threshold && Math.abs(deltaY) > Math.abs(deltaX)) {
        if (stateRef.current.direction === "up") onSwipeUp?.();
        else if (stateRef.current.direction === "down") onSwipeDown?.();
      }

      stateRef.current = IDLE_SWIPE_STATE;
      setSwipeState(IDLE_SWIPE_STATE);
    }

    element.addEventListener("touchstart", handleTouchStart, { passive: !preventDefault });
    element.addEventListener("touchmove", handleTouchMove, { passive: !preventDefault });
    element.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener("touchstart", handleTouchStart);
      element.removeEventListener("touchmove", handleTouchMove);
      element.removeEventListener("touchend", handleTouchEnd);
    };
  }, [elementRef, preventDefault, threshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]);

  return swipeState;
}

/** Hook for horizontal swipe actions (left/right) */
export function useHorizontalSwipe(
  elementRef: React.RefObject<HTMLElement | null>,
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  threshold = 50
) {
  return useSwipeGesture(elementRef, { onSwipeLeft, onSwipeRight, threshold, preventDefault: true });
}

/** Hook for pull-to-refresh */
export function usePullToRefresh(
  elementRef: React.RefObject<HTMLElement | null>,
  onRefresh: () => Promise<void> | void,
  threshold = 80
) {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const startY = useRef(0);
  const isActive = useRef(false);
  const distance = useRef(0);
  const refreshing = useRef(false);
  const refreshRef = useRef(onRefresh);
  
  useEffect(() => {
    refreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    function handleTouchStart(e: TouchEvent) {
      if (refreshing.current) return;
      if ((element?.scrollTop ?? 0) > 0) return;
      isActive.current = true;
      distance.current = 0;
      startY.current = e.touches[0].clientY;
    }

    function handleTouchMove(e: TouchEvent) {
      if (!isActive.current || refreshing.current) return;
      const deltaY = e.touches[0].clientY - startY.current;
      if (deltaY <= 0) {
        if (distance.current !== 0) {
          distance.current = 0;
          setPullDistance(0);
          setIsPulling(false);
        }
        return;
      }
      e.preventDefault();
      distance.current = Math.min(deltaY * 0.5, threshold * 1.5);
      setPullDistance(distance.current);
      setIsPulling(distance.current > 10);
    }

    function handleTouchEnd() {
      if (!isActive.current || refreshing.current) return;
      isActive.current = false;

      const shouldRefresh = distance.current >= threshold;
      distance.current = 0;
      setPullDistance(0);
      setIsPulling(false);

      if (shouldRefresh) {
        refreshing.current = true;
        setIsRefreshing(true);
        Promise.resolve(refreshRef.current()).finally(() => {
          refreshing.current = false;
          setIsRefreshing(false);
        });
      }
    }

    element.addEventListener("touchstart", handleTouchStart, { passive: true });
    element.addEventListener("touchmove", handleTouchMove, { passive: false });
    element.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener("touchstart", handleTouchStart);
      element.removeEventListener("touchmove", handleTouchMove);
      element.removeEventListener("touchend", handleTouchEnd);
    };
  }, [elementRef, threshold]);

  return { isPulling, pullDistance, isRefreshing };
}
