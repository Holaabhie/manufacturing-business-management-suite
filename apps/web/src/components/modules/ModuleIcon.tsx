import React from "react";
import {
  ClipboardList,
  FileText,
  Truck,
  Factory,
  Cpu,
  Package,
  ShoppingCart,
  Receipt,
  Wallet,
  ReceiptText,
  Landmark,
  Users,
  BarChart3,
  FileBarChart,
  Sparkles,
  Bell,
  BookOpen,
  UserCheck,
  ArrowLeftRight,
  Settings,
  LayoutDashboard,
  LucideProps,
  Boxes,
} from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<LucideProps>> = {
  ClipboardList,
  FileText,
  Truck,
  Factory,
  Cpu,
  Package,
  ShoppingCart,
  Receipt,
  Wallet,
  ReceiptText,
  Landmark,
  Users,
  BarChart3,
  FileBarChart,
  Sparkles,
  Bell,
  BookOpen,
  UserCheck,
  ArrowLeftRight,
  Settings,
  LayoutDashboard,
};

interface ModuleIconProps extends LucideProps {
  name: string;
}

export function ModuleIcon({ name, ...props }: ModuleIconProps) {
  const IconComponent = ICON_MAP[name] || Boxes;
  return <IconComponent {...props} />;
}
