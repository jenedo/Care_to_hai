import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Users,
  UserRound,
  Calendar,
  CreditCard,
  RefreshCw,
  Wallet,
  FileText,
  LifeBuoy,
  ShieldCheck,
  Settings,
  LogOut,
  Building2,
  Star,
  Bell,
  UserCog,
  ChevronDown,
  ChevronRight,
  Stethoscope,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  name: string;
  href?: string;
  icon: React.ElementType;
  children?: { name: string; href: string }[];
};

const NAV_ITEMS: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Doctor Management", href: "/doctors", icon: Stethoscope },
  { name: "Patient Management", href: "/patients", icon: Users },
  { name: "Clinic Management", href: "/clinics", icon: Building2 },
  { name: "Appointments", href: "/appointments", icon: Calendar },
  {
    name: "Finance",
    icon: CreditCard,
    children: [
      { name: "Payments", href: "/payments" },
      { name: "Refunds", href: "/refunds" },
      { name: "Doctor Payouts", href: "/payouts" },
    ],
  },
  { name: "Subscriptions", href: "/subscriptions", icon: UserRound },
  { name: "Support Tickets", href: "/support", icon: LifeBuoy },
  { name: "Review Moderation", href: "/reviews", icon: Star },
  { name: "Health Records", href: "/health-records", icon: FileText },
  { name: "Audit Logs", href: "/audit-logs", icon: ShieldCheck },
  { name: "Admin Users", href: "/admin-users", icon: UserCog },
  { name: "Settings", href: "/settings", icon: Settings },
];

function NavGroup({ item, location }: { item: NavItem; location: string }) {
  const isChildActive = item.children?.some(c => location === c.href || location.startsWith(c.href + "/"));
  const [open, setOpen] = React.useState(isChildActive ?? false);

  if (!item.children) {
    const isActive = location === item.href || location.startsWith(`${item.href}/`);
    return (
      <Link href={item.href!} className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
        isActive
          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
          : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      )}>
        <item.icon className="h-4 w-4 flex-shrink-0" />
        {item.name}
      </Link>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
          isChildActive
            ? "bg-sidebar-primary/20 text-sidebar-foreground"
            : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        <item.icon className="h-4 w-4 flex-shrink-0" />
        <span className="flex-1 text-left">{item.name}</span>
        {open ? <ChevronDown className="h-3.5 w-3.5 opacity-60" /> : <ChevronRight className="h-3.5 w-3.5 opacity-60" />}
      </button>
      {open && (
        <div className="mt-0.5 ml-3 pl-4 border-l border-sidebar-border/50 space-y-0.5">
          {item.children.map(child => {
            const isActive = location === child.href || location.startsWith(child.href + "/");
            return (
              <Link key={child.href} href={child.href} className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-sm"
                  : "text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}>
                {child.name}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const [location] = useLocation();
  const { user, signOut } = useAuth();

  return (
    <div className="flex h-screen w-64 flex-col bg-sidebar border-r border-sidebar-border text-sidebar-foreground flex-shrink-0">
      <div className="flex h-16 items-center px-6 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm shadow-sm">
            SG
          </div>
          <div className="font-semibold text-base leading-tight">
            SahatGhar
            <div className="text-[10px] font-normal text-sidebar-foreground/60">صحت آپ کے گھر</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <NavGroup key={item.name} item={item} location={location} />
        ))}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
            {(user?.fullName || user?.email || "A")[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="truncate text-sm font-medium">{user?.fullName || user?.email || "Admin User"}</div>
            <div className="text-xs text-sidebar-foreground/55">{user?.role?.replace(/_/g, " ") ?? "Admin"}</div>
          </div>
          <button
            onClick={signOut}
            className="p-2 text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors rounded-md hover:bg-sidebar-accent"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
