import React, { useEffect, useMemo, useRef, useState } from 'react';
import { mount, unmount } from 'svelte';
import Archive from '@jis3r/icons/icons/archive';
import ArrowDown from '@jis3r/icons/icons/arrow-down';
import ArrowUp from '@jis3r/icons/icons/arrow-up';
import Award from '@jis3r/icons/icons/award';
import Bell from '@jis3r/icons/icons/bell';
import BellOff from '@jis3r/icons/icons/bell-off';
import BookOpenText from '@jis3r/icons/icons/book-open-text';
import BriefcaseBusiness from '@jis3r/icons/icons/briefcase-business';
import CalendarDays from '@jis3r/icons/icons/calendar-days';
import CalendarSync from '@jis3r/icons/icons/calendar-sync';
import ChartBarDecreasing from '@jis3r/icons/icons/chart-bar-decreasing';
import ChartBarIncreasing from '@jis3r/icons/icons/chart-bar-increasing';
import ChartNoAxesCombined from '@jis3r/icons/icons/chart-no-axes-combined';
import ChartPie from '@jis3r/icons/icons/chart-pie';
import Check from '@jis3r/icons/icons/check';
import CheckCheck from '@jis3r/icons/icons/check-check';
import ChevronDown from '@jis3r/icons/icons/chevron-down';
import ChevronLeft from '@jis3r/icons/icons/chevron-left';
import ChevronRight from '@jis3r/icons/icons/chevron-right';
import CircleAlert from '@jis3r/icons/icons/circle-alert';
import CircleCheck from '@jis3r/icons/icons/circle-check';
import ClipboardCheck from '@jis3r/icons/icons/clipboard-check';
import ClipboardList from '@jis3r/icons/icons/clipboard-list';
import CloudMoon from '@jis3r/icons/icons/cloud-moon';
import CloudUpload from '@jis3r/icons/icons/cloud-upload';
import Download from '@jis3r/icons/icons/download';
import Eye from '@jis3r/icons/icons/eye';
import FileText from '@jis3r/icons/icons/file-text';
import FileUp from '@jis3r/icons/icons/file-up';
import Grid2x2Check from '@jis3r/icons/icons/grid-2x2-check';
import GripHorizontal from '@jis3r/icons/icons/grip-horizontal';
import GripVertical from '@jis3r/icons/icons/grip-vertical';
import HandCoins from '@jis3r/icons/icons/hand-coins';
import House from '@jis3r/icons/icons/house';
import Images from '@jis3r/icons/icons/images';
import Landmark from '@jis3r/icons/icons/landmark';
import LayoutDashboard from '@jis3r/icons/icons/layout-dashboard';
import LayoutGrid from '@jis3r/icons/icons/layout-grid';
import Lightbulb from '@jis3r/icons/icons/lightbulb';
import LoaderPinwheel from '@jis3r/icons/icons/loader-pinwheel';
import LogOut from '@jis3r/icons/icons/log-out';
import MessageCircle from '@jis3r/icons/icons/message-circle';
import Pencil from '@jis3r/icons/icons/pencil';
import Play from '@jis3r/icons/icons/play';
import Plus from '@jis3r/icons/icons/plus';
import PrinterCheck from '@jis3r/icons/icons/printer-check';
import Search from '@jis3r/icons/icons/search';
import SearchX from '@jis3r/icons/icons/search-x';
import Send from '@jis3r/icons/icons/send';
import Settings from '@jis3r/icons/icons/settings';
import ShieldCheck from '@jis3r/icons/icons/shield-check';
import SlidersHorizontal from '@jis3r/icons/icons/sliders-horizontal';
import Tag from '@jis3r/icons/icons/tag';
import ToggleLeft from '@jis3r/icons/icons/toggle-left';
import Trash2 from '@jis3r/icons/icons/trash-2';
import TriangleAlert from '@jis3r/icons/icons/triangle-alert';
import Upload from '@jis3r/icons/icons/upload';
import User from '@jis3r/icons/icons/user';
import UserCheck from '@jis3r/icons/icons/user-check';
import UserCog from '@jis3r/icons/icons/user-cog';
import Users from '@jis3r/icons/icons/users';
import X from '@jis3r/icons/icons/x';

