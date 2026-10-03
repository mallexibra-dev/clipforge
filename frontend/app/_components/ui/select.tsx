"use client";

import { Check, ChevronDown } from "lucide-react";
import * as SelectPrimitive from "@radix-ui/react-select";
import type { ComponentPropsWithoutRef } from "react";

export const Select = SelectPrimitive.Root;

export function SelectTrigger({
  children,
  ...props
}: ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger className="selectTrigger" {...props}>
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown size={16} className="selectTrigger-chevron" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

export function SelectValue(props: ComponentPropsWithoutRef<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value {...props} />;
}

export function SelectContent({
  children,
  ...props
}: ComponentPropsWithoutRef<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        className="selectContent"
        position="popper"
        sideOffset={6}
        {...props}
      >
        <SelectPrimitive.Viewport className="selectViewport">{children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

export function SelectItem({
  children,
  ...props
}: ComponentPropsWithoutRef<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item className="selectItem" {...props}>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="selectItem-indicator">
        <Check size={14} />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}
