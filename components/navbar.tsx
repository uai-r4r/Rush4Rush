"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "./auth-provider";
import { hasAtLeast, type UserRole } from "@/lib/auth";

const links = [
  { label: "Home", href: "/" },
  { label: "Events", href: "/events" },
  { label: "Schedule", href: "/schedule" },
  { label: "Maps", href: "/map" },
  { label: "About", href: "/about" },
];

function roleLinks(role: UserRole | null) {
  if (!role) return [];
  const roleLinks = [];
  if (hasAtLeast(role, "attendee")) roleLinks.push({ label: "My Tickets", href: "/tickets" });
  if (hasAtLeast(role, "club_admin")) roleLinks.push({ label: "Dashboard", href: "/dashboard" });
  if (hasAtLeast(role, "volunteer")) roleLinks.push({ label: "Scan", href: "/scan" });
  return roleLinks;
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const pathname = usePathname();
  const { openAuth, user, logout, role } = useAuth();
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const allLinks = [...links, ...roleLinks(role)];
  return (
    <>
      <header className={`site-nav ${scrolled ? "site-nav-scrolled" : ""}`}>
        <Link className="brand-mark" href="/" aria-label="Rush4Rush home">
          <span className="brand-r">R</span>
          <span>4R</span>
        </Link>
        <nav className="desktop-nav" aria-label="Primary navigation">
          {allLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={pathname === link.href ? "active" : undefined}
              aria-current={pathname === link.href ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
          <AuthActions
            user={user}
            onAuth={openAuth}
            onMenu={() => setMenu(!menu)}
            onLogout={logout}
          />
        </nav>
        <button
          className="menu-toggle"
          type="button"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen(!open)}
        >
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          <span aria-hidden="true">{open ? "×" : "///"}</span>
        </button>
        <div id="mobile-menu" className={`mobile-menu ${open ? "mobile-menu-open" : ""}`}>
          {allLinks.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>
              {link.label}
            </Link>
          ))}
          <div className="mobile-auth">
            <AuthActions
              user={user}
              onAuth={openAuth}
              onMenu={() => setMenu(!menu)}
              onLogout={logout}
            />
          </div>
        </div>
      </header>
      {user && menu && (
        <div className="user-menu">
          <strong>{user.name}</strong>
          <span>{user.role}</span>
          <Link
            href={
              user.role === "attendee"
                ? "/tickets"
                : user.role === "volunteer"
                  ? "/scan"
                  : "/dashboard"
            }
          >
            Open workspace
          </Link>
          <button
            onClick={() => {
              logout();
              setMenu(false);
            }}
          >
            Log out
          </button>
        </div>
      )}
    </>
  );
}
function AuthActions({
  user,
  onAuth,
  onMenu,
  onLogout,
}: {
  user: { name: string } | null;
  onAuth: (mode: "register" | "login") => void;
  onMenu: () => void;
  onLogout: () => void;
}) {
  if (user)
    return (
      <div className="auth-user">
        <button className="avatar-button" onClick={onMenu} aria-label="Open account menu">
          {user.name.slice(0, 2).toUpperCase()}
        </button>
        <button className="auth-logout" onClick={onLogout}>
          LOG OUT
        </button>
      </div>
    );
  return (
    <div className="auth-actions">
      <button className="auth-login" onClick={() => onAuth("login")}>
        LOGIN
      </button>
      <button className="nav-register" onClick={() => onAuth("register")}>
        REGISTER
      </button>
    </div>
  );
}
export function Footer() {
  return (
    <footer className="site-footer">
      <div>
        <p className="footer-kicker">Powered by</p>
        <p className="footer-name">
          Universal AI University <span>//</span> R4R
        </p>
      </div>
      <div className="footer-links">
        <a href="#instagram">Instagram</a>
        <a href="#discord">Discord</a>
        <a href="#contact">Contact</a>
      </div>
      <p className="footer-meta">© 2026 Rush4Rush. Built for the next wave.</p>
    </footer>
  );
}
export { Footer as SiteFooter };
export default Navbar;