const ICONS: Record<string, any> = {
  account_balance: Landmark,
  account_balance_wallet: Landmark,
  add: Plus,
  add_business: BriefcaseBusiness,
  add_card: HandCoins,
  admin_panel_settings: ShieldCheck,
  archive: Archive,
  arrow_downward: ArrowDown,
  arrow_upward: ArrowUp,
  calendar_add_on: CalendarDays,
  calendar_month: CalendarDays,
  calendar_view_week: CalendarDays,
  category: Tag,
  chat: MessageCircle,
  check: Check,
  check_circle: CircleCheck,
  chevron_left: ChevronLeft,
  chevron_right: ChevronRight,
  close: X,
  cloud_upload: CloudUpload,
  credit_card: HandCoins,
  dark_mode: CloudMoon,
  data_usage: ChartPie,
  date_range: CalendarDays,
  delete: Trash2,
  domain_add: BriefcaseBusiness,
  done_all: CheckCheck,
  edit: Pencil,
  error: CircleAlert,
  event: CalendarDays,
  event_repeat: CalendarSync,
  expand_more: ChevronDown,
  fact_check: ClipboardCheck,
  file_download: Download,
  file_upload: Upload,
  format_list_bulleted: ClipboardList,
  forum: MessageCircle,
  grid_view: LayoutGrid,
  group: Users,
  groups: Users,
  how_to_reg: UserCheck,
  image: Images,
  insights: Lightbulb,
  logout: LogOut,
  manage_accounts: UserCog,
  more_horiz: GripHorizontal,
  more_vert: GripVertical,
  notifications: Bell,
  notifications_active: Bell,
  notifications_none: Bell,
  notifications_off: BellOff,
  pause_circle: ToggleLeft,
  payments: HandCoins,
  pending_actions: ClipboardList,
  person: User,
  person_add: UserCheck,
  person_search: Search,
  picture_as_pdf: FileText,
  play_circle: Play,
  print: PrinterCheck,
  progress_activity: LoaderPinwheel,
  qr_code_2: Grid2x2Check,
  query_stats: ChartNoAxesCombined,
  receipt_long: FileText,
  school: BookOpenText,
  search: Search,
  search_off: SearchX,
  send: Send,
  settings: Settings,
  sort: SlidersHorizontal,
  storefront: House,
  trending_down: ChartBarDecreasing,
  trending_up: ChartBarIncreasing,
  upload: FileUp,
  visibility: Eye,
  warning: TriangleAlert,
  workspace_premium: Award,
  dashboard: LayoutDashboard
};

interface JisIconProps {
  children?: React.ReactNode;
  className?: string;
  name?: string;
  strokeWidth?: number;
  'aria-hidden'?: boolean | 'true' | 'false';
}

export function JisIcon({ children, name, className = '', strokeWidth = 2, ...props }: JisIconProps) {
  const hostRef = useRef<HTMLSpanElement>(null);
  const animationTimerRef = useRef<number | undefined>(undefined);
  const [animate, setAnimate] = useState(false);
  const iconName = useMemo(() => (name || String(children ?? '')).trim(), [children, name]);
  const IconComponent = ICONS[iconName] || CircleAlert;

  useEffect(() => {
    const host = hostRef.current;
    const action = host?.closest<HTMLElement>('button, [role="button"]');
    if (!action) return;

    const animateOnClick = () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      window.clearTimeout(animationTimerRef.current);
      setAnimate(false);
      window.requestAnimationFrame(() => setAnimate(true));
      animationTimerRef.current = window.setTimeout(() => setAnimate(false), 1200);
    };

    action.addEventListener('click', animateOnClick);
    return () => {
      action.removeEventListener('click', animateOnClick);
      window.clearTimeout(animationTimerRef.current);
    };
  }, [iconName]);

  useEffect(() => {
    if (!hostRef.current) return;
    const instance = mount(IconComponent, {
      target: hostRef.current,
      props: { size: 24, color: 'currentColor', strokeWidth, animate, class: 'jis3r-icon__inner' }
    });
    return () => { void unmount(instance); };
  }, [IconComponent, strokeWidth, animate]);

  return (
    <span
      ref={hostRef}
      className={`jis3r-icon ${className}`}
      aria-hidden={props['aria-hidden'] ?? true}
    />
  );
}
