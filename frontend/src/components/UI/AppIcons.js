/**
 * Icônes de l'application — Lucide React
 * Remplace les emojis par des icônes vectorielles cohérentes et neutres.
 */
import {
  FolderOpen,
  FileText,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  BarChart3,
  TrendingUp,
  CreditCard,
  Cloud,
  Mail,
  MessageSquare,
  Link2,
  Plug,
  User,
  Receipt,
  Package,
  Wallet,
  FileSpreadsheet,
  ClipboardList,
  Eye,
  Pencil,
  Trash2,
  FilePlus,
  FolderPlus,
  Sun,
  Moon,
  Bell,
  LogOut,
  CalendarDays,
} from 'lucide-react';

const iconSize = 18;

export const KpiIcons = {
  folder: FolderOpen,
  file: FileText,
  users: Users,
  check: CheckCircle2,
  clock: Clock,
  warning: AlertTriangle,
  chart: BarChart3,
  trending: TrendingUp,
  card: CreditCard,
  cloud: Cloud,
  mail: Mail,
  calendar: CalendarDays,
  message: MessageSquare,
  link: Link2,
  plug: Plug,
  user: User,
  receipt: Receipt,
  package: Package,
  wallet: Wallet,
  spreadsheet: FileSpreadsheet,
  clipboard: ClipboardList,
};

export const ActionIcons = {
  eye: Eye,
  pencil: Pencil,
  trash: Trash2,
  filePlus: FilePlus,
  folderPlus: FolderPlus,
};

export const NavIcons = {
  sun: Sun,
  moon: Moon,
  bell: Bell,
  logOut: LogOut,
};

export const AppIcon = ({ name, size = iconSize, className = '', ...props }) => {
  const IconComponent = KpiIcons[name] || ActionIcons[name] || NavIcons[name];
  if (!IconComponent) return null;
  return <IconComponent size={size} className={className} {...props} />;
};

export default AppIcon;
