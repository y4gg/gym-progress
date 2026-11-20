export function isOverviewPathname(pathname: string) {
  return pathname === "/overview" || pathname === "/overview/";
}

export function isSettingsPathname(pathname: string) {
  return /^\/settings(?:\/(?:training|appearance|sync))?\/?$/.test(pathname);
}

export function isLocalAppPathname(pathname: string) {
  return (
    pathname === "/" ||
    pathname === "/offline" ||
    isOverviewPathname(pathname) ||
    /^\/w\/[^/]+(?:\/create)?\/?$/.test(pathname) ||
    /^\/e\/[^/]+(?:\/(?:history|logs))?\/?$/.test(pathname) ||
    isSettingsPathname(pathname)
  );
}
