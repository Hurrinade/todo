import {
  KeyboardSensor,
  PointerActivationConstraints,
  PointerSensor,
} from "@dnd-kit/dom";

/**
 * Sensors for todo and section drag handles. Handles are `touch-none`, so a
 * touch drag starts after a tiny move instead of the default 250ms long press,
 * and the browser never claims the gesture as a scroll mid-activation.
 */
export const todoDragSensors = [
  PointerSensor.configure({
    activationConstraints: (event) =>
      event.pointerType === "touch"
        ? [new PointerActivationConstraints.Distance({ value: 3 })]
        : undefined,
  }),
  KeyboardSensor,
];
