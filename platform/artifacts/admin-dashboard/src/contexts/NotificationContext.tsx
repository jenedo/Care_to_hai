import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";

export type NotificationType = "doctor_application" | "support_ticket" | "payment_failed" | "appointment" | "system";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  link?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  dismissAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const INITIAL_NOTIFICATIONS: Notification[] = [
  { id: "n1", type: "doctor_application", title: "New Doctor Application", message: "Dr. Aisha Siddiqui (Cardiology) submitted verification documents", timestamp: new Date(Date.now() - 4 * 60 * 1000), read: false, link: "/doctors" },
  { id: "n2", type: "support_ticket", title: "Urgent Support Ticket", message: "Patient complaint #TK-0041 marked SLA breached — awaiting resolution", timestamp: new Date(Date.now() - 11 * 60 * 1000), read: false, link: "/support" },
  { id: "n3", type: "payment_failed", title: "Payment Gateway Alert", message: "3 transactions failed at JazzCash gateway in the last hour", timestamp: new Date(Date.now() - 28 * 60 * 1000), read: false, link: "/payments" },
  { id: "n4", type: "appointment", title: "Appointment Spike", message: "Appointments up 34% today — 1,256 consultations booked", timestamp: new Date(Date.now() - 45 * 60 * 1000), read: true, link: "/appointments" },
  { id: "n5", type: "system", title: "System Notice", message: "Scheduled maintenance window: June 2, 2026 02:00–04:00 PKT", timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), read: true },
];

const SIMULATED_EVENTS: Array<Omit<Notification, "id" | "timestamp" | "read">> = [
  { type: "doctor_application", title: "New Doctor Application", message: "Dr. Omar Farooq (Neurology, Lahore) submitted for verification", link: "/doctors" },
  { type: "payment_failed", title: "Refund Request", message: "Patient Ali Hassan requested refund for appointment #APT-0187", link: "/payments" },
  { type: "support_ticket", title: "New Support Ticket", message: "Ticket #TK-0052 opened: 'Doctor not available at scheduled time'", link: "/support" },
  { type: "appointment", title: "Appointment Cancelled", message: "5 appointments cancelled in Karachi — possible connection issue", link: "/appointments" },
  { type: "doctor_application", title: "PMDC Verification Due", message: "Dr. Fatima Malik (Gynecology) — PMDC license expires in 7 days", link: "/doctors" },
];

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS);
  const simulationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const eventIndex = useRef(0);

  const addNotification = useCallback((notif: Omit<Notification, "id" | "timestamp" | "read">) => {
    const newNotif: Notification = { ...notif, id: `n${Date.now()}`, timestamp: new Date(), read: false };
    setNotifications(prev => [newNotif, ...prev].slice(0, 50));
  }, []);

  useEffect(() => {
    simulationRef.current = setInterval(() => {
      const event = SIMULATED_EVENTS[eventIndex.current % SIMULATED_EVENTS.length];
      eventIndex.current += 1;
      addNotification(event);
    }, 45000);
    return () => { if (simulationRef.current) clearInterval(simulationRef.current); };
  }, [addNotification]);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const dismissAll = useCallback(() => { setNotifications([]); }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, dismissAll }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be inside NotificationProvider");
  return ctx;
}
