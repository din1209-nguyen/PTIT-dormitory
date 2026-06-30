declare module 'lucide-react' {
  import type { ForwardRefExoticComponent, RefAttributes, SVGProps } from 'react';

  export interface LucideProps extends SVGProps<SVGSVGElement> {
    size?: string | number;
    absoluteStrokeWidth?: boolean;
  }

  export type LucideIcon = ForwardRefExoticComponent<Omit<LucideProps, 'ref'> & RefAttributes<SVGSVGElement>>;

  export const AlertCircle: LucideIcon;
  export const AlertTriangle: LucideIcon;
  export const Archive: LucideIcon;
  export const ArrowLeft: LucideIcon;
  export const ArrowRightLeft: LucideIcon;
  export const Banknote: LucideIcon;
  export const BarChart3: LucideIcon;
  export const BedDouble: LucideIcon;
  export const Bell: LucideIcon;
  export const Building2: LucideIcon;
  export const CalendarDays: LucideIcon;
  export const CheckCircle2: LucideIcon;
  export const ChevronDown: LucideIcon;
  export const ChevronLeft: LucideIcon;
  export const ChevronRight: LucideIcon;
  export const ClipboardList: LucideIcon;
  export const Construction: LucideIcon;
  export const CreditCard: LucideIcon;
  export const DoorOpen: LucideIcon;
  export const Download: LucideIcon;
  export const Droplets: LucideIcon;
  export const Edit2: LucideIcon;
  export const ExternalLink: LucideIcon;
  export const Eye: LucideIcon;
  export const EyeOff: LucideIcon;
  export const FileSpreadsheet: LucideIcon;
  export const FileText: LucideIcon;
  export const Filter: LucideIcon;
  export const Globe: LucideIcon;
  export const GraduationCap: LucideIcon;
  export const History: LucideIcon;
  export const Info: LucideIcon;
  export const Key: LucideIcon;
  export const KeyRound: LucideIcon;
  export const Layers: LucideIcon;
  export const LayoutDashboard: LucideIcon;
  export const Loader2: LucideIcon;
  export const Lock: LucideIcon;
  export const LogOut: LucideIcon;
  export const MessageSquare: LucideIcon;
  export const MoreHorizontal: LucideIcon;
  export const Pencil: LucideIcon;
  export const Play: LucideIcon;
  export const Plus: LucideIcon;
  export const QrCode: LucideIcon;
  export const RotateCcw: LucideIcon;
  export const Search: LucideIcon;
  export const Send: LucideIcon;
  export const Settings: LucideIcon;
  export const Shield: LucideIcon;
  export const ShieldOff: LucideIcon;
  export const Shuffle: LucideIcon;
  export const Star: LucideIcon;
  export const Trash2: LucideIcon;
  export const Unlock: LucideIcon;
  export const Upload: LucideIcon;
  export const User: LucideIcon;
  export const UserCheck: LucideIcon;
  export const UserCircle: LucideIcon;
  export const UserMinus: LucideIcon;
  export const Users: LucideIcon;
  export const X: LucideIcon;
  export const XCircle: LucideIcon;
  export const Zap: LucideIcon;
}
